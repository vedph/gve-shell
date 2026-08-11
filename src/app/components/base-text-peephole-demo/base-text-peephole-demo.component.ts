import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { combineLatest, Subscription } from 'rxjs';
import { startWith } from 'rxjs/operators';

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

@Component({
  selector: 'app-base-text-peephole-demo',
  imports: [
    FormsModule,
    ReactiveFormsModule,
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
export class BaseTextPeepholeDemoComponent implements OnInit, OnDestroy {
  private readonly _subs: Subscription[] = [];

  public text: FormControl<string | null>;
  public at: FormControl<number>;
  public run: FormControl<number>;
  public atAsIndex: FormControl<boolean>;
  public windowWidth: FormControl<number>;
  public emSize: FormControl<number>;

  public readonly nodes = signal<CharNode[]>([]);
  public readonly selectedRange = signal<OpTextRange>({
    at: 1,
    run: 1,
    atAsIndex: false,
  });
  public readonly windowWidthValue = signal<number>(15);
  public readonly emSizeValue = signal<number>(1);

  constructor(formBuilder: FormBuilder) {
    this.text = formBuilder.control('');
    this.at = formBuilder.control(1, { nonNullable: true });
    this.run = formBuilder.control(1, { nonNullable: true });
    this.atAsIndex = formBuilder.control(false, { nonNullable: true });
    this.windowWidth = formBuilder.control(15, { nonNullable: true });
    this.emSize = formBuilder.control(1, { nonNullable: true });
  }

  public ngOnInit(): void {
    this._subs.push(
      this.text.valueChanges.subscribe((value) => {
        this.nodes.set(value ? GveBaseTextService.stringToBaseChars(value) : []);
      }),
    );

    this._subs.push(
      combineLatest([
        this.at.valueChanges.pipe(startWith(this.at.value)),
        this.run.valueChanges.pipe(startWith(this.run.value)),
        this.atAsIndex.valueChanges.pipe(startWith(this.atAsIndex.value)),
      ]).subscribe(([at, run, atAsIndex]) => {
        this.selectedRange.set({ at, run, atAsIndex });
      }),
    );

    this._subs.push(
      this.windowWidth.valueChanges
        .pipe(startWith(this.windowWidth.value))
        .subscribe((value) => this.windowWidthValue.set(value)),
    );

    this._subs.push(
      this.emSize.valueChanges
        .pipe(startWith(this.emSize.value))
        .subscribe((value) => this.emSizeValue.set(value)),
    );

    this.text.setValue(
      'there was an old man with a beard\n' +
        'who cried: "It is just as I feared!\n' +
        'four larks and a wren,\n' +
        'two swans and a hen,\n' +
        'all built their nests in my beard!',
    );
  }

  public ngOnDestroy(): void {
    for (const sub of this._subs) {
      sub.unsubscribe();
    }
  }
}
