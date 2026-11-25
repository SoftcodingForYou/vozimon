// Saving a text file to a folder the player chooses, and picking one to open (browser only).
// Both must be started from a key press, tap or click (browsers only allow file dialogs then).

/** A kind of file of our own, e.g. { description: 'Partida de Vozimón', ext: 'vozimon' }. */
export interface FileKind {
  description: string;
  ext: string;
  alsoOpens?: string[]; // older extensions that can still be opened (e.g. from before a rename)
}

interface SaveHandle {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
}
type SavePicker = (o: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<SaveHandle>;

/** iPhone / iPad (iPadOS reports itself as a Mac with a touch screen). */
const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/**
 * Save text as a file. Where the browser allows it (Chrome, Edge) the player picks the folder;
 * elsewhere it is a normal download (on iPad: the Files / share sheet).
 */
export async function saveTextFile(fileName: string, text: string, kind: FileKind): Promise<'saved' | 'cancelled'> {
  const picker = (window as unknown as { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({ suggestedName: fileName, types: [{ description: kind.description, accept: { 'application/octet-stream': [`.${kind.ext}`] } }] });
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
      return 'saved';
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return 'cancelled';
      // anything else: fall back to a plain download
    }
  }
  // a neutral type, so no browser adds its own extension (".vozimon.json")
  const url = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'saved';
}

/** Let the player pick one of our files and read it as text (null if they cancel). */
export function pickTextFile(kind: FileKind): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    // iOS greys out every file whose extension it doesn't know, so there it shows all files
    if (!isIOS()) input.accept = [kind.ext, ...(kind.alsoOpens ?? [])].map((x) => `.${x}`).join(',');
    input.style.display = 'none';
    document.body.appendChild(input);
    const done = (v: string | null) => {
      input.remove();
      resolve(v);
    };
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return done(null);
      f.text().then(done, () => done(null));
    });
    input.addEventListener('cancel', () => done(null));
    input.click();
  });
}
