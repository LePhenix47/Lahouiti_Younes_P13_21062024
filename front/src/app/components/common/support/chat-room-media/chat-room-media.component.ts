import { Component, input } from '@angular/core';
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

  /**
   * The username of the current user.
   */
  public readonly ownUsername = input.required<string>();

  ngOnInit() {
    console.log(
      'ChatRoomMediaComponent',
      this.stompClient(),
      this.usersList(),
      this.ownUsername()
    );
  }

  ngOnDestroy() {}
}
