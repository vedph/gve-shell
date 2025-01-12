import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseTextViewComponent } from './base-text-view.component';

describe('VarBaseTextComponent', () => {
  let component: BaseTextViewComponent;
  let fixture: ComponentFixture<BaseTextViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTextViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseTextViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
