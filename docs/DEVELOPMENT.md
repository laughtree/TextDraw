# 開發說明

Text Draw 是以 Vite 與 TypeScript（strict）寫成的單頁應用，沒有使用前端框架。這份文件說明專案結構、轉換流程、實作上的重點與測試方式；使用方式請見 [README](../README.md)。

## 專案結構

```
index.html          頁面標記（無內嵌 style / script）
src/
  main.ts           進入點：載入字型與樣式、初始化各模組、啟動繪製迴圈
  state.ts          共用的可變狀態（工具、模式、畫布尺寸、轉換結果）
  types.ts          Mode / Palette / Metrics 等共用型別
  convert.ts        畫布像素 → 每格一個字元（純函式，不碰 DOM）
  blocks.ts         方塊字元（濃淡、象限、八分之一）的矩形定義與解析墨量向量（純函式）
  match.ts          每格 2×4 墨量與候選字的比對、點字候選合成（純函式）
  glyphs.ts         字形墨量校準（依實際字型量測，字型或格寬改變時須清快取）
  charsets.ts       各模式使用的字元表
  color.ts          sRGB 亮度計算、hex 工具（純函式）
  theme.ts          讀取 CSS 變數
  surface.ts        畫布 / 暫存層、格寬量測、視窗縮放
  render.ts         轉換後把結果畫到螢幕
  paint.ts          把轉換結果畫成點字、方塊、圓點或文字（螢幕與 PNG 共用同一份）
  png.ts            把轉換結果畫成 PNG（透明背景、裁到內容）
  download.ts       下載檔案
  exportFile.ts     各匯出格式的檔名、類型與 HTML 文件包裝（純函式）
  export.ts         純文字 / HTML / ANSI 輸出（純函式）
  panels.ts         計算展開中的面板佔掉多少舞台高度（讓畫布不隨面板縮小）
  draw.ts           指標事件：自由筆跡、拖曳圖形（預覽用還原基底）、文字工具的點擊
  shapes.ts         直線、圓、方的繪製（外框矩形，純函式部分可測）
  pick.ts           滴管的目標字元選擇（純函式）
  text.ts           文字工具：單行輸入框、即時預覽、畫布上的游標、確定／取消
  caret.ts          文字游標的位置與大小計算（純函式）
  brush.ts          筆寬計算（筆跡與預覽圓圈共用，純函式）
  grid.ts           欄列數的範圍、夾限、緩衝尺寸、縮放與置中計算（純函式）
  snap.ts           把疊層邊緣吸附到整數裝置像素（純函式）
  platforms.ts      各平台字數上限、計數規則與建議尺寸推算（純函式）
  history.ts        復原 / 重做
  sample.ts         把起始畫面（DRAW / TEXT）畫進緩衝
  sampleLayout.ts   起始畫面的版面（純函式：置中、等寬對齊）
  font.ts           起始畫面用的 7×7 等寬點陣字
  textGrid.ts       匯入用：把文字排成逐格的版面、字寬、裁切（純函式）
  importText.ts     文字匯入：撐出格數、逐格把字元畫進緩衝
  importImage.ts    圖片匯入：解碼並置中畫進緩衝
  ui/               各面板與控制項：工具選取（tools.ts）、選色（colors.ts）、滴管（eyedropper.ts）、
                    工具列（controls.ts）、匯出選單（copy.ts）、匯入選單與拖放／貼上（importMenu.ts）、
                    畫布大小（canvasSize.ts）、平台（platform.ts）、小螢幕底部面板（sheet.ts）、
                    按鈕組的滑動選取（segments.ts）、顯示／收起動效（reveal.ts）、提示訊息（toast.ts）、
                    筆刷範圍圓圈（brush.ts）
  styles/           tokens（主題色）/ base / brush / shell / controls / tray / overlays
tests/
  unit/             Node 環境：不碰 DOM 的純函式
  browser/          真實 Chromium（Vitest browser mode + Playwright）：轉換、介面、匯入匯出、版面
legacy/             重構前的單檔版本，僅供對照測試使用
```

## 轉換流程

繪製的內容先畫進一個「繪圖緩衝」（`surface.ts` 的 `buf`），`convert.ts` 再把它轉成字元：

1. 每個儲存格（`cw × ch`，高約為寬的 2.05 倍）取 2×4 個分區的墨量。
2. 依樣式挑字：點字樣式以固定門檻（灰階以 Bayer 抖動）決定每個點；方塊與混合樣式用 `match.ts` 比對每格的 2×4 墨量分佈與候選字的墨量，選誤差最小的；濃淡、圓點、中文、自訂依整格墨量挑；線段樣式依筆跡方向挑。
3. 結果存進 `state.grid`、`state.gridCol`（顯示用顏色）與 `state.gridSrc`（當初畫的顏色，滴管讀這個）。
4. `paint.ts` 把結果畫到螢幕，PNG 匯出共用同一份，所以匯出的圖就是看到的畫面。

方塊與混合的調整參數集中在 `src/match.ts`：`BLANK_BELOW`（低於此墨量留白）、`BRAILLE_MIN`（點字最低墨量）、`TONE_WEIGHT`（整格濃度誤差的權重）。

混合樣式的字集包含方塊（`█ ▀ ▄ ▌ ▐` 與象限組合）、濃淡（`░ ▒ ▓`）、八分之一方塊與點字，不含 ASCII 符號；字形的墨量由字型實際繪出並量測（`glyphs.ts`）。方塊樣式只用方塊類字元，自繪矩形、不依賴字型。八分之一方塊只有「貼底」與「貼左」的長條，所以方塊樣式中段的細水平線會被換成最接近的字或留白。

