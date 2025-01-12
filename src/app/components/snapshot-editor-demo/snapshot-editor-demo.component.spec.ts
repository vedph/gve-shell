import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnapshotEditorDemoComponent } from './snapshot-editor-demo.component';

describe('TextSnapshotEditorDemoComponent', () => {
  let component: SnapshotEditorDemoComponent;
  let fixture: ComponentFixture<SnapshotEditorDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnapshotEditorDemoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SnapshotEditorDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
