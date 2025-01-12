import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FeatureEditorDemoComponent } from './feature-editor-demo.component';

describe('FeatureEditorDemoComponent', () => {
  let component: FeatureEditorDemoComponent;
  let fixture: ComponentFixture<FeatureEditorDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureEditorDemoComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureEditorDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
