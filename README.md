# Text Draw

**English** | [繁體中文](README.zh-TW.md)

Draw on a canvas and watch it turn into **text art** as you go. You can also import an image or existing ASCII art, then copy the result as plain text, HTML, ANSI or an image, and preview how it looks before posting it to a platform. Everything runs in your browser; nothing is uploaded.

**Try it online: <https://laughtree.github.io/TextDraw/>**

## Features

- Live conversion with 8 styles (Braille, Mix, Blocks, Shade, Dots, CJK, Lines, Custom characters), in color or gray
- Pen, line, circle, rectangle, text and an eyedropper; draw and erase; undo and redo
- Import an image or ASCII art (paste text, open a file, drag and drop, or paste an image from the clipboard)
- Export plain text, HTML, ANSI or a PNG image, with a choice of space characters so chat apps do not swallow your spaces
- Built-in character limits and suggested sizes for X, Telegram, Discord, Mastodon, Threads, LINE, Bluesky and Instagram
- Interface in English, Traditional Chinese and Japanese, chosen from your browser language or from a switcher
- Light and dark themes (following your system), and it works on phones and small screens

## How to use it

### The basics

1. Drag on the canvas to draw; what you draw is converted to characters as you go. The circle on the canvas shows the size of the brush.
2. Pick the pen color from the **swatches**; the palette on the right chooses any color. **Color / Gray** switches how the picture is shown, and the **Trace** switch puts a faint copy of your original strokes under the characters.
3. Choose a **conversion style** to decide which kind of characters are used (see the table below).
4. **Width** sets the stroke width. The text tool uses **Font size** instead, and the eyedropper uses neither, so Width turns gray for both.
5. Use **Undo / Redo** (`Ctrl+Z` / `Ctrl+Y`) to fix mistakes. **Clear** empties the whole canvas (and can also be undone).

### Conversion styles

| Style   | Characters used                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------ |
| Braille | Braille characters (the default); fine lines, good for most pictures                                   |
| Mix     | A mix of blocks, shades, eighth-blocks and braille, picking the closest one; thin lines become braille |
| Blocks  | Block characters (`█ ▀ ▄ ▌ ▐`, quadrants, `░ ▒ ▓`, eighth-blocks), no braille                          |
| Shade   | ASCII symbols (` .:-=+*#%@`), from light to dark                                                       |
| Dots    | Dots of different sizes (`· • ●`)                                                                      |
| CJK     | Chinese characters with more and more strokes (`丶一二三工王田目回国國圖龍鬱龘`)                       |
| Lines   | Line characters such as `- \| / \`, chosen by the direction of the stroke                              |
| Custom  | Characters you type yourself, from light to dark                                                       |

Eighth-blocks only come as bars glued to the bottom or the left, so in the **Blocks** style a thin horizontal line in the middle of a cell becomes the nearest character or a blank; **Mix** uses braille for it instead.

### Tools

- **Pen**: freehand drawing (the default).
- **Line, circle, rectangle**: press and drag, release to confirm; a live preview shows while dragging and `Esc` cancels. The rectangle is drawn from two opposite corners and the circle is the ellipse inside it; only the outline is drawn, with the line width set by **Width**.
- **Text**: click the canvas, type, then press `Enter` to confirm or `Esc` to cancel; set the size with the **Font size** slider (12–160 px). A blinking caret appears where you clicked and is as tall as the text will be, so you can see how big it will get; it follows your typing and moves with the arrow keys, and grows or shrinks as you drag the slider. The text is drawn into the canvas and converted to characters like any other stroke, so it can be erased and undone. Small text is hard to read once converted (braille is clearer than blocks), so use a large size.
- **Draw / Erase**: erasing works with every shape and is as wide as drawing, so drawing a circle and erasing the same circle cancel out exactly.
- **Eyedropper**: click a character on the canvas to pick the color it was drawn in (even in Gray mode), then it returns to the tool you were using. Clicking a blank cell picks the nearest character; if there is none nearby, nothing happens.

### Canvas size

It starts as **Small general size** (20 × 12), small enough to fit a chat bubble. Open **Canvas size** to change it: choose another platform to apply its suggested size, type columns 8–200 and rows 4–100, or turn on **Fit window** to make the canvas follow the window. A fixed-size canvas is scaled to fit; changing the size rescales what you drew, and can be undone. The bigger the grid, the slower the redraw. While the panel is collapsed, its summary line shows which size you are on (for example "Small general size · 20 × 12").

### Target platforms

The **Platform** list applies a platform's suggested size and shows "Used / limit" for the characters, in red when over; copying plain text also warns you. It counts what would actually be pasted (with your space substitute and ``` block). The ⓘ next to it shows the platform's rule and where the numbers come from.

