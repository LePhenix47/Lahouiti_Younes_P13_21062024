import { TestBed } from '@angular/core/testing';

import { MediaDisplayModeService } from './media-display-mode.service';

describe('MediaDisplayModeService', () => {
  let service: MediaDisplayModeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MediaDisplayModeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
