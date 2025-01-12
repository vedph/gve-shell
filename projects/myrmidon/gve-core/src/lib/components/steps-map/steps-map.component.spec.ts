import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsMapComponent } from './steps-map.component';

describe('StepsMapComponent', () => {
  let component: StepsMapComponent;
  let fixture: ComponentFixture<StepsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepsMapComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(StepsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
