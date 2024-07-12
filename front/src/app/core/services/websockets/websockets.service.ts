import { Injectable } from '@angular/core';
import { environment } from '@environments/environment';
import { io, Socket } from 'socket.io-client';

/**
 * A base service class for interacting with websockets.
 */
@Injectable({
  providedIn: 'root',
})
export abstract class WebSocketsService {
  protected readonly serverUrl: URL = new URL(
    `http://${environment.webSocketsUrl}` // * localhost:3002
  );

  protected socketio: Socket | null = null;

  /**
   * Establishes a WebSocket connection to the server and invokes the callback when connected.
   *
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public connect = (): void => {
    try {
      console.log(
        '%cConnecting to WebSocket on server...',
        'background: teal; color: white; padding: 5px; font: 1em'
      );

      const socket: Socket = io(this.serverUrl);
      this.socketio = socket;

      this.socketio!.on('connect', () => {
        console.log('Connecting to WS');
      });
    } catch (error) {
      console.error(error);
    }
  };

  /**
   * Initializes the WebSocket connection.
   */
  public initializeWebSocketConnection = () => {
    try {
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleOnError('WebSocket connection error: ' + error);
    }
  };

  /**
   * Disconnects the WebSocket client.
   *
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public disconnect = (): void => {
    try {
      this.checkSocket();

      this.socketio!.disconnect();

      this.resetSocketIO();
    } catch (error) {
      console.error(error);
    }
  };

  protected checkSocket = () => {
    if (!this.socketio) {
      throw new Error('Cannot disconnect as Stomp client is not initialized');
    }
  };

  /**
   * Resets the Stomp client by setting it to `null` in order for the user to re-enter at later if they re-connect
   */
  private resetSocketIO = (): void => {
    this.socketio = null;
  };

  /**
   * Returns the Stomp.Client instance used for the websocket connection.
   *
   */
  public getStompClient(): Socket | null {
    return this.socketio;
  }

  /**
   * Handles the connection with the server.
   */
  protected abstract handleOnConnect(frame: any): void;

  /**
   * Handles errors that occur during the connection.
   */
  protected abstract handleOnError(error: any): void;

  /**
   * Handles disconnecting from the server.
   */
  protected abstract handleOnDisconnect(): void;
}
