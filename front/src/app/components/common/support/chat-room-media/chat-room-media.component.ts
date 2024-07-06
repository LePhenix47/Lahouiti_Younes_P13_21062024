import {
  Component,
  effect,
  ElementRef,
  inject,
  input,
  signal,
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
  /**
   * The Stomp client for the WebSocket connection.
   */
  public readonly stompClient = input.required<Stomp.Client | null>();

  /**
   * An array of user names in the chat.
   */
  public readonly usersList = input.required<string[]>();

  public realUsersList: string[] = [];

  /**
   * The username of the current user.
   */
  public readonly ownUsername = input.required<string>();

  private readonly chatWebRtcService = inject(ChatWebRtcService);

  @ViewChild('ownWebCamVideoRef') ownWebCamVideoRef: ElementRef | null = null;

  public showWebcam = signal<boolean>(false);
  public openMicrophone = signal<boolean>(false);
  public showScreenCast = signal<boolean>(false);

  public userChange = effect(() => {
    this.updateLocalStream();
  });

  ngOnInit() {
    this.chatWebRtcService.setStompClient(this.stompClient()!);

    this.realUsersList = this.usersList()!.filter(
      (user) => user !== this.ownUsername()
    );
  }

  ngOnDestroy() {}

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
