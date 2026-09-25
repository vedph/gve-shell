import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let changes: (string | null)[];

  beforeEach(() => {
    localStorage.clear();
    service = new SettingsService();
    changes = [];
    service.settingChange$.subscribe((k) => changes.push(k));
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should start emitting null', () => {
    expect(changes).toEqual([null]);
  });

  describe('without persistence', () => {
    it('should set and get a value', () => {
      service.set('a', { x: 1 });
      expect(service.get('a')).toEqual({ x: 1 });
      expect(localStorage.getItem('a')).toBeNull();
      expect(changes).toEqual([null, 'a']);
    });

    it('should return the default value when missing', () => {
      expect(service.get('missing', 42)).toBe(42);
      expect(service.get('missing')).toBeUndefined();
    });

    it('should tell whether it contains a key', () => {
      service.set('a', 1);
      expect(service.contains('a')).toBe(true);
      expect(service.contains('b')).toBe(false);
    });

    it('should set from an object', () => {
      service.setFrom({ a: 1, b: 'x' });
      expect(service.get('a')).toBe(1);
      expect(service.get('b')).toBe('x');
      expect(changes).toEqual([null, 'a', 'b']);
    });

    it('should ignore null or undefined settings in setFrom', () => {
      service.setFrom(null);
      service.setFrom(undefined);
      expect(changes).toEqual([null]);
    });

    it('should remove a value', () => {
      service.set('a', 1);
      service.remove('a');
      expect(service.contains('a')).toBe(false);
      expect(changes).toEqual([null, 'a', 'a']);
    });

    it('should list keys', () => {
      service.set('a', 1);
      service.set('b', 2);
      expect(service.getKeys().sort()).toEqual(['a', 'b']);
    });

    it('should clear all values emitting their keys', () => {
      service.set('a', 1);
      service.set('b', 2);
      changes = [];
      service.clear();
      expect(service.getKeys()).toEqual([]);
      expect(changes.sort()).toEqual(['a', 'b']);
    });
  });

  describe('with persistence', () => {
    it('should persist when requested', () => {
      service.set('a', { x: 1 }, true);
      expect(localStorage.getItem('a')).toBe('{"x":1}');
    });

    it('should persist by default when persistDefault is true', () => {
      service.persistDefault = true;
      service.set('a', 1);
      expect(localStorage.getItem('a')).toBe('1');
    });

    it('should not persist an undefined value', () => {
      service.set('a', undefined, true);
      expect(localStorage.getItem('a')).toBeNull();
    });

    it('should log errors when saving fails', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota');
      });
      service.set('a', 1, true);
      expect(error).toHaveBeenCalled();
      // value is still cached
      expect(service.get('a')).toBe(1);
    });

    it('should load a value from local storage', () => {
      localStorage.setItem('a', '{"x":2}');
      expect(service.get('a', undefined, true)).toEqual({ x: 2 });
      // now cached
      localStorage.removeItem('a');
      expect(service.get('a')).toEqual({ x: 2 });
    });

    it('should not load from local storage when not persisting', () => {
      localStorage.setItem('a', '1');
      expect(service.get('a', 'def')).toBe('def');
    });

    it('should return the default value on invalid JSON', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});
      localStorage.setItem('a', '{bad');
      expect(service.get('a', 'def', true)).toBe('def');
      expect(error).toHaveBeenCalled();
    });

    it('should check local storage in contains', () => {
      localStorage.setItem('a', '1');
      expect(service.contains('a')).toBe(false);
      expect(service.contains('a', true)).toBe(true);
    });

    it('should include local storage keys in getKeys', () => {
      localStorage.setItem('a', '1');
      service.set('b', 2);
      expect(service.getKeys(true).sort()).toEqual(['a', 'b']);
    });

    it('should remove from local storage', () => {
      service.set('a', 1, true);
      service.remove('a', true);
      expect(localStorage.getItem('a')).toBeNull();
    });

    it('should clear the whole local storage without prefix', () => {
      localStorage.setItem('other', '1');
      service.set('a', 1, true);
      service.clear(true);
      expect(localStorage.length).toBe(0);
    });
  });

  describe('with key prefix', () => {
    beforeEach(() => {
      service.keyPrefix = 'p-';
    });

    it('should scope keys in local storage', () => {
      service.set('a', 1, true);
      expect(localStorage.getItem('p-a')).toBe('1');
      expect(localStorage.getItem('a')).toBeNull();
      expect(service.get('a')).toBe(1);
    });

    it('should emit unscoped keys', () => {
      service.set('a', 1);
      service.remove('a');
      expect(changes).toEqual([null, 'a', 'a']);
    });

    it('should return unscoped keys, usable with get', () => {
      service.set('a', 1);
      localStorage.setItem('p-b', '2');
      localStorage.setItem('other', '3');
      const keys = service.getKeys(true).sort();
      expect(keys).toEqual(['a', 'b']);
      expect(service.get(keys[1], undefined, true)).toBe(2);
    });

    it('should clear only prefixed keys from local storage', () => {
      localStorage.setItem('other', '1');
      localStorage.setItem('p-x', '1');
      service.set('a', 1, true);
      changes = [];
      service.clear(true);
      expect(localStorage.getItem('other')).toBe('1');
      expect(localStorage.getItem('p-x')).toBeNull();
      expect(localStorage.getItem('p-a')).toBeNull();
      expect(changes.sort()).toEqual(['a', 'x']);
    });
  });
});
