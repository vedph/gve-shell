import { MatDialogConfig } from "@angular/material/dialog";

/**
 * API call result wrapper.
 */
export interface ResultWrapper<T> {
  result?: T;
  error?: string;
}

/**
 * PayloadMatDialogConfig is a MatDialogConfig with a payload, used
 * to pass data of type T to a dialog.
 */
export interface PayloadMatDialogConfig<T> extends MatDialogConfig {
  payload?: T;
}
