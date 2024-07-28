import { computed, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { catchError, Observable, of } from 'rxjs';
import { CheckUsernameServiceState } from '@core/types/api/check-username-api.types';

@Injectable({
  providedIn: 'root',
})
export class CheckUsernameService extends ApiService {
  /**
   * The base pathname for authentication-related API endpoints.
   */
  private readonly API_PATHNAME: string = 'api/check-username';

  // * State
  private readonly state = signal<CheckUsernameServiceState>({
    isLoading: false,
    isAvailable: false,
    error: null,
  });

  // * Selectors
  public readonly isLoading = computed(() => this.state().isLoading);

  public readonly error = computed(() => this.state().error);

  public readonly isAvailable = computed(() => this.state().isAvailable);

  /**
   * Checks the availability of a username.
   *
   * @param {string} userName - The username to check.
   * @return {Promise<void>} A promise that resolves when the
   * availability of the username is checked.
   */
  public checkUsernameAvailability = (userName: string): Promise<void> => {
    this.setLoadingIndicator(true);
    this.setErrorIndicator(null);

    return new Promise((resolve, reject) => {
      const subscription = this.postUserNameToCheck(userName)
        .pipe(
          catchError((err: any) => {
            this.setErrorIndicator(err);

            reject(err);
            return of(err);
          })
        )
        .subscribe((result) => {
          resolve(result);

          this.setAvailability(result?.error ? false : true);
          this.setLoadingIndicator(false);

          subscription.unsubscribe();
        });
    });
  };

  private setLoadingIndicator = (isLoading: boolean): void => {
    this.state.update((state) => ({ ...state, isLoading }));
  };

  private setAvailability = (isAvailable: boolean): void => {
    this.state.update((state) => ({ ...state, isAvailable }));
  };

  private setErrorIndicator = (error: any): any => {
    this.state.update((state) => ({ ...state, error }));
  };

  private postUserNameToCheck = (
    userName: string
  ): Observable<{ message: string }> => {
    // Call your API using fetchPost and return the observable
    return this.fetchPost<{ message: string }>(this.API_PATHNAME, {
      userName,
    });
  };
}
