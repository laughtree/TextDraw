import { containRect } from './grid';
import { pushUndo } from './history';
import { state } from './state';
import { bctx } from './surface';
import { commitText } from './text';
import { t } from './i18n';
import { toast } from './ui/toast';

const MAX_BYTES = 25 * 1024 * 1024;

/** Replace the canvas with a picture, whole and centred; the grid stays as it is. */
export async function importImage(file: Blob): Promise<boolean> {
  if (file.size > MAX_BYTES) {
    toast(t('toast.imageTooBig'));
    return false;
  }
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    toast(t('toast.imageUnreadable'));
    return false;
  }
  try {
    if (!bmp.width || !bmp.height) {
      toast(t('toast.imageUnreadable'));
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
    toast(t('toast.imageDone'));
    return true;
  } finally {
    bmp.close();
  }
}
