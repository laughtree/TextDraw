import { containRect } from './grid';
import { pushUndo } from './history';
import { state } from './state';
import { bctx } from './surface';
import { commitText } from './text';
import { toast } from './ui/toast';

const MAX_BYTES = 25 * 1024 * 1024;

/** Replace the canvas with a picture, whole and centred; the grid stays as it is. */
export async function importImage(file: Blob): Promise<boolean> {
  if (file.size > MAX_BYTES) {
    toast('圖片太大（上限 25 MB）');
    return false;
  }
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    toast('無法讀取圖片');
    return false;
  }
  try {
    if (!bmp.width || !bmp.height) {
      toast('無法讀取圖片');
      return false;
    }
    commitText();
    pushUndo(); // only once the picture is known to be good
    const r = containRect(bmp.width, bmp.height, state.W, state.H);
    bctx.clearRect(0, 0, state.W, state.H);
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    bctx.drawImage(bmp, r.x, r.y, r.w, r.h);
    state.dirty = true;
    toast('已匯入圖片');
    return true;
  } finally {
    bmp.close();
  }
}
