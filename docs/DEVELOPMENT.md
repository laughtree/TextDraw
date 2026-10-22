# Development notes

**English** | [繁體中文](DEVELOPMENT.zh-TW.md)

Text Draw is a single-page app written in Vite and TypeScript (strict), with no front-end framework. This document covers the project structure, the conversion pipeline, notes on the implementation and how it is tested; for how to use it, see the [README](../README.md).

## Project structure

```
index.html          page markup (no inline style or script)
src/
  main.ts           entry point: loads fonts and styles, initialises the modules, starts the draw loop
  state.ts          shared mutable state (tool, mode, canvas size, conversion result)
  types.ts          shared types such as Mode / Palette / Metrics
  convert.ts        canvas pixels → one character per cell (pure, no DOM)
  blocks.ts         rectangles of block characters (shades, quadrants, eighths) and their ink vectors (pure)
  match.ts          matches each cell's 2×4 ink against candidate characters, builds braille candidates (pure)
  glyphs.ts         glyph ink calibration (measured from the real font; clear the cache when the font or cell width changes)
  charsets.ts       character sets used by the modes
  color.ts          sRGB luminance and hex helpers (pure)
  theme.ts          reads CSS variables
  surface.ts        canvas / scratch layer, cell measurement, window resizing, the cells readout in the header
  render.ts         draws the converted result on screen
  paint.ts          paints the result as braille, blocks, dots or text (shared by the screen and the PNG)
  png.ts            paints the result into a PNG (transparent, cropped to the content)
  download.ts       file download
  exportFile.ts     file names, types and the HTML document wrapper of each export format (pure)
  export.ts         plain text / HTML / ANSI output (pure)
  panels.ts         how much stage height the open panels take (so the canvas does not shrink with them)
  draw.ts           pointer events: freehand strokes, dragged shapes (previewed over a restored base), text-tool clicks
  shapes.ts         line, circle and rectangle drawing (outline rectangle; the pure parts are testable)
  pick.ts           which character the eyedropper takes (pure)
  text.ts           text tool: one-line editor, live preview, the caret on the canvas, confirm / cancel
  caret.ts          position and size of the text caret (pure)
  brush.ts          pen width (shared by strokes and the preview ring, pure)
  grid.ts           column/row limits, clamping, buffer size, scaling and centring (pure)
  snap.ts           snaps overlay edges to whole device pixels (pure)
  platforms.ts      per-platform character limits, counting rules and suggested sizes (pure)
  history.ts        undo / redo
  sample.ts         paints the starter picture (DRAW / TEXT) into the buffer
  sampleLayout.ts   layout of the starter picture (pure: centred, monospaced)
  font.ts           7×7 monospaced bitmap font for the starter picture
  textGrid.ts       for import: lays text out on cells, character widths, cropping (pure)
  importText.ts     text import: sizes the grid, paints each character into the buffer
  importImage.ts    image import: decodes and centres into the buffer
  i18n/             translations: dictionaries (en.ts is the reference, zh-TW.ts, ja.ts), language detection (lang.ts, pure), t() (index.ts)
  ui/               panels and controls: tool selection (tools.ts), colors (colors.ts), eyedropper (eyedropper.ts),
                    toolbar (controls.ts), export menu (copy.ts), import menu with drag-and-drop and paste (importMenu.ts),
                    canvas size (canvasSize.ts), platform (platform.ts; names and help text in platformText.ts),
                    bottom sheet for small screens (sheet.ts), sliding selection of button groups (segments.ts),
                    enter / exit motion (reveal.ts), toasts (toast.ts), brush ring (brush.ts)
  styles/           tokens (theme colors) / base / brush / shell / controls / tray / overlays
tests/
  unit/             Node: pure functions that never touch the DOM
  browser/          real Chromium (Vitest browser mode + Playwright): conversion, interface, import and export, layout
legacy/             the single-file version from before the refactor, only used by the parity test
```

## Conversion pipeline

What you draw goes into a drawing buffer (`buf` in `surface.ts`), and `convert.ts` turns it into characters:

