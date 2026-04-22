export default function KioskWelcomePage() {
  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">

        <div className="text-center mb-14">
          <h1 className="text-5xl font-heading tracking-[0.35em] text-text-primary mb-2">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-[0.3em]">Sanctuary</p>
        </div>

        <p className="text-center text-sm text-text-secondary mb-10 leading-relaxed">
          All May Enter Who Honor the House.
        </p>

        {/* Member QR scan — primary path for returning members */}
        <a
          href="/kiosk/scan"
          className="block rounded-lg bg-accent-primary/10 border border-accent-primary/40 hover:border-accent-primary transition-colors p-6 flex items-center gap-5 text-left mb-4"
        >
          <span className="text-3xl text-accent-primary flex-shrink-0">◉</span>
          <div>
            <p className="text-sm font-medium text-text-primary uppercase tracking-wider">Scan Member QR</p>
            <p className="text-xs text-text-muted mt-1">Open the AO app and scan your code — fastest entry</p>
          </div>
        </a>

        <div className="grid grid-cols-2 gap-4 mb-10">
          <a
            href="/kiosk/booking"
            className="rounded-lg bg-surface-1 border border-border-subtle hover:border-accent-primary transition-colors p-6 flex flex-col items-center gap-3 text-center"
          >
            <span className="text-3xl text-accent-primary">◈</span>
            <div>
              <p className="text-sm font-medium text-text-primary uppercase tracking-wider">I Have a Booking</p>
              <p className="text-xs text-text-muted mt-1">Check in with your booking code or phone number</p>
            </div>
          </a>

          <a
            href="/kiosk/identity"
            className="rounded-lg bg-surface-1 border border-border-subtle hover:border-accent-primary transition-colors p-6 flex flex-col items-center gap-3 text-center"
          >
            <span className="text-3xl text-accent-primary">◇</span>
            <div>
              <p className="text-sm font-medium text-text-primary uppercase tracking-wider">Walk In Now</p>
              <p className="text-xs text-text-muted mt-1">No reservation — purchase your pass today</p>
            </div>
          </a>
        </div>

        <p className="text-center text-xs text-text-muted">
          Not yet a member?{' '}
          <a href="/member/login" className="text-accent-primary">
            Join AO
          </a>
        </p>
      </div>
    </div>
  )
}
