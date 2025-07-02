import { Component, OnDestroy, OnInit } from '@angular/core';


import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CharNode, SnapshotViewService } from '@myrmidon/gve-snapshot-view';

import {
  BaseTextCharEvent,
  BaseTextViewComponent,
  VarBaseTextRange,
} from '../../../../projects/myrmidon/gve-core/src/public-api';

@Component({
  selector: 'app-var-base-text-view-demo',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    BaseTextViewComponent
],
  templateUrl: './base-text-view-demo.component.html',
  styleUrl: './base-text-view-demo.component.scss',
})
export class BaseTextViewDemoComponent implements OnInit, OnDestroy {
  private _sub?: Subscription;
  public text: FormControl<string | null>;
  public range?: VarBaseTextRange;
  public nodes: CharNode[] = [];

  constructor(formBuilder: FormBuilder) {
    this.text = formBuilder.control('');
  }

  public ngOnInit(): void {
    this._sub = this.text.valueChanges.subscribe((value) => {
      this.nodes = value ? SnapshotViewService.stringToBaseChars(value) : [];
    });
    this.text.setValue(
      'there was an old man with a beard\n' +
        'who cried: "It is just as I feared!\n' +
        'four larks and a wren,\n' +
        'two swans and a hen,\n' +
        'all built their nests in my beard!'
    );
  }

  public ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  public onCharPick(event: BaseTextCharEvent): void {
    console.log('Char picked:', JSON.stringify(event.char));
  }

  public onRangePick(range: VarBaseTextRange): void {
    console.log('Range picked:', JSON.stringify(range));
    this.range = range;
  }
}
