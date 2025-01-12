import {
  Component,
  computed,
  effect,
  input,
  model,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';

import { VizComponent } from '@myrmidon/ngx-viz';

import {
  GraphvizRankdir,
  GveGraphvizService,
} from '../../services/gve-graphviz.service';
import { CharChain } from '../../services/gve-api.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'gve-chain-view',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    VizComponent,
  ],
  templateUrl: './chain-view.component.html',
  styleUrl: './chain-view.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChainViewComponent implements OnDestroy {
  private readonly _sub?: Subscription;

  /**
   * The chain to display.
   */
  public readonly chain = input<CharChain | undefined>();

  /**
   * The direction of the graph.
   */
  public readonly direction = input<GraphvizRankdir>('LR');

  /**
   * All the distinct tags in the chain.
   */
  public readonly tags = computed(() => {
    const chain = this.chain();
    if (!chain) {
      return [];
    }
    const set = new Set<string>();
    for (const link of chain.links) {
      set.add(link.tag);
    }
    return Array.from(set).sort();
  });

  /**
   * The tags to show, or empty to show all of them.
   */
  public readonly selectedTags = model<string[]>([]);

  /**
   * The Graphviz representation of the chain.
   */
  public readonly graph = computed(() => {
    let tags: string[] | undefined = this.selectedTags();
    if (tags && tags.length === 0) {
      tags = undefined;
    }
    return this._graphviz.generateGraph(this.chain(), tags, this.direction());
  });

  public userTags: FormControl<string[]> = new FormControl([], {
    nonNullable: true,
  });

  constructor(
    private _graphviz: GveGraphvizService,
    private _settings: SettingsService,
    private _clipboard: Clipboard,
    private _snackbar: MatSnackBar
  ) {
    // when the user changes the tags, update the selected tags
    this._sub = this.userTags.valueChanges.subscribe((value: string[]) => {
      this.selectedTags.set([...value]);
    });

    effect(() => {
      // update the user tags when tags change
      const tags = this.tags();
      let userTags: string[] = [];
      if (tags.length > 1) {
        // pick first and last tag from tags
        userTags = [tags[0], tags[tags.length - 1]];
      } else {
        // if there is only one tag, pick it
        userTags = [...tags];
      }
      this.userTags.setValue(userTags);
    });
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public copyGraph(): void {
    const graph = this.graph();
    if (!graph) {
      return;
    }
    this._clipboard.copy(graph);
    this._snackbar.open('Graph copied to clipboard', 'OK', {
      duration: 2000,
    });
  }

  public openExternalEditor(): void {
    let url = this._settings.get<string>(
      'graphviz-editor',
      'https://dreampuf.github.io/GraphvizOnline?engine=dot#CODE'
    );
    if (!url) {
      return;
    }
    const graph = this.graph();
    if (!graph) {
      return;
    }
    if (url.indexOf('CODE') > -1) {
      url = url.replace('CODE', encodeURIComponent(graph));
    }
    window.open(url, '_blank');
  }
}
