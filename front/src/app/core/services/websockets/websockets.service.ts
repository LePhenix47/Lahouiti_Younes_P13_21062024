import { Injectable } from '@angular/core';
import Stomp, { Frame } from 'stompjs';
import SockJS from 'sockjs-client';
import { environment } from '@environments/environment';

/**
 * A base service class for interacting with websockets.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class WebSocketsService {
  protected readonly serverUrl: URL = new URL(
    `http://${environment.baseUrl}/ws`
  );

  protected stompClient!: Stomp.Client;

  /**
   * Establishes a WebSocket connection to the server and invokes the callback when connected.
   *
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public connect(): void {
    console.log('Connecting WebSocketsService...', WebSocketsService);

    this.initializeWebSocketConnection();

    this.stompClient.connect({}, this.handleOnConnect, this.handleOnError);
  }

  /**
   * Initializes the WebSocket connection.
   */
  public initializeWebSocketConnection = () => {
    try {
      if (this.stompClient) {
        throw new Error('WebSockets are already initialized');
      }

      const socket: WebSocket = new SockJS(this.serverUrl.href);
      this.stompClient = Stomp.over(socket);
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  };

  /**
   * Handles the connection with the server.
   */
  protected abstract handleOnConnect(frame: Frame | undefined): void;

  /**
   * Handles errors that occur during the connection.
   */
  protected abstract handleOnError(error: string | Frame): void;

  /**
   * Handles disconnecting from the server.
   */
  protected abstract handleOnDisconnect(): void;

  /**
   * Disconnects the WebSocket client.
   *
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public disconnect(): void {
    if (!this.stompClient) {
      throw new Error('Stomp client not initialized');
    }

    this.stompClient.disconnect(this.handleOnDisconnect);
  }
}
