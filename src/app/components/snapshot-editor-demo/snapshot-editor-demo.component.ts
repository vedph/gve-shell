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

import {
  FeatureDefinitions,
  Snapshot,
  SnapshotEditorComponent,
} from '@myrmidon/gve-core';
import {
  DEFAULT_SETTINGS,
  GveRenditionSettings,
} from '@myrmidon/gve-snapshot-rendition';

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
  public readonly settings = signal<GveRenditionSettings>(DEFAULT_SETTINGS);
  public readonly featureDefs = signal<FeatureDefinitions>({
    names: [
      {
        id: 'r_char-offsets',
        label: 'char offsets',
      },
      {
        id: 'r_char-offset',
        label: 'char offset',
      },
      {
        id: 'r_font-family',
        label: 'font family',
      },
      {
        id: 'r_font-size',
        label: 'font size',
      },
      {
        id: 'r_fore-color',
        label: 'foreground color',
      },
      {
        id: 'r_back-color',
        label: 'background color',
      },
      {
        id: 'r_italic',
        label: 'italic',
      },
      {
        id: 'r_bold',
        label: 'bold',
      },
      {
        id: 'r_underline',
        label: 'underline',
      },
      {
        id: 'r_overline',
        label: 'overline',
      },
      {
        id: 'r_strike',
        label: 'strikethrough',
      },
      {
        id: 'r_text-line-style',
        label: 'text line style',
      },
      {
        id: 'r_text-line-color',
        label: 'text line color',
      },
      {
        id: 'r_rotate',
        label: 'rotation',
      },
      {
        id: 'r_hints',
        label: 'hints',
      },
      {
        id: 'r_hint-vars',
        label: 'hint variables',
      },
      {
        id: 'r_t-position',
        label: 'position',
      },
      {
        id: 'r_t-offset-x',
        label: 'X offset',
      },
      {
        id: 'r_t-offset-y',
        label: 'Y offset',
      },
      {
        id: 'r_t-solid',
        label: 'solid',
      },
      {
        id: 'r_t-displaced-span',
        label: 'displaced text span',
      },
      {
        id: 'r_t-label',
        label: 'overridden text label',
      },
      {
        id: 'r_h-position',
        label: 'hint position',
      },
      {
        id: 'r_h-offset-x',
        label: 'hint X offset',
      },
      {
        id: 'r_h-offset-y',
        label: 'hint Y offset',
      },
      {
        id: 'r_h-scale-x',
        label: 'hint X scale',
      },
      {
        id: 'r_h-scale-y',
        label: 'hint Y scale',
      },
      {
        id: 'r_h-rotation',
        label: 'hint rotation',
      },
      {
        id: 'r_h-solid',
        label: 'solid hint',
      },
      {
        id: 'r_h-displaced-span',
        label: 'displaced hint span',
      },
      {
        id: 'epigram-nr',
        label: 'epigram number',
      },
      {
        id: 'page-nr',
        label: 'page number',
      },
      {
        id: 'page-beg',
        label: 'page beginning',
      },
      {
        id: 'reason',
        label: 'reason',
      },
      {
        id: 'immediate',
        label: 'immediate',
      },
      {
        id: 'comment',
        label: 'comment',
      },
      {
        id: 'log',
        label: 'log',
      },
      {
        id: 'note',
        label: 'note',
      },
      {
        id: 'parallel',
        label: 'parallel version',
      },
      {
        id: 'version',
        label: 'stage name',
      },
    ],
    values: {
      'page-beg': [{ id: '1', label: '1' }],
      'r_fore-color': [
        { id: 'black', label: 'black' },
        { id: 'dark-brown', label: 'dark brown' },
      ],
    },
  });

  public debug: FormControl<boolean> = new FormControl(true, {
    nonNullable: true,
  });

  constructor(private _asset: AssetService) {}

  public ngOnInit(): void {
    // load settings
    this._asset
      .loadObject<GveRenditionSettings>('rendition-settings')
      .subscribe((settings) => {
        this.settings.set(settings);
      });
    // load snapshot data
    this._asset.loadObject<Snapshot>('h5-48').subscribe((snapshot) => {
      this.snapshot.set(snapshot);
    });
  }

  public onSnapshotChange(snapshot: Snapshot): void {
    this.snapshot.set(snapshot);
    console.log('Snapshot change:', snapshot);
  }
}
