import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { BaseTextPeepholeDemoComponent } from './base-text-peephole-demo.component';

describe('BaseTextPeepholeDemoComponent', () => {
  let component: BaseTextPeepholeDemoComponent;
  let fixture: ComponentFixture<BaseTextPeepholeDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTextPeepholeDemoComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseTextPeepholeDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
