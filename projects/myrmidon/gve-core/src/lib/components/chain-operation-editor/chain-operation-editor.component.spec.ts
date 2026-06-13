import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChainOperationEditorComponent } from './chain-operation-editor.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('VarOperationEditorComponent', () => {
  let component: ChainOperationEditorComponent;
  let fixture: ComponentFixture<ChainOperationEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, ChainOperationEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChainOperationEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
