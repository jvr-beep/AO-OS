import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
        }}
      >
        <span style={{ color: '#c9a96e', fontSize: 80, fontWeight: 300, letterSpacing: 4 }}>
          ΑΩ
        </span>
      </div>
    ),
    { ...size },
  )
}