| Platform                | Limit                          | Counted as                                                                                                                           | Suggested size   | Source                                                                                                                                                                           |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Small general size      | —                              | —                                                                                                                                    | 20 × 12          | A general estimate, not an official figure for any platform                                                                                                                      |
| X                       | 280                            | Weighted: U+0000–10FF, 2000–200D, 2010–201F, 2032–2037 count 1; everything else (blocks, braille, CJK) counts 2; line breaks count 1 | 16 × 8           | Official: [X character counting](https://docs.x.com/fundamentals/counting-characters), [twitter-text config](https://github.com/twitter/twitter-text/blob/master/config/v3.json) |
| Telegram                | 4096                           | Characters                                                                                                                           | 32 × 16          | Official: [Bot API](https://core.telegram.org/bots/api)                                                                                                                          |
| Discord                 | 2000                           | Characters                                                                                                                           | 32 × 16          | Official help article: [support.discord.com](https://support.discord.com/hc/en-us/articles/33694251638295); Nitro's 4000 is not used                                             |
| Mastodon                | 500                            | Characters                                                                                                                           | 30 × 15          | Official: [posting](https://docs.joinmastodon.org/user/posting/); 500 is the default and each server can change it                                                               |
| Instagram caption / bio | 2200 / 150                     | Characters                                                                                                                           | 32 × 16 / 16 × 8 | Third-party source, not confirmed officially                                                                                                                                     |
| Threads                 | 500                            | Characters                                                                                                                           | 30 × 15          | Third-party source, not confirmed officially                                                                                                                                     |
| LINE                    | 5000                           | UTF-16 units                                                                                                                         | 32 × 16          | Third-party source, not confirmed officially                                                                                                                                     |
| Bluesky                 | 300 graphemes (and 3000 bytes) | Graphemes                                                                                                                            | 20 × 12          | Third-party source, not confirmed officially                                                                                                                                     |

Suggested sizes are estimates: the columns are about twice the rows, taking the largest size that still fits the limit if every cell held the heaviest character, up to 32 × 16. There is no reliable data on how wide chat bubbles are, which font they use or how many lines they show, so none of that is modelled; the real post may still wrap, so test on your target platform and adjust. Platform rules can change; the official announcements are authoritative.

### Import

Click **Import** and choose **Image** or **Text**. Importing **replaces the whole canvas** and can be undone. While the panel is open the button reads **Cancel**; click it again to close the panel.

- **Image** (up to 25 MB): placed whole and centered on the current canvas, keeping its colors and the grid size, then converted with the current style. An opaque photo fills every cell, so with color it mostly becomes large areas of solid characters.
- **Text** (up to 2 MB): paste existing ASCII art, or open a `.txt` or `.ans` file. The canvas becomes the size of the text (longest line × number of lines, at least 8 × 4; anything beyond 200 × 100 is cut off, with a message), and the text is drawn in the current pen color, each character in its own cell. If you import braille or block characters and export in the Braille or Blocks style, you get the original text back. Full-width characters (CJK, full-width symbols, emoji) take two cells; ANSI color codes are ignored, so colors are not restored.
- You can also **drag an image or a text file onto the canvas**, or press `Ctrl+V` to paste an image from the clipboard. While a text field has the focus, pasting works as usual.

### Export

Click **Export** (the button reads **Cancel** while it is open), choose a format, then **Copy** or **Download**:

| Format     | Copy                                                                                                                         | Download         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| Plain text | Ready to paste into a chat or social post; affected by the space substitute and the ``` block, and checked against the limit | `text-draw.txt`  |
| HTML       | Source of a colored `<pre>`                                                                                                  | `text-draw.html` |
| ANSI       | Text with color escape sequences, good for terminals                                                                         | `text-draw.ans`  |
| Image      | A PNG on the clipboard                                                                                                       | `text-draw.png`  |

**Space substitute**: chat apps often swallow spaces, so you can choose **Standard** (U+0020), **No-break** (U+00A0) or **Braille** (U+2800) spaces for the blank cells. Trailing spaces on a line are trimmed while leading and inner ones are kept, so indentation survives. The ⓘ next to it explains each option.

**Image (PNG)**: transparent background, cropped to the characters plus one cell of margin, at 2× resolution, drawn exactly as you see it on screen. The ink color follows the current theme (dark ink on the light theme, light ink on the dark theme) while colored strokes keep their color, so an image exported on the dark theme can be hard to read on a white background.

### Interface language

The interface is available in **English, Traditional Chinese and Japanese**. On the first visit it follows your browser's language (any Chinese shows Traditional Chinese, any other language shows English). The language menu at the right of the header switches it by hand, and your choice is remembered in the browser. You can also add `?lang=ja`, `?lang=zh-TW` or `?lang=en` to the address; that takes priority over the remembered choice.

### Phones and small screens

When the screen is less than 700 px tall (a phone on its side, for example) the toolbar becomes a bottom sheet: tap the handle or swipe up to open it, tap the canvas, press `Esc` or swipe down to close it.

### Browser support and known limits

- Mainly tested in Chromium-based browsers. Copying an image needs HTTPS and a browser with `ClipboardItem`; if it is not supported or is refused, the image is downloaded instead.
- Braille, block and space characters have different widths on different platforms and in different fonts, so a pasted result may not line up with the canvas (indentation, the width of spaces, the overall proportions). To share exactly what you see, use **Image**, or test on the target platform and pick the space substitute that works best.
- The lightest dot of the Dots style (`·`) and any `·` in Custom characters are replaced by `.`.

## Development

Needs Node ≥ 22 and [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm exec playwright install chromium   # only needed for the browser tests
pnpm dev            # development server (Vite)
pnpm build          # type check + bundle into dist/
pnpm preview        # preview the bundle
pnpm test           # all tests
pnpm test:unit      # unit tests (Node)
pnpm test:browser   # browser tests (Vitest browser mode + Playwright Chromium)
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm typecheck      # tsc --noEmit
```

If the browser tests cannot start because system libraries are missing (common on WSL), run `sudo ./node_modules/.bin/playwright install-deps chromium`.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the project structure, the conversion pipeline, translations and tests.

## License

[MIT License](LICENSE), Copyright (c) 2026 laughtree.

### Fonts

The interface and canvas use these fonts (bundled with the site through [`@fontsource`](https://fontsource.org/)), all under the [SIL Open Font License 1.1](https://openfontlicense.org/):

- [IBM Plex Mono / IBM Plex Sans](https://github.com/IBM/plex)
- [Noto Sans TC / Noto Sans JP](https://github.com/notofonts/noto-cjk)
