import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../src/grid';
import { cellWidth, isBlank, parseArt } from '../../src/textGrid';

const BOM = String.fromCharCode(0xfeff),
  ZWSP = String.fromCharCode(0x200b),
  BEL = String.fromCharCode(7),
  NBSP = String.fromCharCode(0xa0),
  BRAILLE_BLANK = String.fromCharCode(0x2800);

describe('parseArt', () => {
  it('sizes the grid to the longest line and the number of lines', () => {
    const a = parseArt('abc\nde\n\nfghij');
    expect(a.cols).toBe(5);
    expect(a.rows).toBe(4);
    expect(a.lines[1]).toEqual(['d', 'e']);
    expect(a.cropped).toBe(false);
  });

  it('treats CRLF, CR and LF alike and ignores trailing blank lines', () => {
    expect(parseArt('a\r\nb\rc\n\n\n').lines.map((l) => l.join(''))).toEqual(['a', 'b', 'c']);
  });

  it('drops colour codes, control characters, the BOM and zero-width marks', () => {
    const esc = String.fromCharCode(27);
    expect(parseArt(BOM + esc + '[38;2;1;2;3mA' + esc + '[0m' + ZWSP + 'B' + BEL).lines[0]).toEqual(
      ['A', 'B'],
    );
  });

  it('expands tabs to the next multiple of four', () => {
    expect(parseArt('a\tb').lines[0]).toEqual(['a', ' ', ' ', ' ', 'b']);
    expect(parseArt('\tb').lines[0]).toEqual([' ', ' ', ' ', ' ', 'b']);
  });

  it('gives a full-width character two cells, the second one empty', () => {
    expect(parseArt('中a').lines[0]).toEqual(['中', '', 'a']);
    expect(parseArt('中a').cols).toBe(3);
  });

  it('does not count padding after the last character', () => {
    expect(parseArt('ab⠀⠀  \nc').cols).toBe(2);
    expect(parseArt('   \n   ').rows).toBe(0);
    expect(parseArt('').rows).toBe(0);
  });

  it('keeps astral characters whole', () => {
    expect(parseArt('😀x').lines[0]).toEqual(['😀', '', 'x']);
  });

  it('cuts to the grid limits and says so, never leaving half a wide glyph', () => {
    const wideRow = 'a' + '中'.repeat(LIMITS.maxCols);
    const a = parseArt(wideRow);
    expect(a.cropped).toBe(true);
    expect(a.cols).toBeLessThanOrEqual(LIMITS.maxCols);
    expect(a.lines[0].at(-1)).not.toBe('中');
    const tall = parseArt('x\n'.repeat(LIMITS.maxRows + 5));
    expect(tall.rows).toBe(LIMITS.maxRows);
    expect(tall.cropped).toBe(true);
  });
});

describe('cellWidth / isBlank', () => {
  it('measures wide and narrow characters', () => {
    expect(cellWidth('a')).toBe(1);
    expect(cellWidth('⣿')).toBe(1);
    expect(cellWidth('█')).toBe(1);
    expect(cellWidth('中')).toBe(2);
    expect(cellWidth('Ａ')).toBe(2);
    expect(cellWidth('한')).toBe(2);
  });
  it('knows the three blanks', () => {
    for (const c of [' ', NBSP, BRAILLE_BLANK, '']) expect(isBlank(c)).toBe(true);
    expect(isBlank('⠁')).toBe(false);
  });
});
