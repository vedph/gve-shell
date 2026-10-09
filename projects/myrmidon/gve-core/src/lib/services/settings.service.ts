import { Service } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service to store and retrieve dynamic settings.
 */
@Service()
export class SettingsService {
  private readonly _cache: Map<string, unknown> = new Map<string, unknown>();
  private readonly _subject: BehaviorSubject<string | null> =
    new BehaviorSubject<string | null>(null);

  /**
   * Observable emitting the key of the setting that has changed.
   */
  public get settingChange$(): Observable<string | null> {
    return this._subject.asObservable();
  }

  /**
   * Prefix to scope the keys. This prefix is used internally to scope the keys
   * so that they cannot conflict with other keys in the local storage.
   * The prefix is totally transparent to the user of the service, who should
   * use the keys without the prefix.
   */
  public keyPrefix?: string;

  /**
   * True to persist the settings in the local storage by default.
   */
  public persistDefault = false;

  /**
   * Scopes the key by prefixing it with the keyPrefix if any.
   *
   * @param key The key to scope.
   * @returns The scoped key.
   */
  private getScopedKey(key: string): string {
    return this.keyPrefix ? this.keyPrefix + key : key;
  }

  /**
   * Removes the keyPrefix (if any) from a scoped key.
   *
   * @param key The scoped key.
   * @returns The unscoped key.
   */
  private getUnscopedKey(key: string): string {
    return this.keyPrefix && key.startsWith(this.keyPrefix)
      ? key.substring(this.keyPrefix.length)
      : key;
  }

  private isPersist(persist?: boolean): boolean {
    return persist === undefined ? this.persistDefault : persist;
  }

  /**
   * Sets a setting's value.
   *
   * @param key The key.
   * @param value The value.
   * @param persist True to persist this setting in local storage.
   */
  public set(key: string, value: any, persist?: boolean): void {
    key = this.getScopedKey(key);
    this._cache.set(key, value);
    if (this.isPersist(persist) && value !== undefined) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error(`Error saving key "${key}" to localStorage`, e);
      }
    }
    this._subject.next(this.getUnscopedKey(key));
  }

  /**
   * Set multiple settings at once from the specified settings object.
   *
   * @param settings The settings to set.
   * @param persist True to persist these settings in local storage.
   */
  public setFrom(
    settings: { [key: string]: any } | undefined | null,
    persist?: boolean
  ): void {
    if (!settings) {
      return;
    }
    for (const key in settings) {
      if (settings.hasOwnProperty(key)) {
        this.set(key, settings[key], persist);
      }
    }
  }

  /**
   * Get a setting's value of type T.
   *
   * @param key The key.
   * @param defaultValue The default value to get when the setting
   * is not found in the store.
   * @returns The value.
   */
  public get<T>(key: string, defaultValue?: any, persist?: boolean): T {
    key = this.getScopedKey(key);

    // immediately return value from cache
    if (this._cache.has(key)) {
      return this._cache.get(key) as T;
    }

    // try loading value from local storage
    if (this.isPersist(persist)) {
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsedValue = JSON.parse(value) as T;
          this._cache.set(key, parsedValue);
          return parsedValue;
        } catch (e) {
          console.error(
            `Error parsing value for key "${key}" from localStorage`,
            e
          );
        }
      }
    }

    // not found, return default value
    return defaultValue;
  }

  /**
   * Check if a key exists in the store.
   *
   * @param key The key.
   * @param persist True to check if the key exists in local storage.
   * @returns True if the key exists in the store.
   */
  public contains(key: string, persist?: boolean): boolean {
    key = this.getScopedKey(key);
    if (this._cache.has(key)) {
      return true;
    }
    return this.isPersist(persist) && localStorage.getItem(key) !== null;
  }

  /**
   * Get all the keys of the settings in the store.
   *
   * @param persist True to include keys from local storage.
   * @returns The keys of the settings in the store.
   */
  public getKeys(persist?: boolean): string[] {
    const keys: Set<string> = new Set<string>();

    // collect keys from local storage
    if (this.isPersist(persist)) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (!this.keyPrefix || key.startsWith(this.keyPrefix))) {
          keys.add(key);
        }
      }
    }

    // collect keys from cache
    this._cache.forEach((_, key) => keys.add(key));

    // return unscoped keys as array, as the prefix is transparent to callers
    return Array.from(keys).map((k) => this.getUnscopedKey(k));
  }

  /**
   * Remove a setting if present.
   *
   * @param key The key.
   * @param persist True to remove the setting from local storage.
   */
  public remove(key: string, persist?: boolean): void {
    key = this.getScopedKey(key);
    this._cache.delete(key);

    if (this.isPersist(persist)) {
      localStorage.removeItem(key);
    }
    this._subject.next(this.getUnscopedKey(key));
  }

  /**
   * Clear all settings. Warning: this will remove all settings from the
   * local storage if no key prefix is set.
   *
   * @param persist True to remove all settings from local storage.
   */
  public clear(persist?: boolean): void {
    // remove from local storage all the settings
    const removedKeys: Set<string> = new Set<string>();

    if (this.isPersist(persist)) {
      if (this.keyPrefix) {
        // collect keys to remove from local storage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(this.keyPrefix)) {
            removedKeys.add(key);
          }
        }
        // remove collected keys from local storage
        removedKeys.forEach((key) => localStorage.removeItem(key));
      } else {
        localStorage.clear();
      }
    }

    // remove from cache all the items emitting change events
    this._cache.forEach((_, key) => {
      this._cache.delete(key);
      this._subject.next(this.getUnscopedKey(key));
      removedKeys.delete(key);
    });

    // emit changes for the remaining removed keys
    // for when the cache was not in sync with the local storage
    removedKeys.forEach((key) => this._subject.next(this.getUnscopedKey(key)));
  }
}
