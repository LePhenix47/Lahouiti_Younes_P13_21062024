import { TestBed } from '@angular/core/testing';

import { ChatWebsocketsService } from './chat-websockets.service';

describe('ChatWebsocketsService', () => {
  let service: ChatWebsocketsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatWebsocketsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
