import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperationSourceEditorComponent } from './operation-source-editor.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('VarSourceEditorComponent', () => {
  let component: OperationSourceEditorComponent;
  let fixture: ComponentFixture<OperationSourceEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, OperationSourceEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(OperationSourceEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
