import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MapStudioViewer } from './MapStudioViewer'
import { MapStudioAuthoringPanel } from './MapStudioAuthoringPanel'

export default async function MapStudioFloorPage({
  params,
}: {
  params: { floorId: string }
}) {
  const session = await getSession()
  if (!session.accessToken) redirect('/login')
  const canAuthor = session.user?.role === 'operations' || session.user?.role === 'admin'
  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/map-studio" className="text-sm text-accent-primary hover:underline">Map Studio</Link>
        <span className="text-text-muted">/</span>
        <h1 className="text-2xl font-semibold text-text-primary">Floor</h1>
      </div>
      <MapStudioViewer floorId={params.floorId} initialData={null} token={session.accessToken} />
      {canAuthor && (
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3">Authoring</h2>
          <MapStudioAuthoringPanel floorId={params.floorId} token={session.accessToken} />
        </div>
      )}
    </div>
  )
}
