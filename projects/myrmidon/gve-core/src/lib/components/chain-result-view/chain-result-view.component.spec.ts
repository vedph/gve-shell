import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ChainResultViewComponent } from './chain-result-view.component';

describe('ChainResultViewComponent', () => {
  let component: ChainResultViewComponent;
  let fixture: ComponentFixture<ChainResultViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChainResultViewComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChainResultViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