1. For every cell (`cw × ch`, the height about 2.05 times the width) it takes the ink in 2×4 zones.
2. It picks a character by style: Braille uses a fixed threshold (Bayer dithering in gray) for each dot; Blocks and Mix use `match.ts` to compare the cell's 2×4 ink distribution with each candidate's and take the smallest error; Shade, Dots, CJK and Custom pick by the ink of the whole cell; Lines picks by the direction of the stroke.
3. The result goes into `state.grid`, `state.gridCol` (the color to display) and `state.gridSrc` (the color it was drawn in, which the eyedropper reads).
4. `paint.ts` draws the result on screen, and the PNG export shares it, so the exported picture is the picture you see.

The tuning knobs for Blocks and Mix are in `src/match.ts`: `BLANK_BELOW` (below this ink the cell stays blank), `BRAILLE_MIN` (minimum ink for braille) and `TONE_WEIGHT` (weight of the whole-cell density error).

The Mix character set has blocks (`█ ▀ ▄ ▌ ▐` and quadrant combinations), shades (`░ ▒ ▓`), eighth-blocks and braille, and no ASCII symbols; the ink of each glyph is measured from the real font (`glyphs.ts`). Blocks only uses block characters, drawn as rectangles without depending on the font. Eighth-blocks only come as bars glued to the bottom or the left, so a thin horizontal line in the middle of a cell becomes the nearest character or a blank in the Blocks style.

## Import

- Text: `parseArt` in `textGrid.ts` normalises line breaks and tabs, removes ANSI escape sequences and zero-width characters, lays the text out on cells by character width (full-width counts two) and crops it to 200 × 100. `importText.ts` sets the canvas to that fixed grid and paints each character: braille as dots slightly larger than on screen (each dot must cover clearly more than the 0.28 conversion threshold so the round trip loses none), block characters as the rectangles from `blocks.ts`, everything else with `fillText` in the monospaced font.
- Image: `importImage.ts` decodes with `createImageBitmap` (honouring EXIF orientation), scales it with `containRect` and centres it in the buffer; the undo step is only recorded once decoding has succeeded.
- A snapshot (buffer pixels and the grid setting together) is recorded before any import, so a single undo restores everything.

## Motion and layout

