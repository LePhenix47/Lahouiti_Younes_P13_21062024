import { Injectable } from '@angular/core';
import { WebSocketsService } from '../websockets/websockets.service';
import Stomp, { Frame, Message, over } from 'stompjs';

@Injectable({
  providedIn: 'root',
})
export class ChatWebSocketsService extends WebSocketsService {
  /**
   * Indicates whether the client is connected to the WebSocket server.
   */
  public connected: boolean = false;

  /**
   * Callback function to be executed when a user joins the chat.
   * @param args - The arguments passed to the callback function.
   * @returns The result of the callback function.
   */
  public onJoin: (...args: any[]) => any = () => {};

  /**
   * Callback function to be executed when a user leaves the chat.
   * @param args - The arguments passed to the callback function.
   * @returns The result of the callback function.
   */
  public onLeave: (...args: any[]) => any = () => {};

  /**
   * Callback function to be executed when a chat message is received.
   * @param args - The arguments passed to the callback function.
   * @returns The result of the callback function.
   */
  public onChatMessage: (...args: any[]) => any = () => {};

  /**
   * Sets the callback function to be executed when a user joins the chat.
   * @param callback - The callback function to be executed.
   */
  public setOnJoin(callback: (...args: any[]) => any): void {
    this.onJoin = callback;
  }

  /**
   * Sets the callback function to be executed when a user leaves the chat.
   * @param callback - The callback function to be executed.
   */
  public setOnLeave(callback: (...args: any[]) => any): void {
    this.onLeave = callback;
  }

  /**
   * Sets the callback function to be executed when a chat message is received.
   * @param callback - The callback function to be executed.
   */
  public setOnChatMessage(callback: (...args: any[]) => any): void {
    this.onChatMessage = callback;
  }

  protected isClientInitializedAndConnected = (): void => {
    console.log(this.stompClient, this.connected);

    if (!this.stompClient) {
      throw new Error(
        `Stomp client is not defined (value: ${this.stompClient})`
      );
    }

    if (!this.connected) {
      throw new Error('User is not connected to the websockets of the server');
    }
  };

  /**
   * Returns the connection status of the service.
   *
   * @return {boolean} The connection status of the service.
   */
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

  /**
   * Returns the connection status of the service.
   *
   * @return {boolean} The connection status of the service.
   */
  protected handleOnConnect = (frame: Frame | undefined): void => {
    console.log(
      '%cConnected:',
      'background: green; color: white; padding: 5px',
      frame
    );
    this.connected = true;

    this.onNewServerMessage();
  };

  protected handleOnError = (error: string | Frame): void => {
    console.error('WebSocket connection error:', error);
    this.connected = false;
  };

  /**
   * Subscribes to the `/topic/public` WebSocket topic and listens for new server messages.
   * If the client is not initialized or not connected, it does nothing.
   * Logs the received message to the console and parses its body into a JSON object.
   * Handles different types of messages based on their `type` property.
   *
   * @return {void} This function does not return anything.
   */
  public onNewServerMessage = (): void => {
    this.isClientInitializedAndConnected();

    this.stompClient.subscribe(
      '/topic/public',
      (stompMessage: Stomp.Message) => {
        const { body } = stompMessage!;

        const { type, sender, message } = JSON.parse(body);
        console.log(
          '%cReceived message:',
          'background: blue; color: white; padding: 5px',
          { type, sender, message }
        );

        switch (type) {
          case 'JOIN': {
            this.onJoin({ sender, message });
            break;
          }
          case 'CHAT': {
            this.onChatMessage({ sender, message });
            break;
          }
          case 'LEAVE': {
            this.onLeave({ sender, message });
            break;
          }

          default:
            throw new Error(`Unknown type received: ${type}`);
        }
      }
    );
  };

  public sendMessage(sender: string, message: string): void {
    this.isClientInitializedAndConnected();

    this.stompClient.send(
      '/app/chat.sendMessage',
      {},
      JSON.stringify({ message, sender, type: 'CHAT' })
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
