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

  protected stompClient!: Stomp.Client | null;

  /**
   * Establishes a WebSocket connection to the server and invokes the callback when connected.
   *
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public connect = (): void => {
    try {
      this.initializeWebSocketConnection();

      console.log(
        '%cConnecting to WebSocket on server...',
        'background: teal; color: white; padding: 5px; font: 1em'
      );
      this.stompClient!.connect({}, this.handleOnConnect, this.handleOnError);
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Initializes the WebSocket connection.
   */
  public initializeWebSocketConnection = () => {
    try {
      const socket: WebSocket = new SockJS(this.serverUrl.href);
      this.stompClient = Stomp.over(socket);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleOnError('WebSocket connection error: ' + error);
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
  public disconnect = (): void => {
    try {
      if (!this.stompClient) {
        throw new Error('Cannot disconnect as Stomp client is not initialized');
      }

      this.stompClient.disconnect(this.handleOnDisconnect);

      this.resetStompClient();
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Resets the Stomp client by setting it to `null` in order for the user to re-enter at later if they re-connect
   */
  private resetStompClient = (): void => {
    this.stompClient = null;
  };

  /**
   * Returns the Stomp.Client instance used for the websocket connection.
   *
   * @return {Stomp.Client | null} The Stomp.Client instance or null if not initialized.
   */
  public getStompClient(): Stomp.Client | null {
    return this.stompClient;
  }
}
