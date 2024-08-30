import { createAction, props } from '@ngrx/store';

export type Username = {
  username: string;
};

/**
 * Sets the username in the NgRx store.
 *
 * @param {Username} payload - The payload object containing the username.
 * @return {Action} The action object with the type and payload.
 */
export const setChatUsernameAction = createAction(
  'set-chat-username',
  props<Username>()
);
