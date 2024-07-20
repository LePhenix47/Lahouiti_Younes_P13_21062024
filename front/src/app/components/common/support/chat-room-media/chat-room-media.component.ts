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

  public showWebcam = signal<boolean>(false);
  public openMicrophone = signal<boolean>(false);
  public showScreenCast = signal<boolean>(false);

  public roomsList = signal<string[]>([]);

  public currentRoom = signal<string | null>(null);
  public isReceiver = signal<boolean>(false);
  public otherPeerUserName = signal<string | null>(null);

  public userChange = effect(() => {
    console.log('effect');
  });

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

  ngOnDestroy() {
    this.chatWebRtcService.endWebRTCSession(this.ownUsername());
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

    this.isReceiver.update(() => {
      return true;
    });
  };

  private roomJoinedCallback = (
    roomName: string,
    otherPeerUsername: string
  ) => {
    console.log('roomJoinedCallback', roomName);

    this.currentRoom.update(() => {
      return roomName;
    });

    this.isReceiver.update(() => {
      return otherPeerUsername === this.ownUsername();
    });

    console.log(`Currently in a room (${roomName}) with ${otherPeerUsername}`);
  };

  private roomDeletedCallback = () => {
    console.log('roomDeletedCallback');

    this.currentRoom.update(() => {
      return null;
    });

    this.isReceiver.update(() => {
      return false;
    });
  };

  private updateRoomsList = (rooms: string[]) => {
    this.roomsList.update(() => {
      return rooms;
    });
  };

  public createRoom = () => {
    this.chatWebRtcService.createRoom(this.ownUsername());
    this.chatWebRtcService.createPeerConnection();

    this.setWebRtcVideoElements();
  };

  public deleteRoom = () => {
    this.chatWebRtcService.deleteRoom(this.ownUsername());
  };

  public connectToRoom = (roomName: string) => {
    console.log('connectToRoom', roomName);
    this.chatWebRtcService.createPeerConnection();
    this.chatWebRtcService.joinRoom(roomName);

    this.setWebRtcVideoElements();
  };

  public disconnectFromRoom = () => {
    console.log('disconnectFromRoom method (NOT IMPLEMENTED)');
  };

  public sendTestMessage = () => {
    this.socketIO()!.emit('wrtc-test', {
      roomName: this.currentRoom(),
      message: 'test',
    });
  };

  public initializeConnection = async () => {
    this.chatWebRtcService.createPeerConnection();

    await this.chatWebRtcService.createOffer();
  };

  public joinConnection = async () => {
    await this.chatWebRtcService.createAnswer();
  };

  private updateLocalStream = async () => {
    console.log(
      this.showWebcam(),
      this.openMicrophone(),
      this.showScreenCast()
    );

    await this.chatWebRtcService.setLocalStream(
      this.openMicrophone(),
      this.showWebcam()
    );

    const ownVideoElement = this.ownWebCamVideoRef
      ?.nativeElement as HTMLVideoElement;
    ownVideoElement.srcObject = this.chatWebRtcService.localStream;
  };

  private updateScreenCastStream = async () => {
    try {
      this.chatWebRtcService.resetScreenShareStream();

      if (!this.showScreenCast()) {
        return;
      }

      const screenStream = await this.chatWebRtcService.setScreenShareStream();

      const screenVideoElement = this.ownScreenCastVideoRef
        ?.nativeElement as HTMLVideoElement;
      screenVideoElement.srcObject = screenStream;
    } catch (error) {
      console.error('Error accessing screen stream.', error);
      alert(error);

      this.showScreenCast.update(() => {
        return false;
      });
    }
  };

  /**
   * Updates the given signal with the current state of the input element.
   *
   * @param {WritableSignal<boolean>} signal - The signal to update.
   * @param {Event} event - The event that triggered the update.
   */
  private updateSignal = (
    signal: WritableSignal<boolean>,
    event: Event
  ): void => {
    const input = event.currentTarget as HTMLInputElement;

    signal.update(() => {
      return input.checked;
    });
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
