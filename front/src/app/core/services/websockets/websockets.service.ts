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

      this.socketio.on('test.sendMessage', () => {
        console.log('Connected to WS');
        this.handleOnConnect(); // Call abstract method when connected
      });

      this.socketio.emit('test.sendMessage', 'test');

      this.socketio.on('connect', () => {
        console.log('Connected to WS');
        this.handleOnConnect(); // Call abstract method when connected
      });

      this.socketio.on('disconnect', () => {
        console.log('Disconnected from WS');
        this.handleOnDisconnect(); // Call abstract method when disconnected
      });

      this.socketio.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        this.handleOnError(error); // Call abstract method on error
      });
    } catch (error) {
      console.error(error);
      this.handleOnError(error);
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
      this.handleOnError(error);
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
  protected abstract handleOnConnect(): void;

  /**
   * Handles errors that occur during the connection.
   */
  protected abstract handleOnError(error: any): void;

  /**
   * Handles disconnecting from the server.
   */
  protected abstract handleOnDisconnect(): void;
}
