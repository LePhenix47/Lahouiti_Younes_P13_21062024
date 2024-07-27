import { Component, inject } from '@angular/core';
import { ChatModuleComponent } from '@components/common/support/chat-module/chat-module.component';
import { Username } from '@core/ngrx/actions/chat-info.actions';
import { Store } from '@ngrx/store';

import { toSignal } from '@angular/core/rxjs-interop';
import { ChatRoomMediaComponent } from '@components/common/support/chat-room-media/chat-room-media.component';

@Component({
  selector: 'app-support',
  standalone: true,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss',
  imports: [ChatModuleComponent, ChatRoomMediaComponent],
})
export class SupportComponent {
  /**
   * Store for managing application state.
   */
  private readonly store = inject(Store);

  protected readonly ownUsername: string = toSignal<Username>(
    this.store.select('chatUserInfo')
  )()!.username;

  protected sharedSocket: any | null = null;

  protected usersList: string[] = [];

  setUsersArray = (arrayOfUsers: string[]): void => {
    this.usersList = arrayOfUsers;
  };

  setSocket = (socket: any | null) => {
    this.sharedSocket = socket;
  };

  ngOnInit() {
  }
}
