import { $ } from '../dom';
import { t } from '../i18n';
import { importImage } from '../importImage';
import { importText } from '../importText';
import { stage } from '../surface';
import { closeMenu, setMenu, toggleMenu } from './menus';
import { reveal } from './reveal';
import { toast } from './toast';

const TEXT_FILE = /\.(txt|ans|asc|nfo)$/i;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

/** Whether the target is somewhere typing or pasting text should keep working as usual. */
const isField = (t: EventTarget | null): boolean =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

async function importTextFile(file: File): Promise<void> {
  if (file.size > MAX_TEXT_BYTES) {
    toast(t('toast.textTooBig'));
    return;
  }
  if (await importText(await file.text())) closeMenu('import');
}

/** Send a picked, dropped or pasted file to the importer that understands it. */
async function importFile(file: File): Promise<void> {
  if (file.type.startsWith('image/')) {
    if (await importImage(file)) closeMenu('import');
  } else if (file.type.startsWith('text/') || TEXT_FILE.test(file.name)) {
    await importTextFile(file);
  } else {
    toast(t('toast.unsupported'));
  }
}

function initPanel(): void {
  const panes = { image: $('importImagePane'), text: $('importTextPane') };
  const tabs = [...document.querySelectorAll<HTMLElement>('[data-import]')];
  tabs.forEach(
    (tab) =>
      (tab.onclick = () => {
        const kind = tab.dataset.import as keyof typeof panes;
        tabs.forEach((t) => t.setAttribute('aria-pressed', String(t === tab)));
        reveal(panes.image, kind === 'image', 'collapse');
        reveal(panes.text, kind === 'text', 'collapse');
      }),
  );

  $('bImport').onclick = () => toggleMenu('import');

  const fileImage = $<HTMLInputElement>('fileImage'),
    fileText = $<HTMLInputElement>('fileText');
  $('bPickImage').onclick = () => fileImage.click();
  $('bPickText').onclick = () => fileText.click();
  for (const input of [fileImage, fileText]) {
    input.onchange = () => {
      const file = input.files?.[0];
      input.value = ''; // picking the same file again must fire change again
      if (file) void importFile(file);
    };
  }
  $('bDoImport').onclick = () => {
    void importText($<HTMLTextAreaElement>('importText').value).then(
      (ok) => ok && closeMenu('import'),
    );
  };
}

function initDropAndPaste(): void {
  const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
  let depth = 0;
  stage.addEventListener('dragenter', (e) => {
    if (!hasFiles(e)) return;
    depth++;
    stage.classList.add('dropping');
  });
  stage.addEventListener('dragover', (e) => {
    if (hasFiles(e)) e.preventDefault(); // allow the drop
  });
  stage.addEventListener('dragleave', () => {
    if (--depth <= 0) {
      depth = 0;
      stage.classList.remove('dropping');
    }
  });
  stage.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    depth = 0;
    stage.classList.remove('dropping');
    const file = e.dataTransfer?.files[0];
    if (file) void importFile(file);
  });

  document.addEventListener('paste', (e) => {
    if (isField(e.target)) return; // a normal paste into a text field
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    void importFile(file);
  });
}

export function initImport(): void {
  initPanel();
  setMenu(null); // both buttons start with their plain labels
  initDropAndPaste();
}
