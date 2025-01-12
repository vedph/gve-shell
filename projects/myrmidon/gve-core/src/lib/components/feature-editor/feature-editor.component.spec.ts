import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureEditorComponent } from './feature-editor.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('FeatureEditorComponent', () => {
  let component: FeatureEditorComponent;
  let fixture: ComponentFixture<FeatureEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, FeatureEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
