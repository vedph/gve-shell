import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AnimationTweenComponent } from './animation-tween.component';

describe('AnimationTweenComponent', () => {
  let component: AnimationTweenComponent;
  let fixture: ComponentFixture<AnimationTweenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnimationTweenComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnimationTweenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
