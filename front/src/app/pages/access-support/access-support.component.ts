import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { setChatUsernameAction } from '@core/ngrx/actions/chat-info.actions';
import { Store } from '@ngrx/store';

@Component({
  selector: 'app-access-support',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './access-support.component.html',
  styleUrl: './access-support.component.scss',
})
export class AccessSupportComponent {
  /**
   * Form builder service for creating reactive forms.
   */
  private readonly formBuilder = inject(FormBuilder);

  /**
   * Store for managing application state.
   */
  private readonly store = inject(Store);

  /**
   * Angular router service for navigation.
   */
  private readonly router = inject(Router);

  /**
   * Chat entering form.
   */
  protected readonly enterChatForm = this.formBuilder.group({
    username: ['', [Validators.required]],
  });

  /**
   * Handles form submission for chat form.
   *
   * @param {Event} event - The event object for the form submission.
   */
  protected onSubmit = (event: Event): void => {
    event.preventDefault();

    let { username } = this.enterChatForm.getRawValue();
    username = (username as unknown as string).trim();

    if (!username) {
      return;
    }

    console.log('submit', username);

    this.store.dispatch(
      setChatUsernameAction({
        username,
      })
    );

    this.router.navigate(['/support']);
  };
}
