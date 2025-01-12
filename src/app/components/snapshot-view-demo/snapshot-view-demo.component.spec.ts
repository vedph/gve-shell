import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { SnapshotViewDemoComponent } from './snapshot-view-demo.component';

describe('BaseTextDemoComponent', () => {
  let component: SnapshotViewDemoComponent;
  let fixture: ComponentFixture<SnapshotViewDemoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SnapshotViewDemoComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SnapshotViewDemoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
