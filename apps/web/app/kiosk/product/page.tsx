import { redirect } from 'next/navigation'
import { getKioskSession } from '@/lib/kiosk-session'
import { selectProductTypeAction } from '../actions/visit'

export default async function ProductTypePage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const session = await getKioskSession()
  if (!session.guestId || !session.waiverCompleted) redirect('/kiosk')

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-lg">

        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading tracking-[0.3em] text-text-primary mb-1">ΑΩ</h1>
          <p className="text-xs text-text-muted uppercase tracking-widest">What Are You Booking?</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <form action={selectProductTypeAction}>
            <input type="hidden" name="productType" value="locker" />
            <button
              type="submit"
              className="w-full rounded-lg bg-surface-1 border border-border-subtle hover:border-accent-primary transition-colors p-8 flex flex-col items-center gap-4 text-center"
            >
              <span className="text-4xl text-accent-primary">◫</span>
              <div>
                <p className="text-sm font-medium text-text-primary uppercase tracking-wider">Locker</p>
                <p className="text-xs text-text-muted mt-1">Shared facilities + personal locker</p>
              </div>
            </button>
          </form>

          <form action={selectProductTypeAction}>
            <input type="hidden" name="productType" value="room" />
            <button
              type="submit"
              className="w-full rounded-lg bg-surface-1 border border-border-subtle hover:border-accent-primary transition-colors p-8 flex flex-col items-center gap-4 text-center"
            >
              <span className="text-4xl text-accent-primary">◻</span>
              <div>
                <p className="text-sm font-medium text-text-primary uppercase tracking-wider">Room</p>
                <p className="text-xs text-text-muted mt-1">Private room with exclusive access</p>
              </div>
            </button>
          </form>
        </div>

        {searchParams.error && (
          <p className="text-critical text-xs text-center mb-4">{searchParams.error}</p>
        )}

        <a href="/kiosk" className="block text-center text-xs text-text-muted uppercase tracking-wider hover:text-text-primary transition-colors">
          Start Over
        </a>
      </div>
    </div>
  )
}
