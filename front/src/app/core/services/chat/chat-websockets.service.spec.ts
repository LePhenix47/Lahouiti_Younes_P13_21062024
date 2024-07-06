import { TestBed } from '@angular/core/testing';

import { ChatWebSocketsService } from './chat-websockets.service';

describe('ChatWebsocketsService', () => {
  let service: ChatWebSocketsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatWebSocketsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
