import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { BaseTextCharComponent } from './base-text-char.component';

describe('VarBaseTextCharComponent', () => {
  let component: BaseTextCharComponent;
  let fixture: ComponentFixture<BaseTextCharComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTextCharComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseTextCharComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
