import { TestBed } from '@angular/core/testing';

import { CheckUsernameService } from './check-username.service';

describe('CheckUsernameService', () => {
  let service: CheckUsernameService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckUsernameService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
