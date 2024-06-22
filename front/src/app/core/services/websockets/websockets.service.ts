import { Injectable } from '@angular/core';

import Stomp from 'stompjs';
import SockJS from 'sockjs-client';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root',
})
export class WebSocketsService {
  private readonly serverUrl: string = `${environment.baseUrl}/ws`;
  public stompClient!: Stomp.Client;

  public connect(callback: (frame: Stomp.Frame | undefined) => any): void {
    const socket: WebSocket = new SockJS(this.serverUrl);
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect({}, (frame: Stomp.Frame | undefined) => {
      console.log('Connected: ' + frame);

      callback(frame);

      this.stompClient.subscribe('/topic/chat', (message) => {
        console.log('Message: ' + message.body);
        // Handle incoming messages here
      });
    });
  }

  public disconnect(): void {
    if (!this.stompClient) {
      throw new Error('Stomp client not initialized');
    }

    this.stompClient.disconnect(() => {
      console.log('Disconnected!');
    });
  }

  public sendMessage(message: string): void {
    this.stompClient.send('/app/send/message', {}, message);
  }
}
