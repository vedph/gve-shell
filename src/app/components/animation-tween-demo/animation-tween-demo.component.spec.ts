import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnimationTweenDemoComponent } from './animation-tween-demo.component';

describe('AnimationTweenDemoComponent', () => {
  let component: AnimationTweenDemoComponent;
  let fixture: ComponentFixture<AnimationTweenDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationTweenDemoComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationTweenDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
