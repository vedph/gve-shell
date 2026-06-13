import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ChainResultViewDemoComponent } from './chain-result-view-demo.component';

describe('ChainResultViewDemoComponent', () => {
  let component: ChainResultViewDemoComponent;
  let fixture: ComponentFixture<ChainResultViewDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChainResultViewDemoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChainResultViewDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
