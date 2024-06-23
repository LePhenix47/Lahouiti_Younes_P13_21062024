import { Injectable } from '@angular/core';
import Stomp, { Frame, Message, over } from 'stompjs';
import SockJS from 'sockjs-client';
import { environment } from '@environments/environment';

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
   * @param callback - The callback function to be invoked when the connection is established.
   * @throws {Error} - If the WebSocket client is not initialized.
   */
  public connect(): void {
    try {
      const socket: WebSocket = new SockJS(this.serverUrl.href);
      this.stompClient = Stomp.over(socket);

      this.stompClient.connect({}, this.handleOnConnect, this.handleOnError);
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }

  protected abstract handleOnConnect(frame: Frame | undefined): void;

  protected abstract handleOnError(error: string | Frame): void;

  protected abstract handleOnDisconnect(): void;

  public disconnect(): void {
    if (!this.stompClient) {
      throw new Error('Stomp client not initialized');
    }

    this.stompClient.disconnect(this.handleOnDisconnect);
  }
}
