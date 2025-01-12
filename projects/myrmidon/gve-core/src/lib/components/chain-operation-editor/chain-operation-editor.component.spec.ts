import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChainOperationEditorComponent } from './chain-operation-editor.component';
import {
  MonacoEditorModule,
  NGX_MONACO_EDITOR_CONFIG,
} from 'ngx-monaco-editor-v2';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('VarOperationEditorComponent', () => {
  let component: ChainOperationEditorComponent;
  let fixture: ComponentFixture<ChainOperationEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ChainOperationEditorComponent,
        MonacoEditorModule.forRoot(),
      ],
      providers: [
        { provide: NGX_MONACO_EDITOR_CONFIG, useValue: {} }, // provide a value for NGX_MONACO_EDITOR_CONFIG
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ChainOperationEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
