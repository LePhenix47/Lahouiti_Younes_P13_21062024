import { Injectable } from '@angular/core';
import { WebSocketsService } from '../websockets/websockets.service';
import Stomp, { Frame, Message, over } from 'stompjs';

@Injectable({
  providedIn: 'root',
})
export class ChatWebSocketsService extends WebSocketsService {
  public connected: boolean = false;

  protected isClientInitializedAndConnected(): boolean {
    if (!this.connected) {
      throw new Error('User is not connected to the websockets of the server');
    }

    return true;
  }

  public isConnected(): boolean {
    return this.connected;
  }
  protected handleOnDisconnect = (): void => {
    console.log(
      '%cDisconnected!',
      'background: red; color: white; padding: 5px'
    );
    this.connected = false;
  };

  protected handleOnConnect = (frame: Frame | undefined): void => {
    console.log(
      '%cConnected:',
      'background: green; color: white; padding: 5px',
      frame
    );
    this.connected = true; // Ensure this.connected is accessible in the subclass
  };

  protected handleOnError = (error: string | Frame): void => {
    console.error('WebSocket connection error:', error);
    this.connected = false; // Ensure this.connected is accessible in the subclass
  };

  public subscribeToPublic(callback: (message: Stomp.Message) => void): void {
    this.isClientInitializedAndConnected();

    this.stompClient.subscribe('/topic/public', (message: Stomp.Message) => {
      console.log(
        '%cReceived message:',
        'background: blue; color: white; padding: 5px',
        message.body
      );
      callback(message);
    });
  }

  public sendMessage(message: string): void {
    this.isClientInitializedAndConnected();

    this.stompClient.send(
      '/app/chat.sendMessage',
      {},
      JSON.stringify({ message })
    );
  }

  public addUser(username: string): void {
    this.isClientInitializedAndConnected();

    this.stompClient.send(
      '/app/chat.addUser',
      {},
      JSON.stringify({ sender: username, type: 'JOIN' })
    );
  }
}
