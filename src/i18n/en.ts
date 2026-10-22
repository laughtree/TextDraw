/**
 * English strings: the source of truth for the keys. `{name}` marks a value filled in by `t()`.
 * The other languages are typed against this object, so a missing key is a compile error.
 */
export const en = {
  // page
  'app.description':
    'Text Draw: draw on a canvas and watch it turn into text art. Import images or text, then copy as plain text, HTML, ANSI or an image.',
  'meta.cells': '{cols} × {rows} cells',
  'lang.label': 'Language',
  'gh.title': 'View the source on GitHub',

  // canvas and text editor
  'canvas.aria': 'Drawing area',
  'textedit.aria': 'Type text, Enter to confirm, Esc to cancel',
  'sheet.open': 'Show the toolbar',
  'sheet.close': 'Hide the toolbar',

  // top row
  'palette.group': 'Color mode',
  'palette.color': 'Color',
  'palette.gray': 'Gray',
  'under.label': 'Trace',
  'undo.label': 'Undo',
  'undo.title': 'Undo (Ctrl+Z)',
  'redo.label': 'Redo',
  'redo.title': 'Redo (Ctrl+Y)',

  // colours
  'swatches.group': 'Pen color',
  'color.ink': 'Ink (follows the theme)',
  'color.red': 'Red',
  'color.orange': 'Orange',
  'color.yellow': 'Yellow',
  'color.green': 'Green',
  'color.teal': 'Teal',
  'color.blue': 'Blue',
  'color.purple': 'Purple',
  'eyedropper.label': 'Eyedropper',
  'eyedropper.title': 'Eyedropper (click a character to pick its color)',
  'palette.custom': 'Custom color (palette)',

  // tools
  'tools.group': 'Shapes and text',
  'tool.pen': 'Pen',
  'tool.pen.title': 'Pen (freehand)',
  'tool.line': 'Line',
  'tool.line.title': 'Line (drag)',
  'tool.circle': 'Circle',
  'tool.circle.title': 'Circle (drag its bounds)',
  'tool.rect': 'Rectangle',
  'tool.rect.title': 'Rectangle (drag its bounds)',
  'tool.text': 'Text',
  'tool.text.title': 'Text (click to type)',
  'action.group': 'Draw or erase',
  'action.draw': 'Draw',
  'action.erase': 'Erase',
  'textsize.label': 'Font size',
  'size.label': 'Width',

  // conversion styles
  'modes.group': 'Conversion style',
  'mode.braille': 'Braille',
  'mode.mix': 'Mix',
  'mode.block': 'Blocks',
  'mode.shade': 'Shade',
  'mode.dots': 'Dots',
  'mode.cjk': 'CJK',
  'mode.line': 'Lines',
  'mode.custom': 'Custom',
  'custom.label': 'Characters',

  // canvas size and platform
  'canvas.label': 'Canvas size',
  'canvas.full': 'Fit window',
  'canvas.cols': 'Cols',
  'canvas.rows': 'Rows',
  'canvas.range': 'Columns {minCols}–{maxCols}, rows {minRows}–{maxRows}',
  'platform.label': 'Platform',
  'platform.custom': 'Custom',
  'platform.tip': 'About this platform',
  'platform.chat.label': 'Small general size',
  'platform.chat.rule':
    'A general small size: chat bubbles are usually narrower and wrap sooner than posts, so it is smaller than the post presets. There is no character limit, so no readout is shown.',
  'platform.x.rule':
    'Weighted count: blocks, braille and CJK characters count 2 each; line breaks and standard spaces count 1.',
  'platform.telegram.rule':
    'Counted in characters (whether a line break counts as 2 is unconfirmed).',
  'platform.discord.rule': "Counted in characters; Nitro's 4000 is not used.",
  'platform.mastodon.rule':
    'Counted in characters; 500 is the default and each server can change it.',
  'platform.instagram-post.label': 'Instagram caption',
  'platform.instagram-post.rule': 'Counted in characters.',
  'platform.instagram-bio.label': 'Instagram bio',
  'platform.instagram-bio.rule': 'Counted in characters.',
  'platform.threads.rule': 'Counted in characters.',
  'platform.line.rule': 'Counted in UTF-16 units (each block or braille character is 1).',
  'platform.bluesky.rule': 'Counted in graphemes; there is also a 3000-byte limit.',
  'platform.titleLimit': '{label}　Limit {limit}',
  'platform.titleEstimate': '{label}　General estimate',
  'platform.heading.source': 'Source',
  'platform.heading.size': 'Suggested size',
  'platform.source.official': 'Confirmed in the official documentation',
  'platform.source.thirdparty': 'Third-party source, not confirmed officially',
  'platform.source.estimate':
    'A general estimate, not an official figure for any platform; adjust it after testing in the real chat app',
  'platform.size.estimate':
    '{cols} × {rows} (the width is an estimate; make it smaller if the post still wraps)',
  'platform.size.derived':
    '{cols} × {rows} (columns ≈ 2 × rows; the 32-column cap is an estimate, not official)',
  'platform.used': 'Used {used} / {limit}',
  'platform.over': ' · over the limit',

  // actions row
  'action.clear': 'Clear',
  'action.import': 'Import',
  'action.export': 'Export',
  'action.cancel': 'Cancel',

  // import
  'import.group': 'Import type',
  'import.image': 'Image',
  'import.text': 'Text',
  'import.imageHint':
    'The picture is placed whole and centered on the canvas, keeping its colors. You can also drop a file on the canvas or paste an image.',
  'import.pickImage': 'Choose image',
  'import.placeholder': 'Paste ASCII art here; the canvas takes the size of the text',
  'import.textAria': 'Text to import',
  'import.pickText': 'Choose file',

  // export
  'space.label': 'Space substitute',
  'space.tip': 'About the space substitute',
  'space.group': 'Space character',
  'space.std': 'Standard',
  'space.nbsp': 'No-break',
  'space.braille': 'Braille',
  'space.std.body':
    'The ordinary space character, good for code, terminals and editors.<br />Most chat apps and social platforms drop leading or repeated spaces, so it is not recommended there.',
  'space.nbsp.body':
    'A special space that looks as wide as a normal one and is less likely to be trimmed, but some major platforms turn it into a normal space, so check on your target platform.',
  'space.braille.body':
    'The blank braille character: the least likely to be trimmed, a good fit for chat and social platforms.<br />In proportional fonts its width may not line up, and code cannot treat it as a space.',
  'fence.label': '``` block',
  'format.group': 'Export format',
  'format.text': 'Plain text',
  'format.html': 'HTML',
  'format.ansi': 'ANSI',
  'format.image': 'Image',
  'noun.text': 'plain text',
  'noun.html': 'HTML',
  'noun.ansi': 'ANSI text',
  'noun.image': 'image',
  'export.copy': 'Copy',
  'export.download': 'Download',
  'copypanel.message':
    'The clipboard is blocked. Long-press the text below to select all and copy.',
  'copypanel.close': 'Close',

  // messages
  'toast.cleared': 'Cleared',
  'toast.empty': 'The canvas is empty',
  'toast.copied': 'Copied {what}',
  'toast.copiedOver': 'Copied {what}, but over the {platform} limit ({used} / {limit})',
  'toast.downloaded': 'Downloaded {name}',
  'toast.imageNoCopy': "Your browser can't copy images, so it was downloaded instead",
  'toast.imageFail': "Couldn't create the image",
  'toast.noChar': 'No character nearby',
  'toast.unsupported': 'Unsupported file',
  'toast.imageTooBig': 'Image too large (limit 25 MB)',
  'toast.imageUnreadable': "Couldn't read the image",
  'toast.imageDone': 'Image imported',
  'toast.textEmpty': 'There is no text to import',
  'toast.textTooBig': 'Text file too large (limit 2 MB)',
  'toast.textDone': 'Text imported ({cols} × {rows})',
  'toast.textCropped': 'Text imported, cropped to {cols} × {rows}',
} as const;

export type Key = keyof typeof en;
