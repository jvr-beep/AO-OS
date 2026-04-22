import { KioskScanClient } from './KioskScanClient'

export default function KioskScanPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return <KioskScanClient error={searchParams.error} />
}
