import { isDevMode } from '@angular/core';
import { ActionReducerMap, MetaReducer } from '@ngrx/store';
import { chatUsernameReducer } from './chat-info.reducers';

/**
 * Interface representing the application state.
 */
export interface State {}

/**
 * Action reducer map defining how actions modify the application state.
 */
export const reducers: ActionReducerMap<State> = {
  chatUserInfo: chatUsernameReducer,
};

/**
 * An array of meta-reducers that will be applied to the store.
 *
 * @type {MetaReducer<State>[]}
 */
export const metaReducers: MetaReducer<State>[] = isDevMode() ? [] : [];
