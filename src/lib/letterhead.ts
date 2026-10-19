// Recommended letterhead size. Invoices are up to 896px wide and PDFs render at 2x, so a
// 1600 x 200 banner (8:1) fills the width sharply at the default 120px header height.
export const LETTERHEAD_RECOMMENDED = { width: 1600, height: 200 };

const MIN_SHARP_WIDTH = 1000;
// Narrower than this and the image can't fill the invoice width even at the tallest header
const MIN_RATIO = 4;

// A hint about an uploaded image's size, or null when it's fine
export function letterheadSizeTip(width: number, height: number): string | null {
  const size = `Your image is ${width}\u00a0×\u00a0${height}\u00a0px`;
  const recommended = `${LETTERHEAD_RECOMMENDED.width}\u00a0×\u00a0${LETTERHEAD_RECOMMENDED.height}\u00a0px`;
  if (width < MIN_SHARP_WIDTH) return `${size}, so it may look blurry on PDFs and print-outs. For crisp results, use one about ${recommended}.`;
  if (width / height < MIN_RATIO) return `${size}. Tall images are scaled down to fit the header, so they can look small. A wide banner about ${recommended} fills the invoice width.`;
  return null;
}
