import { Injectable } from '@angular/core';
import { WebSocketsService } from '../websockets/websockets.service';
import Stomp, { Frame, Message, over } from 'stompjs';

@Injectable({
  providedIn: 'root',
})
export class ChatWebSocketsService extends WebSocketsService {
  /**
   * The nickname of the current user.
   * @type {string | null}
   */
  public currentUserNickname: string | null = null;

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
  public setOnJoin = (callback: (...args: any[]) => any): void => {
    this.onJoin = callback;
  };

  public setCurrentUser = (nickname: string): void => {
    this.currentUserNickname = nickname;
  };

  /**
   * Sets the callback function to be executed when a user leaves the chat.
   * @param callback - The callback function to be executed.
   */
  public setOnLeave = (callback: (...args: any[]) => any): void => {
    this.onLeave = callback;
  };

  /**
   * Sets the callback function to be executed when a chat message is received.
   * @param callback - The callback function to be executed.
   */
  public setOnChatMessage = (callback: (...args: any[]) => any): void => {
    this.onChatMessage = callback;
  };

  /**
   * Checks if the client is initialized and connected to the server.
   *
   * @throws {Error} If the client is not defined or not connected.
   */
  protected isClientInitializedAndConnected = (): void => {
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

  /**
   * Handles the connection with the server.
   *
   * @param {Frame | undefined} frame - The frame containing the connection details.
   * @return {void}
   */
  protected handleOnConnect = (frame: Frame | undefined): void => {
    console.log(
      '%cConnected:',
      'background: green; color: white; padding: 5px',
      frame
    );
    this.connected = true;

    this.subscribeToTopicWebSocket();
  };

  /**
   * Handles errors that occur during the connection.
   *
   * @param {string | Frame} error - The error that occurred.
   * @return {void}
   */
  protected handleOnError = (error: string | Frame): void => {
    debugger;
    console.error('WebSocket connection error:', error);
    this.connected = false;
  };

  /**
   * Handles the disconnection from the server.
   *
   * @return {void} This function does not return anything.
   */
  protected handleOnDisconnect = (): void => {
    console.log(
      '%cDisconnected!',
      'background: red; color: white; padding: 5px'
    );
    this.unsubscribeFromTopicWebSocket();

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
  private subscribeToTopicWebSocket = (): void => {
    this.isClientInitializedAndConnected();

    this.stompClient!.subscribe(
      '/topic/public',
      this.handleTopicWebSocketMessage
    );
  };

  /**
   * Handles the message received from the `/topic/public` WebSocket topic.
   * Parses the message body into a JSON object and handles different types of messages.
   *
   * @param {Stomp.Message} stompMessage - The message received from the WebSocket topic.
   */
  private handleTopicWebSocketMessage = (stompMessage: Stomp.Message): void => {
    const { body } = stompMessage!;

    const { type, sender, message } = JSON.parse(body);
    console.log(
      '%cReceived message:',
      'background: blue; color: white; padding: 5px',
      { type, sender, message }
    );

    const date = new Date();

    switch (type) {
      case 'JOIN': {
        this.onJoin({ sender, message, date });
        break;
      }
      case 'CHAT': {
        this.onChatMessage({ sender, message, date });
        break;
      }
      case 'LEAVE': {
        this.onLeave({ sender, message, date });
        break;
      }

      default:
        throw new Error(`Unknown type received: ${type}`);
    }
  };

  /**
   * Unsubscribes the client from the `/topic/public` topic.
   *
   * This function first checks if the client is initialized and connected to the server.
   * If the client is not initialized or not connected, it logs an error message and returns.
   * Otherwise, it unsubscribes the client from the `/topic/public` topic.
   *
   * @return {void} This function does not return anything.
   */
  private unsubscribeFromTopicWebSocket = (): void => {
    if (!this.stompClient || !this.connected) {
      console.error(
        'Cannot disconnect as Stomp client is not initialized or  client is not connected'
      );

      return;
    }

    this.stompClient.unsubscribe('/topic/public');
  };

  /**
   * Sends a chat message to the server.
   *
   * @param {string} sender - The sender of the message.
   * @param {string} message - The content of the message.
   * @return {void} This function does not return anything.
   */
  public sendMessage(sender: string, message: string): void {
    this.isClientInitializedAndConnected();

    this.stompClient!.send(
      '/app/chat.sendMessage',
      {},
      JSON.stringify({ message, sender, type: 'CHAT' })
    );
  }

  /**
   * Sends a request to add a user to the chat room.
   *
   * This function first checks if the client is initialized and connected to the server.
   * Then, it sends a JSON stringified message to the '/app/chat.addUser' endpoint with the
   * current user's nickname, the type 'JOIN', and an empty message.
   *
   * @return {void} This function does not return anything.
   */
  public addUser(): void {
    this.isClientInitializedAndConnected();

    this.stompClient!.send(
      '/app/chat.addUser',
      {},
      JSON.stringify({
        sender: this.currentUserNickname,
        type: 'JOIN',
        message: '',
      })
    );
  }
}
