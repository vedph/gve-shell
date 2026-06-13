import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { GveApiService } from './gve-api.service';

describe('GveApiService', () => {
  let service: GveApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClientTesting()],
    });
    service = TestBed.inject(GveApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
