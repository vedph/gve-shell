import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchOperationEditorComponent } from './batch-operation-editor.component';

describe('BatchOperationEditorComponent', () => {
  let component: BatchOperationEditorComponent;
  let fixture: ComponentFixture<BatchOperationEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchOperationEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BatchOperationEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
