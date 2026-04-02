// AO Mark — canonical SVG representation of the Lambda + O mark.
// This is the golden record. Do not alter the geometry.
// The clipPath removes the notch at the Lambda apex.
export function AoLogo({ className = '', color = '#2F8F83', ...props }: React.SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg
      viewBox="0 0 280 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AO"
      {...props}
    >
      <defs>
        {/* Clips the Lambda arms to create the notch at the apex */}
        <clipPath id="ao-notch-clip">
          <path
            clipRule="evenodd"
            d="M 0 0 L 280 0 L 280 300 L 0 300 Z M 124 0 L 156 0 L 156 30 L 124 30 Z"
          />
        </clipPath>
      </defs>

      {/* Lambda (Λ) arms */}
      <g clipPath="url(#ao-notch-clip)">
        <line
          x1="140" y1="22"
          x2="6" y2="274"
          stroke={color}
          strokeWidth="36"
          strokeLinecap="butt"
        />
        <line
          x1="140" y1="22"
          x2="274" y2="274"
          stroke={color}
          strokeWidth="36"
          strokeLinecap="butt"
        />
      </g>

      {/* O ring — centered at the base of the Lambda */}
      <circle
        cx="140"
        cy="216"
        r="60"
        fill="none"
        stroke={color}
        strokeWidth="36"
      />
    </svg>
  )
}
