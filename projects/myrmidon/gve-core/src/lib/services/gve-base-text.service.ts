import { CharNode } from '../models';

/**
 * Service for base text operations.
 */
export class GveBaseTextService {
  private static readonly _asciiTable: { [key: string]: string } = {
    '\u0007': '\u21B5', // BEL (bell)
    '\u0008': '\u21B6', // BS (backspace)
    '\u0009': '\u2192', // HT (horizontal tab)
    '\u000A': '\u2193', // LF (line feed)
    '\u000B': '\u2194', // VT (vertical tab)
    '\u000C': '\u2195', // FF (form feed)
    '\u000D': '\u21A6', // CR (carriage return)
    '\u0020': ' ', // Space
    '\u007F': '~', // DEL (delete)
  };

  /**
   * Translate an ASCII special character to a printable character.
   *
   * @param c The character to translate.
   * @returns The translated character.
   */
  public static translateSpecialChar(c: string): string {
    return this._asciiTable[c] || c;
  }

  /**
   * Convert a string to the character nodes of a base text.
   *
   * @param text The text to convert to base characters.
   * @returns Character nodes for the given text.
   */
  public static stringToBaseChars(text?: string): CharNode[] {
    if (!text) {
      return [];
    }
    return text.split('').map((c, i) => {
      return {
        id: i + 1,
        label: this.translateSpecialChar(c),
        index: i,
        data: c,
      };
    });
  }
}
