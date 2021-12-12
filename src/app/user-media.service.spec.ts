import { TestBed } from '@angular/core/testing';

import { UserMediaService } from './user-media.service';

describe('UserMediaService', () => {
  let service: UserMediaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserMediaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
