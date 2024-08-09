import { TestBed } from '@angular/core/testing';

import { VolumeMeterService } from './volume-meter.service';

describe('VolumeMeterService', () => {
  let service: VolumeMeterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VolumeMeterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
