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
import { VolumeMeterService } from '@core/services/volume-meter/volume-meter.service';
import {
  DeviceInfo,
  Room,
} from '@core/types/videoconference/videoconference.types';
import { createDeviceList } from '@core/utils/videoconference/videoconference.utils';
import { Socket } from 'socket.io-client';

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

  @ViewChild('ownAudioVolumeIndicator')
  ownAudioVolumeIndicator: ElementRef<HTMLProgressElement> | null = null;

  @ViewChild('remotePeerAudioVolumeIndicator')
  remotePeerAudioVolumeIndicator: ElementRef<HTMLProgressElement> | null = null;

  /**
   * The Stomp client for the WebSocket connection.
   */
  public readonly socketIO = input.required<Socket | null>();

  /**
   * An array of user names in the chat.
   */
  public readonly usersList = input.required<string[]>();

  /**
   * The username of the current user.
   */
  public readonly ownUsername = input.required<string>();

  private readonly chatWebRtcService = inject(ChatWebRtcService);

  private ownVolumeAnalyzerService: VolumeMeterService | null = null;
  private remoteVolumeAnalyzerService: VolumeMeterService | null = null;

  public readonly showWebcam = signal<boolean>(false);
  public readonly openMicrophone = signal<boolean>(false);
  public readonly showScreenCast = signal<boolean>(false);

  public readonly hasAuthorizedWebcamForWebRTC = computed<boolean>(() => {
    return (
      !this.hasWebcamPermissionDenied() &&
      this.showWebcam() &&
      this.webRtcSessionStarted
    );
  });

  public readonly hasAuthorizedMicrophoneForWebRTC = computed<boolean>(() => {
    return (
      !this.hasMicrophonePermissionDenied() &&
      this.openMicrophone() &&
      this.webRtcSessionStarted
    );
  });

  public readonly wantsToTogglePiPOnTabSwitch = signal<boolean>(false);

  public readonly hasPiPModeAvailable = signal<boolean>(false);
  public readonly hasWebcamPermissionDenied = signal<boolean>(false);
  public readonly hasMicrophonePermissionDenied = signal<boolean>(false);
  public readonly hasCanceledScreenCast = signal<boolean>(false);

  public readonly localPeerHasSharedLocalMedia = computed<boolean>(() => {
    const hasSharedLocalFeed: boolean =
      this.showWebcam() || this.openMicrophone();

    if (this.currentRoom() && !this.webRtcSessionStarted) {
      this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare(
        hasSharedLocalFeed
      );
    }

    return hasSharedLocalFeed;
  });

  public readonly enumeratedDevicesList = signal<MediaDeviceInfo[]>([]);

  // Filter for video input devices
  public readonly videoInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'videoinput');
  });

  public readonly audioInputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audioinput');
  });

  // Filter for audio output devices
  public readonly audioOutputsList = computed<DeviceInfo[]>(() => {
    return createDeviceList(this.enumeratedDevicesList(), 'audiooutput');
  });

  public readonly selectedVideoInputDeviceId = signal<string | null>(null);
  public readonly selectedAudioInputDeviceId = signal<string | null>(null);

  public readonly roomsList = signal<Room[]>([]);
  public readonly currentRoom = signal<string | null>(null);

  public signalEffect = effect(() => {
    console.log('effect', this.localPeerHasSharedLocalMedia());
  });

  public isReceiver: boolean = false;
  public otherPeerUserName: string | null = null;
  public isRemotePeerMediaActive: boolean = false;
  public webRtcSessionStarted: boolean = false;

  public roomErrorMessage: string | null = null;

  async ngOnInit() {
    console.group('ngOnInit()');
    this.getInitialDevicePermissions();

    this.ownVolumeAnalyzerService = new VolumeMeterService();
    this.remoteVolumeAnalyzerService = new VolumeMeterService();

    this.listenToDeviceChanges();
    await this.populateEnumeratedDevices();

    this.chatWebRtcService.setSocketIO(this.socketIO()!);
    this.chatWebRtcService.addRoomSocketEventListeners();

    this.setWebRtcServiceClassCallbacks();

    this.hasPiPModeAvailable.update(() => document.pictureInPictureEnabled);
    if (this.hasPiPModeAvailable()) {
      document.addEventListener('visibilitychange', this.togglePiPVideoElement);
    }

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
    this.setVolumeMeterServiceElements();
    console.groupEnd();
  }

  ngOnDestroy() {
    this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    this.remoteVolumeAnalyzerService!.stopVolumeMeasurement();

    this.disconnectFromWebRtcSession();

    if (this.hasPiPModeAvailable()) {
      document.removeEventListener(
        'visibilitychange',
        this.togglePiPVideoElement
      );
    }

    this.chatWebRtcService.removeWebRtcSocketEventListeners();

    if (this.isReceiver) {
      this.disconnectFromRoom();
    } else {
      this.deleteRoom();
    }
  }

  private setVolumeMeterServiceElements = () => {
    const ownProgressElement: HTMLProgressElement =
      this.ownAudioVolumeIndicator!.nativeElement;

    console.log('ownProgressElement', ownProgressElement);

    this.ownVolumeAnalyzerService!.setVolumeMeterElement(ownProgressElement);

    const remoteProgressElement: HTMLProgressElement =
      this.remotePeerAudioVolumeIndicator!.nativeElement;

    this.remoteVolumeAnalyzerService!.setVolumeMeterElement(
      remoteProgressElement
    );

    console.log(
      this.ownVolumeAnalyzerService,
      this.remoteVolumeAnalyzerService
    );
  };

  private disconnectFromWebRtcSession = () => {
    if (!this.webRtcSessionStarted) {
      return;
    }

    this.chatWebRtcService.endWebRTCSession();
    this.resetWebRTCState();
    this.resetMediaCheckboxes();

    console.log(
      '%croomDeletedCallback + End WebRTC session',
      'background: #222; color: #bada55'
    );
  };

  private setWebRtcServiceClassCallbacks = () => {
    this.chatWebRtcService.setOnRoomListUpdateCallback(this.updateRoomsList);
    this.chatWebRtcService.setOnRoomCreatedCallback(this.roomCreatedCallback);
    this.chatWebRtcService.setOnRoomErrorCallback(this.showRoomError);
    this.chatWebRtcService.setOnRoomJoinedCallback(this.roomJoinedCallback);
    this.chatWebRtcService.setOnRoomDeletedCallback(this.roomDeletedCallback);
    this.chatWebRtcService.setOnReceiveEnabledLocalMediaCallback(
      this.remotePeerHasSharedLocalMediaCallback
    );

    // this.chatWebRtcService.setOnRoomLeftCallback();

    this.chatWebRtcService.setOnTrackAddedCallback(
      this.setWebRtcSessionStarted
    );

    this.chatWebRtcService.setOnScreenShareEndedCallback(this.onScreenShareEnd);
  };

  private setWebRtcSessionStarted = (event: RTCTrackEvent) => {
    this.webRtcSessionStarted = true;

    const remoteStream: MediaStream = event.streams[0];

    // Check if the remote stream contains any audio tracks
    const audioTracks: MediaStreamTrack[] = remoteStream.getAudioTracks();

    if (!audioTracks.length) {
      console.log(
        'No audio tracks in remote stream, skipping volume measurement'
      );

      return;
    }

    this.remoteVolumeAnalyzerService!.setMicrophoneStream(remoteStream);

    this.remoteVolumeAnalyzerService!.startVolumeMeasurement();
  };

  private showRoomError = (errorMessage: string) => {
    this.roomErrorMessage = errorMessage;
  };

  private resetRoomErrorMessage = () => {
    this.roomErrorMessage = '';
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

  private resetWebRTCState = () => {
    this.isReceiver = false;
    this.otherPeerUserName = null;
    this.isRemotePeerMediaActive = false;
    this.webRtcSessionStarted = false;

    this.onScreenShareEnd();

    const remoteVideoElement: HTMLVideoElement =
      this.remoteWebCamVideoRef!.nativeElement;

    this.setVideoElementStream(remoteVideoElement, null);

    this.remoteVolumeAnalyzerService!.stopVolumeMeasurement();
  };

  private resetMediaCheckboxes = () => {
    this.showWebcam.update(() => false);

    this.openMicrophone.update(() => false);
  };

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
    isRemotePeerMediaActive: boolean
  ) => {
    this.isRemotePeerMediaActive = isRemotePeerMediaActive;
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
    console.log('roomDeletedCallback');

    this.disconnectFromWebRtcSession();

    this.currentRoom.update(() => {
      return null;
    });

    this.resetWebRTCState();
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
    this.chatWebRtcService.leaveRoom();

    this.disconnectFromWebRtcSession();

    this.currentRoom.update(() => {
      return null;
    });
  };

  public sendTestMessage = () => {
    this.socketIO()!.emit('wrtc-test', {
      roomName: this.currentRoom(),
      message: 'test',
    });
  };

  public initializeConnection = async () => {
    this.chatWebRtcService.startWebRTCSession();

    this.webRtcSessionStarted = true;
  };

  public switchWebcamDevice = async (event: Event) => {
    console.log('switchWebcamDevice', event);
    const selectElement = event.target as HTMLSelectElement;

    this.selectedVideoInputDeviceId.update(() => {
      return selectElement.value;
    });

    try {
      const videoInputDeviceId: string = selectElement.value;

      const localStream = await this.chatWebRtcService.manageLocalStream(
        this.showWebcam(),
        this.openMicrophone(),
        this.selectedVideoInputDeviceId(),
        this.selectedAudioInputDeviceId()
      );

      console.log({ videoInputDeviceId, localStream });

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream
        );
      }

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }
    } catch (error) {
      console.error(error);

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  public switchMicrophoneDevice = async (event: Event) => {
    console.log('switchMicrophoneDevice', event);
    const selectElement = event.target as HTMLSelectElement;

    this.selectedAudioInputDeviceId.update(() => {
      return selectElement.value;
    });

    try {
      const audioInputDeviceId: string = selectElement.value;

      const localStream: MediaStream | null =
        await this.chatWebRtcService.manageLocalStream(
          this.showWebcam(),
          this.openMicrophone(),
          this.selectedVideoInputDeviceId(),
          this.selectedAudioInputDeviceId()
        );

      console.log({ audioInputDeviceId, localStream });

      if (!localStream) {
        console.warn('No local stream available');

        return;
      }

      const webcamVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream
        );
      }

      this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream);

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }
    } catch (error) {
      console.error(error);

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
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

      const localStream: MediaStream | null =
        await this.chatWebRtcService.manageLocalStream(
          this.showWebcam(),
          this.openMicrophone(),
          this.selectedVideoInputDeviceId(),
          this.selectedAudioInputDeviceId()
        );

      if (!localStream) {
        console.warn('No local stream available (updateLocalStream)');
        return;
      }

      if (!this.showScreenCast()) {
        this.setVideoElementStream(
          webcamVideoElement,
          this.chatWebRtcService.localStream
        );
      }

      this.ownVolumeAnalyzerService!.setMicrophoneStream(localStream);

      if (this.openMicrophone()) {
        this.ownVolumeAnalyzerService!.startVolumeMeasurement();
      }

      this.hasWebcamPermissionDenied.update(() => false);
      this.hasMicrophonePermissionDenied.update(() => false);
    } catch (error) {
      if (!(error instanceof Error)) {
        return;
      }

      // Check for permission-related errors
      const isNotPermissionRelated: boolean =
        !error.message.includes('NotAllowedError') &&
        error.name !== 'NotAllowedError';

      if (isNotPermissionRelated) {
        console.error(`An unexpected error occurred: ${error.message}`);
      }

      // Check if it was due to the webcam
      if (this.showWebcam()) {
        this.showWebcam.update(() => false);
        this.hasWebcamPermissionDenied.update(() => isNotPermissionRelated);
      }

      // Check if it was due to the microphone
      if (this.openMicrophone()) {
        this.openMicrophone.update(() => false);
        this.hasMicrophonePermissionDenied.update(() => isNotPermissionRelated);
      }

      this.ownVolumeAnalyzerService!.stopVolumeMeasurement();
    }
  };

  private updateScreenCastStream = async () => {
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

      this.showScreenCast.update(() => false);
      this.hasCanceledScreenCast.update(() => true);

      console.log(this.showScreenCast());
    }
  };

  private onScreenShareEnd = (event?: Event): void => {
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

  public toggleInputDevicesOnWebRtc = (event: Event): void => {
    if (!this.webRtcSessionStarted) {
      console.error('WebRTC session has not started yet');

      return;
    }

    const input = event.currentTarget as HTMLInputElement;
    const [_, toggleType] = input.name.split(/\s/g);

    if (toggleType === 'webcam') {
      this.showWebcam.update(() => input.checked);
    } else if (toggleType === 'microphone') {
      this.openMicrophone.update(() => input.checked);
    }

    this.chatWebRtcService.toggleLocalStream(
      this.showWebcam(),
      this.openMicrophone()
    );
  };

  /**
   * Toggles the webcam state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleWebcam = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.showWebcam.update(() => input.checked);

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

    this.updateLocalStream();
  };

  /**
   * Toggles the screen cast state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleScreenCast = (event: Event): void => {
    this.showScreenCast.update(() => true);

    this.updateScreenCastStream();
  };

  public requestPictureInPicture = async (): Promise<void> => {
    try {
      if (!document.pictureInPictureEnabled) {
        throw new Error(
          'Cannot enable picture-in-picture: PiP mode is not supported by your browser'
        );
      }

      if (document.pictureInPictureElement) {
        throw new Error('Already in picture-in-picture mode');
      }

      const peerRemoteVideoElement: HTMLVideoElement =
        this.remoteWebCamVideoRef!.nativeElement;

      await peerRemoteVideoElement.requestPictureInPicture();
    } catch (error) {
      console.error('Error requesting picture-in-picture', error);

      this.wantsToTogglePiPOnTabSwitch.update(() => false);
    }
  };

  public removePictureInPicture = async (): Promise<void> => {
    if (!document.pictureInPictureEnabled) {
      console.warn(
        'Cannot disable picture-in-picture: PiP is not supported by your browser'
      );

      return;
    }

    if (!document.pictureInPictureElement) {
      console.warn('Not in picture-in-picture mode');

      return;
    }

    await document.exitPictureInPicture();
  };

  public togglePiPOnTabSwitch(event: Event) {
    const checkboxInput = event.target as HTMLInputElement;

    this.wantsToTogglePiPOnTabSwitch.update((prev) => !prev);
  }

  private togglePiPVideoElement = (event: Event) => {
    console.log('document.visibilityState', document.visibilityState);
    console.log('document.hidden', document.hidden);

    if (!this.wantsToTogglePiPOnTabSwitch()) {
      console.log(
        'Wants to toggle PiP on tab switch is false, not toggling PiP'
      );

      return;
    }

    if (!this.webRtcSessionStarted) {
      console.warn(
        'Cannot toggle PiP: WebRTC session has not started yet, no video element to toggle'
      );

      return;
    }

    if (document.visibilityState === 'visible') {
      this.removePictureInPicture();
    }
  };
}
