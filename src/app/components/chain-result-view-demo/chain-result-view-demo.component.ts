import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';

import { AssetService } from '../../services/asset.service';
import {
  ChainOperationContextStep,
  ChainResultViewComponent,
  CharChainResult,
} from '@myrmidon/gve-core';

@Component({
  selector: 'app-chain-result-view-demo',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    ChainResultViewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './chain-result-view-demo.component.html',
  styleUrl: './chain-result-view-demo.component.scss',
})
export class ChainResultViewDemoComponent {
  public readonly result = signal<CharChainResult | undefined>(undefined);
  public readonly step = signal<ChainOperationContextStep | undefined>(
    undefined
  );
  public readonly initialStepIndex = signal<number>(-1); // last step

  constructor() {
    inject(AssetService)
      .loadText('arzdc-result.json')
      .subscribe((text) => {
        this.result.set(JSON.parse(text));
      });
  }

  public onStepPick(step: ChainOperationContextStep): void {
    this.step.set(step);
    console.log('Step picked:', step);
  }
}
