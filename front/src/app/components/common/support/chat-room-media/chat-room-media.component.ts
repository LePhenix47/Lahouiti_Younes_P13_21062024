import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { ChatWebRtcService } from '@core/services/video-chat/chat-webrtc.service';
import {
  DeviceInfo,
  Room,
} from '@core/types/videoconference/videoconference.types';
import { createDeviceList } from '@core/utils/videoconference/videoconference.utils';

@Component({
  selector: 'app-chat-room-media',
  standalone: true,
  imports: [],
  templateUrl: './chat-room-media.component.html',
  styleUrl: './chat-room-media.component.scss',
})
export class ChatRoomMediaComponent {
  // * Refs for the video elements
  @ViewChild('ownWebCamVideoRef')
  ownWebCamVideoRef: ElementRef<HTMLVideoElement> | null = null;

  @ViewChild('remoteWebCamVideoRef')
  remoteWebCamVideoRef: ElementRef<HTMLVideoElement> | null = null;

  // * Refs for the controls
  @ViewChild('webcamCheckboxRef')
  webcamCheckboxRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('audioCheckboxRef')
  audioCheckboxRef: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('screenCastCheckboxRef')
  screenCastCheckboxRef: ElementRef<HTMLInputElement> | null = null;
  /**
   * The Stomp client for the WebSocket connection.
   */
  public readonly socketIO = input.required<any | null>();

  /**
   * An array of user names in the chat.
   */
  public readonly usersList = input.required<string[]>();

  /**
   * The username of the current user.
   */
  public readonly ownUsername = input.required<string>();

  private readonly chatWebRtcService = inject(ChatWebRtcService);

  public showWebcam = signal<boolean>(false);
  public openMicrophone = signal<boolean>(false);
  public showScreenCast = signal<boolean>(false);

  public hasWebcamPermissionDenied = signal<boolean>(false);
  public hasMicrophonePermissionDenied = signal<boolean>(false);
  public hasCanceledScreenCast = signal<boolean>(false);

  public localPeerHasSharedLocalMedia = computed(() => {
    const hasSharedLocalFeed: boolean =
      this.showWebcam() || this.openMicrophone();
    const hasSharedScreenFeed: boolean = this.showScreenCast();

    const localPeerHasSharedLocalMedia: boolean =
      hasSharedLocalFeed || hasSharedScreenFeed;

    if (this.chatWebRtcService.currentRoom && !this.webRtcSessionStarted) {
      this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare(
        localPeerHasSharedLocalMedia
      );
    }

    return localPeerHasSharedLocalMedia;
  });

  public enumeratedDevicesList = signal<MediaDeviceInfo[]>([]);

