import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChainResultViewDemoComponent } from './chain-result-view-demo.component';

describe('ChainResultViewDemoComponent', () => {
  let component: ChainResultViewDemoComponent;
  let fixture: ComponentFixture<ChainResultViewDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChainResultViewDemoComponent]
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
