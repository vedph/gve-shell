import { TestBed } from '@angular/core/testing';

import { GveGraphvizService } from './gve-graphviz.service';

describe('GveGraphvizService', () => {
  let service: GveGraphvizService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GveGraphvizService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
