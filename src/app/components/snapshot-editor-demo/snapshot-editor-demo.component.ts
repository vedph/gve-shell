import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Snapshot, SnapshotEditorComponent } from '@myrmidon/gve-core';

import { AssetService } from '../../services/asset.service';

@Component({
  selector: 'app-snapshot-editor-demo',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatTooltipModule,
    SnapshotEditorComponent,
  ],
  templateUrl: './snapshot-editor-demo.component.html',
  styleUrl: './snapshot-editor-demo.component.scss',
})
export class SnapshotEditorDemoComponent implements OnInit {
  public readonly snapshot = signal<Snapshot | undefined>(undefined);

  public debug: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });

  constructor(private _asset: AssetService) {}

  public ngOnInit(): void {
    this._asset.loadObject<Snapshot>('test').subscribe((snapshot) => {
      this.snapshot.set(snapshot);
    });
  }

  public onSnapshotChange(snapshot: Snapshot): void {
    this.snapshot.set(snapshot);
    console.log('Snapshot change:', snapshot);
  }
}
