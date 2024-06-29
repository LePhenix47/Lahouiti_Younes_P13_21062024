export type ChatWebSocketResponse = {
  sender: string;
  message: string;
  date: Date;
};

export type ChatLogMessage = ChatWebSocketResponse & {
  type: 'JOIN' | 'LEAVE' | 'CHAT';
};
