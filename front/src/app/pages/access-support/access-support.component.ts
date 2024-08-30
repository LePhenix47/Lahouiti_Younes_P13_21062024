import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { setChatUsernameAction } from '@core/ngrx/actions/chat-info.actions';
import { CheckUsernameService } from '@core/services/check-username/check-username.service';
import { Store } from '@ngrx/store';
import { SpinLoaderComponent } from '@components/shared/spin-loader/spin-loader.component';
import { usernameSuggestions } from '@core/variables/access-support.variables';

@Component({
  selector: 'app-access-support',
  standalone: true,
  imports: [ReactiveFormsModule, SpinLoaderComponent],
  templateUrl: './access-support.component.html',
  styleUrl: './access-support.component.scss',
})
export class AccessSupportComponent {
  /**
   * Form builder service for creating reactive forms.
   */
  private readonly formBuilder = inject(FormBuilder);

  private readonly checkUserNameService = inject(CheckUsernameService);

  public readonly isLoading = this.checkUserNameService.isLoading;
  public readonly error = this.checkUserNameService.error;
  public readonly isAvailable = this.checkUserNameService.isAvailable;

  public readonly usernameSuggestions =
    signal<typeof usernameSuggestions>(usernameSuggestions);

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
  protected onSubmit = async (event: Event): Promise<void> => {
    event.preventDefault();

    let { username } = this.enterChatForm.getRawValue();
    username = (username as unknown as string).trim();

    if (!username) {
      return;
    }

    await this.checkUserNameService.checkUsernameAvailability(username);

    if (this.error()) {
      console.error(this.error()?.error.message);

      return;
    }

    this.store.dispatch(
      setChatUsernameAction({
        username,
      })
    );

    this.router.navigate(['/support']);
  };
}
