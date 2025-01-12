import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnapshotEditorComponent } from './snapshot-editor.component';

describe('TextSnapshotEditorComponent', () => {
  let component: SnapshotEditorComponent;
  let fixture: ComponentFixture<SnapshotEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnapshotEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SnapshotEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
