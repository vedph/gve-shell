import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { GveVisualEvent, Snapshot } from '@myrmidon/gve-snapshot-view';

import { SnapshotEditorComponent } from '../../../../projects/myrmidon/gve-core/src/lib/components/snapshot-editor/snapshot-editor.component';
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
  public snapshot?: Snapshot;
  public debug: FormControl<boolean> = new FormControl(false, {
    nonNullable: true,
  });
  // public batchOps: string =
  //   '3- [*log="delete Z" reason="don\'t like Z"]\n' +
  //   '2=V [*log="replace R with V" *version^:=alpha]\n' +
  //   '6=B [*log="replace V with B" reason="like B"]\n' +
  //   '(v1:) 2=P [*log="replace R with P" *version^:=beta]\n' +
  //   '(v3:) 4<>5 [*version^:=gamma]';

  constructor(private _asset: AssetService) {}

  public ngOnInit(): void {
    this._asset.loadObject<Snapshot>('arzdc').subscribe((snapshot) => {
      this.snapshot = snapshot;
    });
  }

  public onSnapshotChange(snapshot?: Snapshot): void {
    this.snapshot = snapshot!;
    console.log('Snapshot change:', snapshot);
  }

  public onVisualEvent(event: GveVisualEvent): void {
    console.log('Visual event:', event);
  }
}
