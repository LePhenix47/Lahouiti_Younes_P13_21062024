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
import Stomp from 'stompjs';

@Component({
  selector: 'app-chat-room-media',
  standalone: true,
  imports: [],
  templateUrl: './chat-room-media.component.html',
  styleUrl: './chat-room-media.component.scss',
})
export class ChatRoomMediaComponent {
  @ViewChild('ownWebCamVideoRef') ownWebCamVideoRef: ElementRef | null = null;
  @ViewChild('screenCastVideoRef') screenCastVideoRef: ElementRef | null = null;

  /**
   * The Stomp client for the WebSocket connection.
   */
  public readonly stompClient = input.required<Stomp.Client | null>();

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

  public userChange = effect(() => {
    console.log('effect');

    this.updateLocalStream();

    this.updateScreenCastStream();
  });

  ngOnInit() {
    console.group('ngOnInit()');
    this.chatWebRtcService.setStompClient(this.stompClient()!);

    console.log(this.chatWebRtcService.geStompClient(), this.stompClient());

    this.chatWebRtcService.startWebRTCSession(this.ownUsername());
    console.groupEnd();
  }

  ngOnDestroy() {
    this.chatWebRtcService.endWebRTCSession(this.ownUsername());
  }

  public initializeConnection = () => {
    this.chatWebRtcService.startWebRTCSession(this.ownUsername());
    console.log(this.chatWebRtcService.getPeerConnections());
  };

  private updateLocalStream = async () => {
    console.log(
      this.showWebcam(),
      this.openMicrophone(),
      this.showScreenCast()
    );

    this.chatWebRtcService.resetLocalStream();

    await this.chatWebRtcService.setLocalStream(
      this.openMicrophone(),
      this.showWebcam()
    );

    const ownVideoElement = this.ownWebCamVideoRef
      ?.nativeElement as HTMLVideoElement;
    ownVideoElement.srcObject = this.chatWebRtcService.getLocalStream();
  };

  private updateScreenCastStream = async () => {
    try {
      this.chatWebRtcService.resetScreenShareStream();

      if (!this.showScreenCast()) {
        return;
      }

      const screenStream = await this.chatWebRtcService.setScreenShareStream();

      const screenVideoElement = this.screenCastVideoRef
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
  };

  /**
   * Toggles the audio input based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleAudio = (event: Event): void => {
    this.updateSignal(this.openMicrophone, event);
  };

  /**
   * Toggles the screen cast state based on the given event.
   *
   * @param {Event} event - The event that triggered the toggle.
   */
  public toggleScreenCast = (event: Event): void => {
    this.updateSignal(this.showScreenCast, event);
  };
}
