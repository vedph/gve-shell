import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BaseTextPeepholeComponent } from './base-text-peephole.component';

describe('BaseTextPeepholeComponent', () => {
  let component: BaseTextPeepholeComponent;
  let fixture: ComponentFixture<BaseTextPeepholeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTextPeepholeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseTextPeepholeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
