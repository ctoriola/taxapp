import React from 'react';
import type { Letterhead } from '../services/brandingService';

const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

// The letterhead image at the top of an invoice. Plain markup and inline styles only, so it
// prints and exports to PDF exactly as shown.
export default function LetterheadBanner({ letterhead }: { letterhead: Pick<Letterhead, 'image' | 'height' | 'margin' | 'align'> }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: JUSTIFY[letterhead.align],
        alignItems: 'center',
        height: letterhead.height,
        paddingLeft: letterhead.margin,
        paddingRight: letterhead.margin,
      }}
    >
      <img src={letterhead.image} alt="Company letterhead" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
    </div>
  );
}
