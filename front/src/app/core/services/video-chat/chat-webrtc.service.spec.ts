import { TestBed } from '@angular/core/testing';

import { ChatWebRtcService } from './chat-webrtc.service';

describe('ChatWebrtcService', () => {
  let service: ChatWebRtcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChatWebRtcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
