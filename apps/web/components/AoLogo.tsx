// AO Mark — canonical SVG representation of the Lambda + O mark.
// Geometry locked to golden record: O is offset right, larger than center,
// extends below the Lambda arm bottoms, right arm passes through the O circle.
export function AoLogo({ className = '', color = '#2F8F83', ...props }: React.SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg
      viewBox="0 0 280 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AO"
      {...props}
    >
      <defs>
        {/* Removes the notch at the Lambda apex */}
        <clipPath id="ao-notch-clip">
          <path
            clipRule="evenodd"
            d="M 0 0 L 280 0 L 280 320 L 0 320 Z M 122 0 L 158 0 L 158 30 L 122 30 Z"
          />
        </clipPath>
      </defs>

      {/* Lambda (Λ) — both arms symmetric, right arm intersects the O */}
      <g clipPath="url(#ao-notch-clip)">
        <line
          x1="130" y1="22"
          x2="6" y2="266"
          stroke={color}
          strokeWidth="34"
          strokeLinecap="butt"
        />
        <line
          x1="130" y1="22"
          x2="258" y2="266"
          stroke={color}
          strokeWidth="34"
          strokeLinecap="butt"
        />
      </g>

      {/* O — shifted right, larger, extends below arm bottoms */}
      <circle
        cx="176"
        cy="235"
        r="76"
        fill="none"
        stroke={color}
        strokeWidth="34"
      />
    </svg>
  )
}
