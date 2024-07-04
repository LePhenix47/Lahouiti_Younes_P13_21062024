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
