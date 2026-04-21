import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FloorPlanLiveView } from './FloorPlanLiveView'

export default async function FloorPlanDetailPage({
  params,
}: {
  params: { floorPlanId: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/floor-plans" className="text-sm text-accent-primary hover:underline">Floor Plans</Link>
        <span className="text-text-muted">/</span>
        <h1 className="text-2xl font-semibold text-text-primary">Floor Plan</h1>
      </div>
      <FloorPlanLiveView floorPlanId={params.floorPlanId} initialData={null} token={session.accessToken} />
    </div>
  )
}
