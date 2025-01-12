import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnimationTimelineDemoComponent } from './animation-timeline-demo.component';

describe('AnimationTimelineDemoComponent', () => {
  let component: AnimationTimelineDemoComponent;
  let fixture: ComponentFixture<AnimationTimelineDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationTimelineDemoComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationTimelineDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
