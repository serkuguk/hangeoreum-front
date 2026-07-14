import { TestBed } from '@angular/core/testing';

import { AutoMapperService } from './automapper';

describe('Automapper', () => {
  let service: AutoMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AutoMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
