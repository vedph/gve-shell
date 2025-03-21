import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { BaseTextEditorComponent } from './base-text-editor.component';

describe('BaseTextEditorComponent', () => {
  let component: BaseTextEditorComponent;
  let fixture: ComponentFixture<BaseTextEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTextEditorComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseTextEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('text', 'Sample text for testing');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
