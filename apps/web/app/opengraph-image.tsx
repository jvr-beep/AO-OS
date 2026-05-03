import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'AO Sanctuary — Staff Portal'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
        }}
      >
        <span style={{ color: '#c9a96e', fontSize: 120, fontWeight: 300, letterSpacing: 16 }}>
          ΑΩ
        </span>
        <span style={{ color: '#ffffff', fontSize: 36, fontWeight: 300, letterSpacing: 12, marginTop: 8 }}>
          AO SANCTUARY
        </span>
        <span style={{ color: '#555555', fontSize: 18, letterSpacing: 6, marginTop: 16, textTransform: 'uppercase' }}>
          Staff Portal
        </span>
      </div>
    ),
    { ...size },
  )
}
