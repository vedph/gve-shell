
import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardTitle,
} from '@angular/material/card';

@Component({
  selector: 'app-home',
  imports: [
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {}
