import { PrettifyObject } from '../ts/ts-helpers.types';

export type ChatWebSocketResponse = Readonly<{
  sender: string;
  message: string;
  date: Date;
}>;

export type ChatWebSocketJoinLeaveResponse = Readonly<{
  sender: string;
  users: string[];
}>;

export type ChatLogMessage = PrettifyObject<
  ChatWebSocketResponse & {
    readonly type: 'JOIN' | 'LEAVE' | 'CHAT';
  }
>;

export type SignalMessage = Readonly<{
  type: string;
  sdp: string;
  fromUsername: string;
  toUsernames: string[];
}>;
