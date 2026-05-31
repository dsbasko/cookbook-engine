import { ImageResponse } from 'next/og';
import { resolveBrandGlyph } from '@/lib/course';
import { loadCourse } from '@/lib/course-loader';
import { DEFAULT_LANG } from '@/lib/lang';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return [{ __metadata_id__: [] }];
}

export default function Icon() {
  const glyph = resolveBrandGlyph(loadCourse(DEFAULT_LANG));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          color: '#faf7f2',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'sans-serif',
          letterSpacing: -1,
          borderRadius: 6,
        }}
      >
        {glyph}
      </div>
    ),
    {
      ...size,
    },
  );
}