- `src/ui/reveal.ts` uses the Web Animations API for enter and exit motion: blocks that push the layout slide their height and fade (about 200 ms to open, 150 ms to close), toasts slide in from above, bubbles from below, the rest fade. Nothing animates when the system asks for reduced motion.
- When closing, the `hidden` attribute is only set after the animation ends; use `isOpen()` to find out whether something is open, not `hidden`.
- An open panel does not shrink or crop the canvas: in Fit window mode the canvas takes the stage height it has with every panel closed (`panelExtra()` in `panels.ts`), and panels simply cover its lower edge. During the motion the canvas keeps its pixel size and is only recomputed afterwards if its size really changed.
- The sliding selection of single-choice groups (`.seg`) and of the color frame is done by `src/ui/segments.ts`: it watches `aria-pressed`, measures the selected button and moves a highlight layer behind the buttons (`::before` / `::after`, CSS transition of 200 ms). The layer's edges are snapped to whole device pixels with `snap.ts` so they line up with the buttons' edges; `::before` and `::after` need `box-sizing: border-box` (`base.css`). The layer is placed directly on page load and on layout changes.
- Small screens: below 700 px of height (`SHEET_QUERY` in `panels.ts`, `@media (max-height: 699px)` in `tray.css`) the toolbar becomes a bottom sheet fixed to the bottom (`src/ui/sheet.ts`). Collapsed it shows the handle and the two most-used rows with the canvas above it; expanded it covers the canvas without changing its size, which is why `panelExtra()` returns 0 in this mode. Rows that are not visible when collapsed are hidden with `visibility: hidden`, so they are out of reach of the keyboard and screen readers. Below 420 px of width the rows that never wrap (the top rows and the action row) use less spacing and padding, and English and Japanese labels, which are longer than the Chinese ones, use smaller type on narrow screens.
- While you type with the text tool there is a blinking caret on the canvas (`#textCaret`, an endless CSS animation; its position and size come from `caret.ts`, measured from the font: from the top of tall letters (`H d`) to the bottom of hanging ones (`g p`), times the current scale). It does not blink when the system asks for reduced motion.
- Tests use `app.settle()` (wait until every animation has finished) instead of fixed waits; endless animations (the caret's blink) never finish, so `settle()` and `animations()` ignore them.

## Translations

- **Dictionaries**: `src/i18n/en.ts` is the reference for every string (a flat key → string object, `{name}` marks a value `t()` fills in); `zh-TW.ts` and `ja.ts` are typed `Record<Key, string>`, so a missing key fails to compile. Brand names (Text Draw, X, Telegram…), export file names and the starter picture (DRAW / TEXT) are not translated.
- **Choosing the language** (`lang.ts`, pure): `?lang=` > the saved choice (`text-draw.lang` in `localStorage`) > the browser's languages (the first supported one in the user's order; any `zh*` is Traditional Chinese) > English.
- **Static text**: elements in `index.html` carry `data-i18n="key"` (text), `data-i18n-html="key"` (paragraphs with `<br />`) and `data-i18n-attr="title:key;aria-label:key"` (attributes); `applyStatic()` writes them at start-up and whenever the language changes. The HTML file holds the **English** defaults (so the interface is never empty before JavaScript runs), and a browser test checks that every default equals `en.ts`, so the two cannot drift apart.
- **Dynamic text**: every message in the code goes through `t()`; things rendered once (the platform list and its help, the used/limit readout, the canvas-size summary, the import and export button labels, the cells readout, the sheet's aria-label) listen for the `langchange` event and render again. A toast is transient and uses the language at the moment it appears.
- **Fonts**: the Japanese interface uses Noto Sans JP (Japanese glyph forms); Traditional Chinese and English keep Noto Sans TC (`:root:lang(ja)` in `tokens.css`).
- **Adding a language**: 1. add `src/i18n/<id>.ts` (typed like `ja.ts`); 2. add it to `Lang`, `LANGS`, `HTML_LANG` and `fromTag()` in `lang.ts` and to `DICTS` in `index.ts`; 3. add an `<option>` to `#lang` in `index.html`; 4. if the script needs a font, import the matching `@fontsource` package and add a font stack in `tokens.css`; 5. run `pnpm test`: the dictionary tests check that the keys and `{placeholders}` match exactly, and `responsive.test.ts` checks that every language fits every common screen size without sideways overflow.
- **Tests**: the browser tests open the page with `?lang=zh-TW` by default (the `lang` option of `harness.ts`), so they do not depend on the browser language of the machine they run on and the existing Chinese assertions stay valid.

## Target platform data

Character limits, counting rules and suggested sizes are in `src/platforms.ts` (the help text is in each language's dictionary as `platform.<id>.rule`); when a rule changes, only that needs updating. Suggested sizes: the columns are about twice the rows, taking the largest number of rows for which "every cell holds the heaviest character, plus a line break" still fits the limit, at most 16 rows and 32 columns. How wide each platform's chat bubbles are, which font they use and how many lines they show have no reliable data, so none of it is modelled.

## Tests

```bash
pnpm test:unit      # unit tests (Node)
pnpm test:browser   # browser tests
```

- Unit tests cover the pure functions that never touch the DOM (matching, export, platform counting, grid maths, text layout, snapping, language detection, dictionaries…).
- Browser tests load the page in an iframe and drive it with synthetic pointer events to check conversion, export and import, motion and layout (`tests/browser/responsive.test.ts` checks that every language fits screens from 320×568 to 1366×768, including phones on their side, without sideways overflow). The clipboard and downloads are intercepted by `harness.ts`.
- **Parity test** (`tests/browser/parity.test.ts`): loads `legacy/index.html` (the single-file version from before the refactor) and the current version, feeds both the same strokes and actions, and compares 6 styles (Braille, Shade, Dots, CJK, Lines, Custom) × color / gray × light / dark theme × the 3 copy formats and the canvas pixels, to confirm that the refactor did not change behaviour. The test compensates for the differences that are on purpose: the starter pictures differ, so both start by clearing; the Mix and Blocks character sets were redesigned and are out of scope; the old HTML always used standard spaces, so U+00A0 and U+2800 are turned back into spaces before comparing; the old eraser was 2.5 times the pen width; the legacy page has no `lang`, so the test gives it the same `lang` as the current page. If behaviour is changed on purpose later, update or remove `legacy/` and this test.

## Known issues

- The lightest dot of the Dots style (`·`) is folded back to ASCII `.` after conversion, so that level of dot is never drawn and the output is `.` as well (the `·` → `.` replacement at the end of `src/convert.ts` applies to every style that reaches it).
- Custom characters that contain `·` are replaced by the same code.
