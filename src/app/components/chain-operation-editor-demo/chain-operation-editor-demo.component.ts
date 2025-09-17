import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';

import {
  CharChainOperation,
  DEFAULT_SVG_BASE_TEXT_OPTIONS,
  OperationType,
  Snapshot,
} from '@myrmidon/gve-snapshot-view';

import { ChainOperationEditorComponent } from '@myrmidon/gve-core';

@Component({
  selector: 'app-chain-operation-editor-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatExpansionModule,
    ChainOperationEditorComponent,
  ],
  templateUrl: './chain-operation-editor-demo.component.html',
  styleUrl: './chain-operation-editor-demo.component.scss',
})
export class ChainOperationEditorDemoComponent {
  public readonly snapshot: Snapshot = {
    size: {
      width: 800,
      height: 300,
    },
    text: 'ABC',
    textOptions: DEFAULT_SVG_BASE_TEXT_OPTIONS,
    operations: [],
  };
  public readonly operation = signal<CharChainOperation>({
    id: '4f90d13a42',
    type: OperationType.replace,
    at: 1,
    run: 1,
    value: 'X',
    sources: [
      {
        id: 'A',
        type: 'ms',
        rank: 0,
        note: 'in rasura',
      },
    ],
    diplomatics: {
      g:
        '<g>\n' +
        '<circle id="my-circle" style="fill: red" cx="30" cy="30" r="30" opacity="0.5"/>\n' +
        '<rect id="my-rect" style="fill: green" x="40" y="40" width="20" height="15" />\n' +
        '</g>',
    },
  });
  public readonly codeVisible = signal<boolean>(false);

  public onOperationChange(operation: CharChainOperation): void {
    this.operation.set(operation);
    this.codeVisible.set(true);
  }
}
