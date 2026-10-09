import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import {
  BaseTextCharEvent,
  BaseTextViewComponent,
  CharNode,
  BaseTextRange,
  GveBaseTextService,
} from '@myrmidon/gve-core';

const SAMPLE_TEXT =
  'there was an old man with a beard\n' +
  'who cried: "It is just as I feared!\n' +
  'four larks and a wren,\n' +
  'two swans and a hen,\n' +
  'all built their nests in my beard!';

@Component({
  selector: 'app-var-base-text-view-demo',
  imports: [
    FormField,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    BaseTextViewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './base-text-view-demo.component.html',
  styleUrl: './base-text-view-demo.component.scss',
})
export class BaseTextViewDemoComponent {
  public readonly form = form(signal({ text: SAMPLE_TEXT }));

  public readonly range = signal<BaseTextRange | undefined>(undefined);
  public readonly nodes = computed<CharNode[]>(() => {
    const text = this.form.text().value();
    return text ? GveBaseTextService.stringToBaseChars(text) : [];
  });

  public onCharPick(event: BaseTextCharEvent): void {
    console.log('Char picked:', event.char);
  }

  public onRangePick(range: BaseTextRange): void {
    console.log('Range picked:', range);
    this.range.set(range);
  }
}
