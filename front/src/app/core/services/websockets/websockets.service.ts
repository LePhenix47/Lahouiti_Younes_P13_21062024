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
    environment.webSocketsUrl // * localhost:3000
  );

  protected socketio: Socket | null = null;

  protected ownUsername: string | null = null;

  public setOwnUsername = (ownUsername: string): void => {
    this.ownUsername = ownUsername;
  };

  /**
   * Establishes a WebSocket connection to the server and invokes the callback when connected.
   *
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public connect = (): void => {
    try {
      if (!this.ownUsername) {
        throw new Error('No username provided');
      }

      const socket: Socket = io(this.serverUrl.href, {
        auth: {
          userName: this.ownUsername,
        },
      });

      this.socketio = socket;

      this.socketio.emit('test', 'test (client)');
      this.socketio.on('test', (msg) => {
        console.log('TEST response from server:', msg);
      });

      this.socketio.on('connect', () => {
        this.handleOnConnect(); // Call abstract method when connected
      });

      this.socketio.on('disconnect', () => {
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
      throw new Error('Cannot disconnect as socket.io is not initialized');
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
  public getSocketObject(): Socket | null {
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
