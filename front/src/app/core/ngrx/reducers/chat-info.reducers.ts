import { createReducer, on } from '@ngrx/store';
import { Username, setChatUsernameAction } from '../actions/chat-info.actions';

/**
 * Represents the initial state of the chat info store.
 */
const chatInfoInitialState: Username = {
  username: '',
};

/**
 * Reducer for the chat info state.
 *
 * @param {Username} state - The current state of the chat info store.
 * @param {Action} action - The action to be applied to the state.
 * @returns {Username} The new state of the chat info store.
 */
export const chatUsernameReducer = createReducer(
  chatInfoInitialState,
  on(setChatUsernameAction, (state: Username, info: Username) => {
    const { username } = info;

    return { ...state, username };
  })
);
