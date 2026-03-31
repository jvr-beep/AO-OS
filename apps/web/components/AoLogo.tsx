// AO Logo SVG component for consistent brand use
export function AoLogo({ className = '', ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AO Logo"
      {...props}
    >
      <circle cx="32" cy="32" r="30" stroke="#1DE9B6" strokeWidth="2" fill="none" />
      <path
        d="M32 14L44 44H20L32 14Z"
        fill="#1DE9B6"
        fillOpacity="0.15"
        stroke="#1DE9B6"
        strokeWidth="2"
      />
      <circle cx="32" cy="34" r="6" stroke="#1DE9B6" strokeWidth="2" fill="none" />
    </svg>
  )
}
