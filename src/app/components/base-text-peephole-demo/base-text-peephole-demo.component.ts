import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { form, FormField, min } from '@angular/forms/signals';

import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  TextPeepholeComponent,
  CharNode,
  GveBaseTextService,
  OpTextRange,
} from '@myrmidon/gve-core';

const SAMPLE_TEXT =
  'there was an old man with a beard\n' +
  'who cried: "It is just as I feared!\n' +
  'four larks and a wren,\n' +
  'two swans and a hen,\n' +
  'all built their nests in my beard!';

@Component({
  selector: 'app-base-text-peephole-demo',
  imports: [
    FormField,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    TextPeepholeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './base-text-peephole-demo.component.html',
  styleUrl: './base-text-peephole-demo.component.scss',
})
export class BaseTextPeepholeDemoComponent {
  public readonly form = form(
    signal({
      text: SAMPLE_TEXT,
      at: 1 as number | null,
      run: 1 as number | null,
      atAsIndex: false,
      windowWidth: 15 as number | null,
      emSize: 1 as number | null,
    }),
    (path) => {
      min(path.at, 0);
      min(path.run, 0);
      min(path.windowWidth, 1);
      min(path.emSize, 0.5);
    },
  );

  public readonly nodes = computed<CharNode[]>(() => {
    const text = this.form.text().value();
    return text ? GveBaseTextService.stringToBaseChars(text) : [];
  });
  public readonly selectedRange = computed<OpTextRange>(() => ({
    at: this.form.at().value() ?? 0,
    run: this.form.run().value() ?? 0,
    atAsIndex: this.form.atAsIndex().value(),
  }));
  public readonly windowWidthValue = computed(
    () => this.form.windowWidth().value() ?? 15,
  );
  public readonly emSizeValue = computed(() => this.form.emSize().value() ?? 1);
}
