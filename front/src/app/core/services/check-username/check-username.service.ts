import { computed, Injectable, signal } from '@angular/core';
import { ApiService } from '../api/api.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CheckUsernameService extends ApiService {
  /**
   * The base pathname for authentication-related API endpoints.
   */
  private readonly API_PATHNAME: string = 'api/check-username';

  private state = signal({
    isLoading: false,
    isAvailable: false,
    error: null,
  });

  // * Selectors
  isLoading = computed(() => this.state().isLoading);
  isAvailable = computed(() => this.state().isAvailable);
  error = computed(() => this.state().error);

  private userNameAvailabilitySubject = new Subject<boolean>();

  constructor() {
    super();
  }

  // * Actions
  public getUserNameAvailability = (username: string): void => {
    // this.userNameAvailabilitySubject.next(username);
  };

  private setLoadingIndicator = (isLoading: boolean): void => {
    this.state.update((state) => ({ ...state, isLoading }));
  };

  private setAvailability = (isAvailable: boolean): void => {
    this.state.update((state) => ({ ...state, isAvailable }));
  };

  private setErrorIndicator = (error: any): void => {
    this.state.update((state) => ({ ...state, error }));
  };
}
