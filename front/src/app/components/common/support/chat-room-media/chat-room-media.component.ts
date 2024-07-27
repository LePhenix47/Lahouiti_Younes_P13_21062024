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
import { Room } from '@core/types/videoconference/videoconference.types';

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
  @ViewChild('ownScreenCastVideoRef')
  ownScreenCastVideoRef: ElementRef<HTMLVideoElement> | null = null;

  @ViewChild('remoteWebCamVideoRef')
  remoteWebCamVideoRef: ElementRef<HTMLVideoElement> | null = null;
  @ViewChild('remoteScreenCastVideoRef')
  remoteScreenCastVideoRef: ElementRef<HTMLVideoElement> | null = null;

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
  public localPeerHasSharedLocalMedia = computed(() => {
    console.log(
      'localPeerHasSharedLocalMedia signal updated!',
      this.chatWebRtcService.currentRoom,
      this.webRtcSessionStarted
    );

    const hasSharedLocalFeed = this.showWebcam() || this.openMicrophone();
    const hasSharedScreenFeed = this.showScreenCast();

    const localPeerHasSharedLocalMedia: boolean =
      hasSharedLocalFeed || hasSharedScreenFeed;

    if (this.chatWebRtcService.currentRoom && !this.webRtcSessionStarted) {
      this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare(
        localPeerHasSharedLocalMedia
      );
    }

    return localPeerHasSharedLocalMedia;
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

  ngOnInit() {
    console.group('ngOnInit()');
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

  setWebRtcSessionStarted = () => {
    this.webRtcSessionStarted = true;
  };

  ngAfterViewInit(): void {
    console.group('ngAfterViewInit()');
    this.setWebRtcVideoElements();
    console.groupEnd();
  }

  ngOnDestroy() {
    this.webRtcSessionStarted = false;
    this.chatWebRtcService.endWebRTCSession();
  }

  private showRoomError = (errorMessage: string) => {
    console.log('Room error: ', errorMessage);

    this.roomErrorMessage = errorMessage;
  };

  private resetState = () => {};

  private remotePeerHasSharedLocalMediaCallback = (
    remotePeerHasSharedLocalMedia: boolean
  ) => {
    this.remotePeerHasSharedLocalMedia = remotePeerHasSharedLocalMedia;

    console.log(
      'remotePeerHasSharedLocalMediaCallback',
      this.remotePeerHasSharedLocalMedia
    );
  };

  private setWebRtcVideoElements = () => {
    // * Local webcam, audio and screen cast
    this.chatWebRtcService.setLocalVideoElement(
      this.ownWebCamVideoRef!.nativeElement
    );
    this.chatWebRtcService.setLocalScreenElement(
      this.ownScreenCastVideoRef!.nativeElement
    );

    // * Remote webcam, audio and screen cast
    this.chatWebRtcService.setRemoteVideoElement(
      this.remoteWebCamVideoRef!.nativeElement
    );
    this.chatWebRtcService.setRemoteScreenElement(
      this.remoteScreenCastVideoRef!.nativeElement
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
    console.log('roomJoinedCallback', roomName);

    this.currentRoom.update(() => {
      return roomName;
    });

    this.isReceiver = otherPeerUserName === this.ownUsername();

    this.otherPeerUserName = otherPeerUserName;

    console.log(
      `Currently in a room (${this.currentRoom()}) with ${
        this.otherPeerUserName
      }`
    );

    this.chatWebRtcService.notifyRemotePeerOfLocalMediaShare(
      this.localPeerHasSharedLocalMedia()
    );
  };

  private roomDeletedCallback = () => {
    console.log('roomDeletedCallback');

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

    console.log(
      '%cdisconnectFromRoom methodn, current room',
      'background: red; padding: 10px',
      this.currentRoom()
    );
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

  private updateLocalStream = async () => {
    try {
      const ownVideoElement: HTMLVideoElement =
        this.ownWebCamVideoRef!.nativeElement;

      console.log(
        this.showWebcam(),
        this.openMicrophone(),
        this.showScreenCast()
      );

      this.chatWebRtcService.resetLocalStream();

      if (!this.showWebcam() && !this.openMicrophone()) {
        ownVideoElement.srcObject = null;
        return;
      }

      await this.chatWebRtcService.setLocalStream(
        this.openMicrophone(),
        this.showWebcam()
      );

      ownVideoElement.srcObject = this.chatWebRtcService.localStream;
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
        alert(`An unexpected error occurred: ${error.message}`);

        return;
      }

      // Check if it was due to the webcam
      if (this.showWebcam()) {
        webcamCheckbox.checked = false;
        this.showWebcam.update(() => false);
        alert('Webcam access denied.');
      }

      // Check if it was due to the microphone
      if (this.openMicrophone()) {
        audioCheckbox.checked = false;
        this.openMicrophone.update(() => false);
        alert('Microphone access denied.');
      }
    }
  };

  private updateScreenCastStream = async () => {
    try {
      const screenVideoElement: HTMLVideoElement =
        this.ownScreenCastVideoRef!.nativeElement;

      this.chatWebRtcService.resetScreenShareStream();

      if (!this.showScreenCast()) {
        screenVideoElement.srcObject = null;
        return;
      }

      const screenStream = await this.chatWebRtcService.setScreenShareStream();

      screenVideoElement.srcObject = screenStream;
    } catch (error) {
      console.error('Error accessing screen stream.', error);
      alert(error);

      const screenCastCheckbox: HTMLInputElement =
        this.screenCastCheckboxRef!.nativeElement;

      screenCastCheckbox.checked = false;
      this.showScreenCast.update(() => false);
    }
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
      console.log(
        "%cStarted session, don't need to notify remote peer",
        'background: orange'
      );

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
      console.log(
        "%cStarted session, don't need to notify remote peer",
        'background: orange'
      );

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

    if (this.webRtcSessionStarted) {
      // TODO: Add the logic to get the media track and toggle the "enabled" property
      return;
    }

    this.updateScreenCastStream();
  };
}
