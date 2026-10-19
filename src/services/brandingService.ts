import { deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { now, requireUid, settleWrite, userCollectionDoc } from './db';

// The invoice letterhead lives in its own document (users/{uid}/branding/letterhead) so a large
// image can't push the profile document past Firestore's 1 MB limit.

export type LetterheadAlign = 'left' | 'center' | 'right';

export interface Letterhead {
  image: string; // data URL (PNG or JPEG)
  height: number; // header height in px on the invoice (scaled for the PDF)
  margin: number; // side margin in px around the image
  align: LetterheadAlign;
  showDetails: boolean; // repeat the business name and contact details under the letterhead
  updated_at?: string;
}

export const LETTERHEAD_LIMITS = { minHeight: 60, maxHeight: 220, maxMargin: 64 };
export const DEFAULT_LETTERHEAD: Omit<Letterhead, 'image'> = { height: 120, margin: 0, align: 'center', showDetails: true };

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1600;
const MAX_STORED_BYTES = 450 * 1024;

export function subscribeToLetterhead(uid: string, onChange: (letterhead: Letterhead | null) => void): () => void {
  return onSnapshot(
    userCollectionDoc(uid, 'branding', 'letterhead'),
    (snapshot) => onChange(snapshot.exists() ? (snapshot.data() as Letterhead) : null),
    (error) => {
      console.warn('Error loading letterhead:', error);
      onChange(null);
    }
  );
}

export async function saveLetterhead(letterhead: Letterhead): Promise<void> {
  const uid = await requireUid();
  await settleWrite(setDoc(userCollectionDoc(uid, 'branding', 'letterhead'), { ...letterhead, updated_at: now() }));
}

export async function removeLetterhead(): Promise<void> {
  const uid = await requireUid();
  await settleWrite(deleteDoc(userCollectionDoc(uid, 'branding', 'letterhead')));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image couldn't be read. Try a PNG or JPG."));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("That file couldn't be read."));
    reader.readAsDataURL(file);
  });
}

// Shrinks a PNG/JPG to at most 1600px wide and ~450 KB, keeping PNG transparency when it fits.
// Also returns the original size, so the settings panel can warn about small or tall images.
export async function prepareLetterheadImage(file: File): Promise<{ image: string; width: number; height: number }> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Use a PNG or JPG image.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Image must be smaller than 5 MB.');
  const source = await readAsDataUrl(file);
  const img = await loadImage(source);
  const size = { width: img.naturalWidth, height: img.naturalHeight };
  const scale = Math.min(1, MAX_WIDTH / img.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { image: source, ...size };

  if (file.type === 'image/png') {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = canvas.toDataURL('image/png');
    if (png.length * 0.75 <= MAX_STORED_BYTES) return { image: png, ...size };
  }
  // JPEG on white (letterheads print on white paper), stepping quality down until it fits
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const quality of [0.9, 0.8, 0.7, 0.6, 0.5]) {
    const jpeg = canvas.toDataURL('image/jpeg', quality);
    if (jpeg.length * 0.75 <= MAX_STORED_BYTES) return { image: jpeg, ...size };
  }
  throw new Error('That image is too detailed to store. Try a simpler or smaller letterhead.');
}
