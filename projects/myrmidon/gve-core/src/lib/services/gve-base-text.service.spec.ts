import { describe, expect, it } from 'vitest';

import { GveBaseTextService } from './gve-base-text.service';

describe('GveBaseTextService', () => {
  describe('translateSpecialChar', () => {
    it.each([
      ['\u0007', '↵'],
      ['\u0008', '↶'],
      ['\t', '→'],
      ['\n', '↓'],
      ['\u000B', '↔'],
      ['\u000C', '↕'],
      ['\r', '↦'],
      [' ', ' '],
      ['\u007F', '~'],
    ])('should translate %j to %j', (c, expected) => {
      expect(GveBaseTextService.translateSpecialChar(c)).toBe(expected);
    });

    it('should return a regular character unchanged', () => {
      expect(GveBaseTextService.translateSpecialChar('a')).toBe('a');
      expect(GveBaseTextService.translateSpecialChar('é')).toBe('é');
    });
  });

  describe('stringToBaseChars', () => {
    it('should return an empty array for undefined', () => {
      expect(GveBaseTextService.stringToBaseChars(undefined)).toEqual([]);
    });

    it('should return an empty array for an empty string', () => {
      expect(GveBaseTextService.stringToBaseChars('')).toEqual([]);
    });

    it('should build nodes with 1-based IDs and 0-based indexes', () => {
      const nodes = GveBaseTextService.stringToBaseChars('ab');
      expect(nodes).toEqual([
        { id: 1, label: 'a', index: 0, data: 'a' },
        { id: 2, label: 'b', index: 1, data: 'b' },
      ]);
    });

    it('should translate labels of special characters but keep data', () => {
      const nodes = GveBaseTextService.stringToBaseChars('a\nb');
      expect(nodes[1]).toEqual({ id: 2, label: '↓', index: 1, data: '\n' });
    });
  });
});
