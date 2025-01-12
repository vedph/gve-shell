import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SnapshotTextEditorComponent } from './snapshot-text-editor.component';

describe('SnapshotTextEditorComponent', () => {
  let component: SnapshotTextEditorComponent;
  let fixture: ComponentFixture<SnapshotTextEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnapshotTextEditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SnapshotTextEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
