import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChainOperationEditorDemoComponent } from './chain-operation-editor-demo.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NgeMonacoModule } from '@cisstech/nge/monaco';
import { importProvidersFrom } from '@angular/core';

describe('VarOperationEditorDemoComponent', () => {
  let component: ChainOperationEditorDemoComponent;
  let fixture: ComponentFixture<ChainOperationEditorDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ChainOperationEditorDemoComponent,
        NgeMonacoModule,
      ],
      providers: [importProvidersFrom(NgeMonacoModule.forRoot({}))],
    }).compileComponents();

    fixture = TestBed.createComponent(ChainOperationEditorDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
