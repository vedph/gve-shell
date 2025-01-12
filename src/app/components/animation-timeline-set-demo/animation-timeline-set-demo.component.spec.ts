import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnimationTimelineSetDemoComponent } from './animation-timeline-set-demo.component';

describe('AnimationTimelineSetDemoComponent', () => {
  let component: AnimationTimelineSetDemoComponent;
  let fixture: ComponentFixture<AnimationTimelineSetDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationTimelineSetDemoComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationTimelineSetDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
