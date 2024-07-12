import { Injectable } from '@angular/core';
import { WebSocketsService } from '../websockets/websockets.service';

@Injectable({
  providedIn: 'root',
})
export class ChatWebSocketsService extends WebSocketsService {
  public currentUserNickname: string | null = null;
  public connected: boolean = false;
  public hasError: boolean = false;
  public onJoin: (...args: any[]) => any = () => {};
  public onLeave: (...args: any[]) => any = () => {};
  public onChatMessage: (...args: any[]) => any = () => {};
  public onChatConnection: (...args: any[]) => any = () => {};

  public setOnChatConnection(callback: (...args: any[]) => any): void {
    this.onChatConnection = callback;
  }

  public setOnJoin(callback: (...args: any[]) => any): void {
    this.onJoin = callback;
  }

  public setCurrentUser(nickname: string): void {
    this.currentUserNickname = nickname;
  }

  public setOnLeave(callback: (...args: any[]) => any): void {
    this.onLeave = callback;
  }

  public setOnChatMessage(callback: (...args: any[]) => any): void {
    this.onChatMessage = callback;
  }

  protected isClientInitializedAndConnected(): void {
    if (!this.socketio) {
      throw new Error('WebSocket client is not initialized');
    }

    if (!this.connected) {
      throw new Error('User is not connected to the WebSocket server');
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  protected handleOnConnect(): void {
    console.log(
      '%cConnected:',
      'background: green; color: white; padding: 5px'
    );
    this.connected = true;
    this.hasError = false;

    this.subscribeToTopicWebSocket();
    this.onChatConnection();
  }

  protected handleOnError(error: string | any): void {
    console.error('WebSocket connection error:', error);
    this.connected = false;
    this.hasError = true;
  }

  protected handleOnDisconnect(): void {
    console.log(
      '%cDisconnected!',
      'background: red; color: white; padding: 5px'
    );
    this.unsubscribeFromTopicWebSocket();
    this.connected = false;
  }

  private subscribeToTopicWebSocket(): void {
    this.isClientInitializedAndConnected();

    this.socketio!.on('join', this.handleJoin);
    this.socketio!.on('leave', this.handleLeave);
    this.socketio!.on('chat.message', this.handleChatMessage);
  }

  private handleJoin = (message: any): void => {
    const { sender, users } = message;
    if (!sender) {
      throw new Error('Sender is not defined in the received message');
    }

    console.log(
      '%cUser joined:',
      'background: blue; color: white; padding: 5px',
      { message }
    );
    this.onJoin({ sender, users });
  };

  private handleLeave = (message: any): void => {
    const { sender, users } = message;
    if (!sender) {
      throw new Error('Sender is not defined in the received message');
    }

    console.log(
      '%cUser left:',
      'background: blue; color: white; padding: 5px',
      { message }
    );
    this.onLeave({ sender, users });
  };

  private handleChatMessage = (message: any): void => {
    const { sender, message: chatMessage } = message;
    if (!sender) {
      throw new Error('Sender is not defined in the received message');
    }

    const date = new Date();
    console.log(
      '%cReceived message:',
      'background: blue; color: white; padding: 5px',
      { message }
    );
    this.onChatMessage({ sender, message: chatMessage, date });
  };

  private unsubscribeFromTopicWebSocket(): void {
    if (!this.socketio || !this.connected) {
      console.error(
        'Cannot disconnect as socket client is not initialized or client is not connected'
      );
      return;
    }

    this.socketio.off('join', this.handleJoin);
    this.socketio.off('leave', this.handleLeave);
    this.socketio.off('chat.message', this.handleChatMessage);
  }

  public sendMessage(sender: string, message: string): void {
    this.isClientInitializedAndConnected();

    this.socketio!.emit('chat.message', { sender, message });
  }

  public addUser(): void {
    this.isClientInitializedAndConnected();

    if (!this.currentUserNickname) {
      throw new Error('No current user nickname is set');
    }

    console.log(
      '%cAdd user',
      'background: #3f51b5; color: white; padding: 5px',
      this.currentUserNickname
    );
    this.socketio!.emit('join', {
      sender: this.currentUserNickname,
      type: 'JOIN',
      message: '',
    });
  }
}
