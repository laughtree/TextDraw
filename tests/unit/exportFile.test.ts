import { describe, expect, it } from 'vitest';
import { EXPORT_FILES, fileContent, htmlDocument } from '../../src/exportFile';

describe('export files', () => {
  it('names and types every format', () => {
    expect(EXPORT_FILES.text).toEqual({
      name: 'text-draw.txt',
      mime: 'text/plain;charset=utf-8',
    });
    expect(EXPORT_FILES.html.name).toBe('text-draw.html');
    expect(EXPORT_FILES.html.mime).toContain('text/html');
    expect(EXPORT_FILES.ansi.name).toBe('text-draw.ans');
    expect(EXPORT_FILES.image).toEqual({ name: 'text-draw.png', mime: 'image/png' });
  });
});

describe('htmlDocument', () => {
  const doc = htmlDocument('<pre>x</pre>');

  it('is a complete UTF-8 document around the fragment', () => {
    expect(doc.startsWith('<!doctype html>')).toBe(true);
    expect(doc).toContain('<meta charset="utf-8">');
    expect(doc).toContain('<body');
    expect(doc).toContain('<pre>x</pre>');
    expect(doc.endsWith('</html>\n')).toBe(true);
  });

  it('puts the fragment on a light page so ink-coloured text stays readable', () => {
    expect(doc).toMatch(/background:#fff/);
    expect(doc).toMatch(/color:#161616/);
  });
});

describe('fileContent', () => {
  it('saves text and ANSI as they are, and HTML as a document', () => {
    expect(fileContent('text', 'a\nb')).toBe('a\nb');
    expect(fileContent('ansi', '\x1b[0m')).toBe('\x1b[0m');
    expect(fileContent('html', '<pre>p</pre>')).toBe(htmlDocument('<pre>p</pre>'));
  });
});
