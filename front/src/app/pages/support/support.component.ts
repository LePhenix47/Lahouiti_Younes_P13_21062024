import { Component, inject } from '@angular/core';
import { ChatModuleComponent } from '@components/common/support/chat-module/chat-module.component';
import { Username } from '@core/ngrx/actions/chat-info.actions';
import { Store } from '@ngrx/store';
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

  ngOnInit() {
    console.log('Own username', this.ownUsername);
  }
}
