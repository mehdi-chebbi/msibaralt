import { TestBed } from '@angular/core/testing';

import { BaseMapService } from './base-map.service';

describe('BaseMapService', () => {
  let service: BaseMapService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseMapService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
