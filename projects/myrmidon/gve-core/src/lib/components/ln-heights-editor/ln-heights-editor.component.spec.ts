import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LnHeightsEditorComponent } from './ln-heights-editor.component';

describe('LnHeightsEditorComponent', () => {
  let component: LnHeightsEditorComponent;
  let fixture: ComponentFixture<LnHeightsEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LnHeightsEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LnHeightsEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
