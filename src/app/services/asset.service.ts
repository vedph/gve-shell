import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * A service to load resources from assets files.
 */
@Service()
export class AssetService {
  private readonly _http = inject(HttpClient);

  /**
   * Load a text from the specified path in the shop.
   *
   * @param path The path (relative to the root folder).
   */
  public loadText(path: string): Observable<string> {
    return this._http.get('./assets/' + path, {
      responseType: 'text',
    });
  }

  /**
   * Load an object from a JSON resource.
   *
   * @param path The path (relative to the root folder).
   * @returns The object parsed from the loaded JSON code.
   */
  public loadObject<T>(path: string): Observable<T> {
    return this._http.get<T>('./assets/' + path + '.json');
  }
}
