import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ChainViewComponent } from './chain-view.component';

describe('ChainViewComponent', () => {
  let component: ChainViewComponent;
  let fixture: ComponentFixture<ChainViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChainViewComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(ChainViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
