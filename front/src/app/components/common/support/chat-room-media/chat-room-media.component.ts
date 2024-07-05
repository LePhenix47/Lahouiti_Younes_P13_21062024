import { Component, input } from '@angular/core';
import Stomp, { Frame } from 'stompjs';

@Component({
  selector: 'app-chat-room-media',
  standalone: true,
  imports: [],
  templateUrl: './chat-room-media.component.html',
  styleUrl: './chat-room-media.component.scss',
})
export class ChatRoomMediaComponent {
  public readonly stompClient = input.required<Stomp.Client | null>();
  public readonly usersList = input.required<string[]>();
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