  // Filter for video input devices
  public videoInputsList = computed(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'videoinput');
  });

  public audioInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audioinput');
  });

  // Filter for audio output devices
  public audioOutputsList = computed(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audiooutput');
  });

  public roomsList = signal<Room[]>([]);
  public currentRoom = signal<string | null>(null);

  public signalEffect = effect(() => {
    console.log('effect', this.localPeerHasSharedLocalMedia());
  });

  public isReceiver: boolean = false;
  public otherPeerUserName: string | null = null;
  public remotePeerHasSharedLocalMedia: boolean = false;
  public webRtcSessionStarted: boolean = false;

  public roomErrorMessage: string | null = null;

  async ngOnInit() {
    console.group('ngOnInit()');
    this.getInitialDevicePermissions();

    this.listenToDeviceChanges();
    await this.populateEnumeratedDevices();

    console.log(
      'this.videoInputsList()',
      this.videoInputsList(),
      'this.audioInputsList()',
      this.audioInputsList(),
      'this.audioOutputsList()',
      this.audioOutputsList()
    );

    this.chatWebRtcService.setSocketIO(this.socketIO()!);
    this.chatWebRtcService.addRoomSocketEventListeners();

    this.chatWebRtcService.setOnRoomListUpdateCallback(this.updateRoomsList);
    this.chatWebRtcService.setOnRoomCreatedCallback(this.roomCreatedCallback);
    this.chatWebRtcService.setOnRoomErrorCallback(this.showRoomError);
    this.chatWebRtcService.setOnRoomJoinedCallback(this.roomJoinedCallback);
    this.chatWebRtcService.setOnRoomDeletedCallback(this.roomDeletedCallback);
    this.chatWebRtcService.setOnReceiveEnabledLocalMediaCallback(
      this.remotePeerHasSharedLocalMediaCallback
    );

    this.chatWebRtcService.setOnTrackAddedCallback(
      this.setWebRtcSessionStarted
    );

    this.chatWebRtcService.setOnScreenShareEndedCallback(this.onScreenShareEnd);

    this.roomsList.update(() => {
      return [...this.chatWebRtcService.getRoomList()];
    });

    this.socketIO()!.on(
      'wrtc-test',
      (data: { roomName: string; message: string }) => {
        console.log('wrtc-test', { data });
      }
    );
    console.groupEnd();
  }

  ngAfterViewInit(): void {
    console.group('ngAfterViewInit()');
    this.setWebRtcVideoElements();
    console.groupEnd();
  }

  ngOnDestroy() {
    this.webRtcSessionStarted = false;
    this.chatWebRtcService.endWebRTCSession();
  }

  private setWebRtcSessionStarted = () => {
    this.webRtcSessionStarted = true;
  };

  private showRoomError = (errorMessage: string) => {
    this.roomErrorMessage = errorMessage;
  };

  private listenToDeviceChanges = () => {
    navigator.mediaDevices.addEventListener(
      'devicechange',
      this.populateEnumeratedDevices
    );
  };

  private populateEnumeratedDevices = async () => {
    const devices: MediaDeviceInfo[] =
      await navigator.mediaDevices.enumerateDevices();

    this.enumeratedDevicesList.update(() => {
      return devices;
    });
  };

  private resetState = () => {};

  private getInitialDevicePermissions = async () => {
    const cameraPermissionResult: PermissionStatus =
      await navigator.permissions.query({
        // @ts-ignore TS is drunk
        name: 'camera',
      });

    const microphonePermissionResult: PermissionStatus =
      await navigator.permissions.query({
        // @ts-ignore TS is drunk
        name: 'microphone',
      });

    this.hasWebcamPermissionDenied.update(() => {
      return cameraPermissionResult.state === 'denied';
    });

    this.hasMicrophonePermissionDenied.update(() => {
      return microphonePermissionResult.state === 'denied';
    });
  };

  private remotePeerHasSharedLocalMediaCallback = (
    remotePeerHasSharedLocalMedia: boolean
  ) => {
    this.remotePeerHasSharedLocalMedia = remotePeerHasSharedLocalMedia;
  };

  private setWebRtcVideoElements = () => {
    // * Local webcam, audio and screen cast
    this.chatWebRtcService.setLocalVideoElement(
      this.ownWebCamVideoRef!.nativeElement
    );

    // * Remote webcam, audio and screen cast
    this.chatWebRtcService.setRemoteVideoElement(
      this.remoteWebCamVideoRef!.nativeElement
    );
  };

  private roomCreatedCallback = (roomName: string) => {
    this.currentRoom.update(() => {
      return roomName;
    });

    this.isReceiver = false;
  };

  private roomJoinedCallback = (
    roomName: string,
    otherPeerUserName: string
  ) => {
    this.currentRoom.update(() => {
      return roomName;
    });

    this.isReceiver = otherPeerUserName === this.ownUsername();

    this.otherPeerUserName = otherPeerUserName;

    this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare(
      this.localPeerHasSharedLocalMedia()
    );
  };

  private roomDeletedCallback = () => {
    this.currentRoom.update(() => {
      return null;
    });

    this.isReceiver = false;

    this.remotePeerHasSharedLocalMedia = false;
    this.webRtcSessionStarted = false;

    this.otherPeerUserName = null;
  };

  private updateRoomsList = (rooms: Room[]) => {
    this.roomsList.update(() => {
      return rooms;
    });
  };

  public createRoom = () => {
    if (this.currentRoom()) {
      console.warn(
        `User already ${
          this.currentRoom() === this.ownUsername() ? 'created' : 'joined'
        } a room`
      );

      return;
    }

    this.chatWebRtcService.createRoom(this.ownUsername());

    this.chatWebRtcService.initializePeerConnection();

    // ? See roomCreatedCallback for the rest (async callback)
  };

  public deleteRoom = () => {
    this.chatWebRtcService.deleteRoom(this.ownUsername());
  };

  public connectToRoom = (roomName: string) => {
    this.chatWebRtcService.initializePeerConnection();
    this.chatWebRtcService.joinRoom(roomName);

    this.setWebRtcVideoElements();

    // ? See roomJoinedCallback for the rest (async callback)
  };

  public disconnectFromRoom = () => {
    if (this.webRtcSessionStarted) {
      this.chatWebRtcService.endWebRTCSession();
    }

    this.chatWebRtcService.leaveRoom();

    this.currentRoom.update(() => {
      return null;
    });

    this.remotePeerHasSharedLocalMedia = false;
    this.webRtcSessionStarted = false;

    this.otherPeerUserName = null;
    this.isReceiver = false;
  };

  public sendTestMessage = () => {
    this.socketIO()!.emit('wrtc-test', {
      roomName: this.currentRoom(),
      message: 'test',
    });
  };

  public initializeConnection = async () => {
    this.chatWebRtcService.initializePeerConnection();

    await this.chatWebRtcService.createOffer();

    this.webRtcSessionStarted = true;
  };

  public switchWebcamDevice = async (event: Event) => {
    console.log('switchWebcamDevice', event);

    try {
      const selectElement = event.target as HTMLSelectElement;
      const videoInputDeviceId: string = selectElement.value;

      const localStream =
        await this.chatWebRtcService.switchLocalStreamByDeviceId(
          videoInputDeviceId,
          null
        );

      console.log({ videoInputDeviceId, localStream });

      const localVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      this.setVideoElementStream(localVideoElement, localStream);
    } catch (error) {
      console.error(error);
    }
  };

  public switchMicrophoneDevice = async (event: Event) => {
    console.log('switchMicrophoneDevice', event);

    try {
      const selectElement = event.target as HTMLSelectElement;
      const audioInputDeviceId: string = selectElement.value;

      const localStream =
        await this.chatWebRtcService.switchLocalStreamByDeviceId(
          null,
          audioInputDeviceId
        );

      console.log({ audioInputDeviceId, localStream });

      const localVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      this.setVideoElementStream(localVideoElement, localStream);
    } catch (error) {
      console.error(error);
    }
  };

  public switchSpeakerDevice = async (event: Event) => {
    const selectElement = event.target as HTMLSelectElement;
    const audioOutputDeviceId: string = selectElement.value;

    const remoteVideoElement: HTMLVideoElement =
      this.remoteWebCamVideoRef!.nativeElement;

    // @ts-ignore Angular compiler complains about not finding this method even though it exists
    await remoteVideoElement.setSinkId(audioOutputDeviceId);
  };

  private updateLocalStream = async () => {
    try {
      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      this.chatWebRtcService.resetLocalStream();

      if (!this.showWebcam() && !this.openMicrophone()) {
        this.setVideoElementStream(webcamVideoElement, null);
        return;
      }

      await this.chatWebRtcService.setLocalStream(
        this.openMicrophone(),
        this.showWebcam()
      );

      this.setVideoElementStream(
        webcamVideoElement,
        this.chatWebRtcService.localStream
      );

      this.hasWebcamPermissionDenied.update(() => false);
      this.hasMicrophonePermissionDenied.update(() => false);
    } catch (error) {
      const webcamCheckbox: HTMLInputElement =
        this.webcamCheckboxRef!.nativeElement;
      const audioCheckbox: HTMLInputElement =
        this.audioCheckboxRef!.nativeElement;

      if (!(error instanceof Error)) {
        return;
      }

      // Check for permission-related errors
      const isNotPermissionRelated: boolean =
        !error.message.includes('NotAllowedError') &&
        error.name !== 'NotAllowedError';

      if (isNotPermissionRelated) {
        console.error(`An unexpected error occurred: ${error.message}`);

        return;
      }

      // Check if it was due to the webcam
      if (this.showWebcam()) {
        webcamCheckbox.checked = false;
        this.showWebcam.update(() => false);
        this.hasWebcamPermissionDenied.update(() => true);
      }

      // Check if it was due to the microphone
      if (this.openMicrophone()) {
        audioCheckbox.checked = false;
        this.openMicrophone.update(() => false);
        this.hasMicrophonePermissionDenied.update(() => true);
      }
    }
  };

  private updateScreenCastStream = async () => {
    // TODO: Handle the case when a WebRTC session has already started
    try {
      this.hasCanceledScreenCast.update(() => false);

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        webcamVideoElement.srcObject = null;
        return;
      }

      const screenStream: MediaStream | null =
        await this.chatWebRtcService.startScreenShare();

      this.setVideoElementStream(webcamVideoElement, screenStream!);
    } catch (error) {
      console.error('Error accessing screen stream.', error);

      const screenCastCheckbox: HTMLInputElement =
        this.screenCastCheckboxRef!.nativeElement;

      screenCastCheckbox.checked = false;
      this.showScreenCast.update(() => false);
      this.hasCanceledScreenCast.update(() => true);
    }
  };

  private onScreenShareEnd = (event: Event): void => {
    const screenCastCheckbox: HTMLInputElement =
      this.screenCastCheckboxRef!.nativeElement;

    screenCastCheckbox.checked = false;
    this.showScreenCast.update(() => false);

    const videoElement: HTMLVideoElement =
      this.ownWebCamVideoRef!.nativeElement;

    this.setVideoElementStream(
      videoElement,
      this.chatWebRtcService.localStream!
    );
  };

  private setVideoElementStream = (
    videoElement: HTMLVideoElement,
    stream: MediaStream | null
  ) => {
    videoElement.srcObject = stream;
  };

  /**
   * Toggles the webcam state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleWebcam = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.showWebcam.update(() => input.checked);

    if (this.webRtcSessionStarted) {
      this.chatWebRtcService.toggleLocalStream(
        this.showWebcam(),
        this.openMicrophone()
      );
      return;
    }

    this.updateLocalStream();
  };

  /**
   * Toggles the audio input based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleAudio = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.openMicrophone.update(() => input.checked);

    if (this.webRtcSessionStarted) {
      this.chatWebRtcService.toggleLocalStream(
        this.showWebcam(),
        this.openMicrophone()
      );
      return;
    }

    this.updateLocalStream();
  };

  /**
   * Toggles the screen cast state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleScreenCast = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.showScreenCast.update(() => input.checked);

    this.updateScreenCastStream();
  };
}
