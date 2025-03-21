import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { AssetService } from '../../services/asset.service';
import {
  ChainOperationContextStep,
  ChainResultViewComponent,
  CharChainResult,
} from '../../../../projects/myrmidon/gve-core/src/public-api';

@Component({
  selector: 'app-chain-result-view-demo',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    ChainResultViewComponent,
  ],
  templateUrl: './chain-result-view-demo.component.html',
  styleUrl: './chain-result-view-demo.component.scss',
})
export class ChainResultViewDemoComponent {
  public result?: CharChainResult;
  public step?: ChainOperationContextStep;

  constructor(asset: AssetService) {
    asset.loadText('arzdc-result.json').subscribe((text) => {
      this.result = JSON.parse(text);
    });
  }

  public onStepPick(step: ChainOperationContextStep): void {
    console.log('Step picked:', step);
  }
}
