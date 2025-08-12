import { TestBed } from '@angular/core/testing';

import { BboxService } from './bbox.service';

describe('BboxService', () => {
  let service: BboxService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BboxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
