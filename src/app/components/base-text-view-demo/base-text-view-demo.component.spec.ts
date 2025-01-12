import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { BaseTextViewDemoComponent } from './base-text-view-demo.component';

describe('VarBaseTextDemoComponent', () => {
  let component: BaseTextViewDemoComponent;
  let fixture: ComponentFixture<BaseTextViewDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BaseTextViewDemoComponent, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BaseTextViewDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
