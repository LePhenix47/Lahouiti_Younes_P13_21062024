import { computed, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import {
  catchError,
  delay,
  Observable,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class CheckUsernameService extends ApiService {
  /**
   * The base pathname for authentication-related API endpoints.
   */
  private readonly API_PATHNAME: string = 'api/check-username';

  // * State
  private readonly state = signal({
    isLoading: false,
    isAvailable: false,
    error: null,
  });

  // * Selectors
  public readonly isLoading = computed(() => this.state().isLoading);
  public readonly isAvailable = computed(() => this.state().isAvailable);
  public readonly error = computed(() => this.state().error);

  private readonly userNameAvailabilitySubject = new Subject<string>();

  private readonly userNameAvailability$: Observable<string> =
    this.userNameAvailabilitySubject.asObservable();

  constructor() {
    super();

    // Subscribe to the subject to check username availability
    this.onUserNameAvailabilitySubjectEmission();
  }

  // * Actions
  private onUserNameAvailabilitySubjectEmission = (): void => {
    this.userNameAvailability$
      .pipe(
        tap(() => this.setLoadingIndicator(true)),
        switchMap((username: string) => this.checkUsername(username)), // Call the API to check availability
        delay(1_000),
        takeUntilDestroyed()
      )
      .subscribe((result) => {
        this.setLoadingIndicator(false); // Stop loading

        this.setAvailability(result.isAvailable); // Update availability
      });
  };

  /**
   * Checks the availability of a username by starting the loading indicator,
   * emitting the username to check, and updating the loading and availability
   * states accordingly.
   *
   * @param {string} username - The username to check availability for.
   */
  public checkUsernameAvailability = (username: string): void => {
    this.userNameAvailabilitySubject.next(username); // Emit the username to check
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

  private checkUsername = (
    userName: string
  ): Observable<{ isAvailable: boolean }> => {
    // Call your API using fetchPost and return the observable
    return this.fetchPost<{ isAvailable: boolean }>(this.API_PATHNAME, {
      userName,
    }).pipe(
      catchError((err) => {
        this.setErrorIndicator(err);
        return of({ isAvailable: false });
      })
    );
  };
}
