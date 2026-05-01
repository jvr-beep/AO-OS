// Module-level booking state shared across the guest booking flow screens.
// Cleared when the flow completes or user starts over.
export interface TierDuration {
  id: string
  durationMinutes: number
  priceCents: number
}

export const bookingState = {
  tierId: '',
  tierCode: '',
  tierName: '',
  productType: 'room' as 'room' | 'locker',
  basePriceCents: 0,
  durations: [] as TierDuration[],
  durationMinutes: 0,
  priceCents: 0,
  arrivalDate: '',      // YYYY-MM-DD
  guestId: '',
  guestToken: '',
  // Set after payment confirmed
  bookingCode: '',
  arrivalWindowStart: '',
  arrivalWindowEnd: '',
  paidAmountCents: 0,
}

export function clearBookingState() {
  bookingState.tierId = ''
  bookingState.tierCode = ''
  bookingState.tierName = ''
  bookingState.productType = 'room'
  bookingState.basePriceCents = 0
  bookingState.durations = []
  bookingState.durationMinutes = 0
  bookingState.priceCents = 0
  bookingState.arrivalDate = ''
  bookingState.guestId = ''
  bookingState.guestToken = ''
  bookingState.bookingCode = ''
  bookingState.arrivalWindowStart = ''
  bookingState.arrivalWindowEnd = ''
  bookingState.paidAmountCents = 0
}
