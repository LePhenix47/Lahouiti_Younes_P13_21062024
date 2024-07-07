export type ChatWebSocketResponse = {
  sender: string;
  message: string;
  date: Date;
};

export type ChatWebSocketJoinLeaveResponse = {
  sender: string;
  users: string[];
};

export type ChatLogMessage = ChatWebSocketResponse & {
  type: 'JOIN' | 'LEAVE' | 'CHAT';
};

export type SignalMessage = {
  type: string;
  sdp: string;
  fromUsername: string;
  toUsernames: string[];
};