## 匯入

- 文字：`textGrid.ts` 的 `parseArt` 正規化換行與 tab、移除 ANSI 跳脫序列與零寬字元、依字寬（全形算兩格）排成逐格版面並裁到 200 × 100。`importText.ts` 把畫布設成固定格後逐格畫字：點字畫成比螢幕上略大的圓點（每個點的覆蓋率需明顯高於轉換門檻 0.28，往返才不會掉點）、方塊字元以 `blocks.ts` 的矩形畫、其餘用等寬字型 `fillText`。
- 圖片：`importImage.ts` 以 `createImageBitmap`（依 EXIF 方向）解碼，用 `containRect` 置中等比縮放後畫進緩衝；解碼成功後才記錄復原步驟。
- 匯入前一律先記錄復原快照（緩衝像素與格數設定一起），所以一次復原即可還原。

## 動效與版面

- `src/ui/reveal.ts` 用 Web Animations API 做進出動效：會推擠版面的區塊以高度滑動＋淡入（展開約 200 ms、收起約 150 ms），toast 由上方滑入，提示框由下方滑入，其餘淡入淡出。系統設定「減少動態效果」時完全不播放。
- 收起時 `hidden` 屬性要等動畫結束才設定；判斷是否開啟請用 `isOpen()`，不要直接讀 `hidden`。
- 面板打開時畫布不縮小也不被裁切：滿版模式下，畫布大小取「所有面板都收起時」的舞台高度（`panels.ts` 的 `panelExtra()`），面板只是蓋住畫布的下緣。滑動期間畫布維持原本的像素大小，結束後只在尺寸真的改變時才重新計算。
- 單選按鈕組（`.seg`）與色票選取框的滑動選取由 `src/ui/segments.ts` 負責：監看 `aria-pressed`、量測被選取的按鈕，再移動一層疊在按鈕後面的反白底（`::before`／`::after`，CSS 過渡 200 ms）。疊層的邊緣用 `snap.ts` 吸附到整數裝置像素，與按鈕邊緣對齊；`::before`／`::after` 需要 `box-sizing: border-box`（`base.css`）。頁面載入與版面改變時直接就位、不播放。
- 小螢幕：高度低於 700 px 時（`panels.ts` 的 `SHEET_QUERY`、`tray.css` 的 `@media (max-height: 699px)`），工具列成為固定在底部的面板（`src/ui/sheet.ts`）。收合時只露出把手與兩列常用控制，畫布在它上方；展開時蓋在畫布上，不改變畫布大小，所以此模式下 `panelExtra()` 回傳 0。收合時看不到的列以 `visibility: hidden` 排除在鍵盤與螢幕閱讀器之外。寬度 389 px 以下頂端兩列另有縮小的間距。
- 文字工具編輯時，畫布上有一個閃爍的游標（`#textCaret`，CSS 無限動畫；位置與大小由 `caret.ts` 依字型量測：從高字母（`H d`）頂端到下伸字母（`g p`）底端，乘上目前縮放比例）。「減少動態效果」時不閃爍。
- 測試用 `app.settle()`（等所有動畫結束）取代固定等待；無限動畫（游標閃爍）不會結束，`settle()` 與 `animations()` 會忽略它。

## 目標平台資料

字數上限、計數規則與建議尺寸都在 `src/platforms.ts`，規則變動時只需更新那裡。建議尺寸的算法：欄數約為列數的 2 倍，取最大且「每格都是權重最高的字元加上換行」也不超過上限的列數，列數最多 16、欄數最多 32。各平台聊天泡泡的換行寬度、顯示字型與行數沒有可信資料，因此沒有建模。

## 測試

```bash
pnpm test:unit      # 單元測試（Node）
pnpm test:browser   # 瀏覽器測試
```

- 單元測試涵蓋不碰 DOM 的純函式（轉換比對、匯出、平台計數、格數運算、文字版面、吸附……）。
- 瀏覽器測試把頁面載入 iframe，用合成的指標事件操作，驗證轉換、匯出匯入、動效、版面（`tests/browser/responsive.test.ts` 檢查 320×568 到 1366×768 與橫放手機等尺寸沒有橫向溢出）等。剪貼簿與下載由 `harness.ts` 攔截。
- **對照測試**（`tests/browser/parity.test.ts`）：同時載入 `legacy/index.html`（重構前的單檔版本）與目前版本，餵入相同的筆跡與操作，比對 6 種樣式（點字、濃淡、圓點、中文、線段、自訂）× 色彩／灰階 × 亮／暗主題 × 3 種複製格式與畫布像素，用來確認重構沒有改變行為。刻意不同之處由測試補償：起始畫面不同，所以兩邊先清空；混合與方塊的字集已重新設計，不在比對範圍；舊版 HTML 一律用標準空白，所以比對前把新版的 U+00A0、U+2800 換回空白；舊版的擦除是筆寬的 2.5 倍；舊版頁面沒有 `lang`，測試為它補上與目前頁面相同的 `lang`。若之後刻意改變行為，更新或移除 `legacy/` 與這個測試即可。

## 已知問題

- 圓點樣式最淡的一級（`·`）轉換後會被「折回 ASCII」成 `.`，畫面上因此不會畫出該級圓點，輸出也是 `.`（`src/convert.ts` 結尾的 `·` → `.` 取代作用在所有走到該處的樣式）。
- 自訂字元若包含 `·`，也會被同一段取代成 `.`。
