import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';
import {
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';

import {
  ChainOperationEditorComponent,
  CharChainOperation,
  FeatureDefinitions,
  OperationType,
  Snapshot,
} from '@myrmidon/gve-core';

@Component({
  selector: 'app-chain-operation-editor-demo',
  imports: [
    JsonPipe,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    ChainOperationEditorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chain-operation-editor-demo.component.html',
  styleUrl: './chain-operation-editor-demo.component.scss',
})
export class ChainOperationEditorDemoComponent {
  public readonly snapshot: Snapshot = {
    text: 'ABC',
    operations: [],
  };
  public readonly featureDefs: FeatureDefinitions = {
    names: [
      {
        id: 'clr',
        label: 'color',
      },
      {
        id: 'sz',
        label: 'size',
      },
    ],
    values: {
      clr: [
        {
          id: 'r',
          label: 'red',
        },
        {
          id: 'g',
          label: 'green',
        },
        {
          id: 'b',
          label: 'blue',
        },
      ],
    },
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
  });
  public readonly codeVisible = signal<boolean>(false);

  public onOperationChange(operation: CharChainOperation): void {
    this.operation.set(operation);
    this.codeVisible.set(true);
  }
}
