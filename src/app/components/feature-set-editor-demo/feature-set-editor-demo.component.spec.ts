import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FeatureSetEditorDemoComponent } from './feature-set-editor-demo.component';

describe('FeatureSetEditorDemoComponent', () => {
  let component: FeatureSetEditorDemoComponent;
  let fixture: ComponentFixture<FeatureSetEditorDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureSetEditorDemoComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureSetEditorDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
