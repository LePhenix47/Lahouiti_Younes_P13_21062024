import { Component, inject } from '@angular/core';
import { ChatModuleComponent } from '@components/common/support/chat-module/chat-module.component';
import { Username } from '@core/ngrx/actions/chat-info.actions';
import { Store } from '@ngrx/store';
import Stomp, { Frame } from 'stompjs';

import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-support',
  standalone: true,
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss',
  imports: [ChatModuleComponent],
})
export class SupportComponent {
  /**
   * Store for managing application state.
   */
  private readonly store = inject(Store);

  protected readonly ownUsername: string = toSignal<Username>(
    this.store.select('chatUserInfo')
  )()!.username;

  protected sharedStompClient: Stomp.Client | null = null;

  test = (arrayOfUsers: string[]): void => {
    console.log(
      '%ctest',
      'color: white ; background: #d46e08; font-size: 1em; padding: 5px',
      arrayOfUsers
    );
  };

  setStompClient = (stompClient: Stomp.Client | null) => {
    console.log('setStompClient', stompClient);
    this.sharedStompClient = stompClient;
  };

  ngOnInit() {
    console.log('Own username', this.ownUsername);
  }
}
