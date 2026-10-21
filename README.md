# ASCIIpaint 字元畫板

在 Canvas 上畫圖，即時轉成 ASCII Art（混合、點字、方塊、濃淡、圓點、中文、線段、自訂字元），
並以純文字 / 彩色 HTML / ANSI 複製，方便預覽在不同平台貼上的效果。

## 開發

需要 Node ≥ 22 與 pnpm。

```bash
pnpm install
pnpm exec playwright install chromium   # 只有跑瀏覽器測試才需要
pnpm dev            # 開發伺服器（Vite）
pnpm build          # 型別檢查 + 打包到 dist/
pnpm preview        # 預覽打包結果
pnpm test           # 全部測試
pnpm test:unit      # 單元測試（Node）
pnpm test:browser   # 瀏覽器測試（Vitest browser mode + Playwright Chromium）
pnpm lint           # ESLint
pnpm format         # Prettier
pnpm typecheck      # tsc --noEmit
```

若瀏覽器測試因缺少系統函式庫而無法啟動（WSL 常見），執行
`sudo ./node_modules/.bin/playwright install-deps chromium`。

## 結構

```
index.html          頁面標記（無內嵌 style / script）
src/
  main.ts           進入點：載入字型與樣式、初始化各模組、啟動繪製迴圈
  state.ts          共用的可變狀態（工具、模式、畫布尺寸、轉換結果）
  types.ts          Mode / Palette / Metrics 等共用型別
  convert.ts        畫布像素 → 每格一個字元（純函式，不碰 DOM）
  glyphs.ts         字形墨量校準（依實際字型量測，字型或格寬改變時須清快取）
  charsets.ts       各模式使用的字元表
  color.ts          sRGB 亮度計算、hex 工具（純函式）
  theme.ts          讀取 CSS 變數
  surface.ts        畫布 / 暫存層、格寬量測、視窗縮放
  render.ts         將轉換結果畫到螢幕（點字、方塊、圓點、文字）
  draw.ts           指標事件與筆跡
  brush.ts          筆寬計算（筆跡與預覽圓圈共用，純函式）
  history.ts        復原 / 重做
  sample.ts         起始畫面（IBM PC 8×8 點陣字）
  export.ts         純文字 / HTML / ANSI 輸出（純函式）
  ui/               工具列、複製選單、提示訊息、筆刷範圍圓圈（brush.ts）
  styles/           tokens（主題色）/ base / brush / shell / controls / tray / overlays
tests/
  unit/             Node 環境：export、color
  browser/          真實 Chromium：convert、parity
legacy/             重構前的單檔版本，僅供對照測試使用
```

## 對照測試（tests/browser/parity.test.ts）

同時載入 `legacy/index.html` 與目前版本，餵入相同的筆跡與操作，逐項比對
8 種模式 × 色彩 / 灰階 × 亮 / 暗主題 × 3 種複製格式、筆跡底圖、空白替代與程式碼區塊，
並比對畫布像素是否一致。重構期間用來確保行為不變；之後若刻意改變行為，更新或移除 `legacy/` 即可。

## 已知問題（重構時發現，未修改）

- 圓點模式最淡的圓點（`·`）轉換後會被「折回 ASCII」成 `.`，導致畫面上不會畫出該級圓點，
  輸出也是 `.`（`src/convert.ts` 結尾的 `·` → `.` 取代作用在所有走到該處的模式）。
- 自訂字元若包含 `·` 也會被同一段取代成 `.`。
