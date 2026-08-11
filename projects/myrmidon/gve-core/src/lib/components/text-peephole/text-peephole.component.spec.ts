import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TextPeepholeComponent } from './text-peephole.component';

describe('TextPeepholeComponent', () => {
  let component: TextPeepholeComponent;
  let fixture: ComponentFixture<TextPeepholeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TextPeepholeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TextPeepholeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
