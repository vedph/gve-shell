import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnimationTimelineSetComponent } from './animation-timeline-set.component';

describe('AnimationTimelineSetComponent', () => {
  let component: AnimationTimelineSetComponent;
  let fixture: ComponentFixture<AnimationTimelineSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationTimelineSetComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationTimelineSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
