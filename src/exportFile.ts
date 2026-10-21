import type { ExportFormat, ExportKind } from './types';

export interface ExportFile {
  /** file name offered for download */
  name: string;
  mime: string;
}

export const EXPORT_FILES: Record<ExportFormat, ExportFile> = {
  text: { name: 'ascii-paint.txt', mime: 'text/plain;charset=utf-8' },
  html: { name: 'ascii-paint.html', mime: 'text/html;charset=utf-8' },
  // colour escape sequences in UTF-8: the usual extension for ANSI art, and `cat` shows the colours
  ansi: { name: 'ascii-paint.ans', mime: 'text/plain;charset=utf-8' },
  image: { name: 'ascii-paint.png', mime: 'image/png' },
};

export const EXPORT_LABELS: Record<ExportFormat, string> = {
  text: '純文字',
  html: '彩色 HTML',
  ansi: 'ANSI 文字',
  image: '圖片',
};

/** Wrap the copied `<pre>` fragment into a document that opens correctly on its own. */
export function htmlDocument(fragment: string): string {
  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<title>ASCIIpaint</title>',
    '</head>',
    '<body style="margin:0;padding:16px;background:#fff;color:#161616">',
    fragment,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** The text that goes into the downloaded file for a text format. */
export function fileContent(kind: ExportKind, exported: string): string {
  return kind === 'html' ? htmlDocument(exported) : exported;
}
