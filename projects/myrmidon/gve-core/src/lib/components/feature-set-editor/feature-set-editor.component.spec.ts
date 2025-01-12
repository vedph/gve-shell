import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureSetEditorComponent } from './feature-set-editor.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('FeatureSetEditorComponent', () => {
  let component: FeatureSetEditorComponent;
  let fixture: ComponentFixture<FeatureSetEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FeatureSetEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureSetEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
