import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
        }}
      >
        <span style={{ color: '#c9a96e', fontSize: 18, fontWeight: 300, letterSpacing: 1 }}>
          ΑΩ
        </span>
      </div>
    ),
    { ...size },
  )
}
