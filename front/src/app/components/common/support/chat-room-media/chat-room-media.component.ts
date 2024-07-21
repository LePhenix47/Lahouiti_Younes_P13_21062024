import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  SimpleChanges,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { ChatWebRtcService } from '@core/services/video-chat/chat-webrtc.service';

@Component({
  selector: 'app-chat-room-media',
  standalone: true,
  imports: [],
  templateUrl: './chat-room-media.component.html',
  styleUrl: './chat-room-media.component.scss',
})
export class ChatRoomMediaComponent {
  @ViewChild('ownWebCamVideoRef') ownWebCamVideoRef: ElementRef | null = null;
  @ViewChild('ownScreenCastVideoRef') ownScreenCastVideoRef: ElementRef | null =
    null;

  @ViewChild('remoteWebCamVideoRef') remoteWebCamVideoRef: ElementRef | null =
    null;
  @ViewChild('remoteScreenCastVideoRef')
  remoteScreenCastVideoRef: ElementRef | null = null;

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

  public showWebcam: boolean = false;
  public openMicrophone: boolean = false;
  public showScreenCast: boolean = false;

  public roomsList = signal<string[]>([]);
  public currentRoom = signal<string | null>(null);

  public signalEffect = effect(() => {
    console.log('effect');
  });

  public isReceiver: boolean = false;
  public otherPeerUserName: string | null = null;
  public localPeerHasSharedLocalMedia: boolean = false;
  public remotePeerHasSharedLocalMedia: boolean = false;
  public webRtcSessionStarted: boolean = false;

  ngOnInit() {
    console.group('ngOnInit()');
    this.chatWebRtcService.setSocketIO(this.socketIO()!);
    this.chatWebRtcService.addRoomSocketEventListeners();

    this.chatWebRtcService.setOnRoomListUpdateCallback(this.updateRoomsList);
    this.chatWebRtcService.setOnRoomCreatedCallback(this.roomCreatedCallback);
    this.chatWebRtcService.setOnRoomJoinedCallback(this.roomJoinedCallback);
    this.chatWebRtcService.setOnRoomDeletedCallback(this.roomDeletedCallback);

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
    this.chatWebRtcService.endWebRTCSession();
  }

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

  private updateRoomsList = (rooms: string[]) => {
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
    console.log('connectToRoom', roomName);
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
    this.localPeerHasSharedLocalMedia = false;
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
  };

  private updateLocalStream = async () => {
    console.log(this.showWebcam, this.openMicrophone, this.showScreenCast);

    await this.chatWebRtcService.setLocalStream(
      this.openMicrophone,
      this.showWebcam
    );

    const ownVideoElement = this.ownWebCamVideoRef
      ?.nativeElement as HTMLVideoElement;
    ownVideoElement.srcObject = this.chatWebRtcService.localStream;
  };

  private updateScreenCastStream = async () => {
    try {
      this.chatWebRtcService.resetScreenShareStream();

      if (!this.showScreenCast) {
        return;
      }

      const screenStream = await this.chatWebRtcService.setScreenShareStream();

      const screenVideoElement = this.ownScreenCastVideoRef
        ?.nativeElement as HTMLVideoElement;
      screenVideoElement.srcObject = screenStream;
    } catch (error) {
      console.error('Error accessing screen stream.', error);
      alert(error);

      this.showScreenCast = false;
    }
  };

  /**
   * Updates the given signal with the current state of the input element.
   *
   * @param {WritableSignal<boolean>} signal - The signal to update.
   * @param {Event} event - The event that triggered the update.
   */
  private updateSignal = (value: boolean, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;

    value = input.checked;
  };

  /**
   * Toggles the webcam state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleWebcam = (event: Event): void => {
    this.updateSignal(this.showWebcam, event);

    this.updateLocalStream();
  };

  /**
   * Toggles the audio input based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleAudio = (event: Event): void => {
    this.updateSignal(this.openMicrophone, event);

    this.updateLocalStream();
  };

  /**
   * Toggles the screen cast state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleScreenCast = (event: Event): void => {
    this.updateSignal(this.showScreenCast, event);

    this.updateScreenCastStream();
  };
}
