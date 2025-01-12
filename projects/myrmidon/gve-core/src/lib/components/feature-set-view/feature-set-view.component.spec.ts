import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FeatureSetViewComponent } from './feature-set-view.component';

describe('FeatureSetViewComponent', () => {
  let component: FeatureSetViewComponent;
  let fixture: ComponentFixture<FeatureSetViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureSetViewComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeatureSetViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
