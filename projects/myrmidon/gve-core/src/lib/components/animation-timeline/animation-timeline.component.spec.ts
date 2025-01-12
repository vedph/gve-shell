import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnimationTimelineComponent } from './animation-timeline.component';

describe('AnimationTimelineComponent', () => {
  let component: AnimationTimelineComponent;
  let fixture: ComponentFixture<AnimationTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationTimelineComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
