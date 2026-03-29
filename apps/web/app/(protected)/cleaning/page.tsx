import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { completeCleaningTaskAction, startCleaningTaskAction } from '@/app/actions/operators'
import type { CleaningTask, Room } from '@/types/api'

export default async function CleaningPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string; q?: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const canManageTasks = session.user?.role === 'operations' || session.user?.role === 'admin'
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error
  const query = searchParams?.q?.trim().toLowerCase() ?? ''

  const [tasks, rooms] = await Promise.all([
    apiFetch<CleaningTask[]>('/cleaning/tasks', token),
    apiFetch<Room[]>('/rooms', token),
  ])

  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const orderedTasks = [...tasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const filteredTasks = query
    ? orderedTasks.filter((task) => {
        const room = roomById.get(task.roomId)
        const roomCode = room?.code.toLowerCase() ?? ''
        const roomName = room?.name.toLowerCase() ?? ''
        const taskType = task.taskType.toLowerCase()
        const status = task.status.toLowerCase()
        const notes = task.notes?.toLowerCase() ?? ''
        return (
          roomCode.includes(query) ||
          roomName.includes(query) ||
          taskType.includes(query) ||
          status.includes(query) ||
          notes.includes(query) ||
          task.roomId.toLowerCase().includes(query)
        )
      })
    : orderedTasks

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-2 text-gray-100">Cleaning</h1>
      <p className="text-sm text-gray-400 mb-6">
        Front desk can view queue status. Operations and admin can start and complete tasks.
      </p>
      <p className="text-xs text-gray-500 mb-4">Task actions (start/complete) allowed roles: operations, admin.</p>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-700 bg-red-900 text-red-200'
              : 'border-green-700 bg-green-900 text-green-200'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Tip: partial matches are supported.</p>
          <form method="get" className="flex flex-col sm:flex-row gap-2">
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="Search by room, task type, status, notes, or room ID"
              className="form-input flex-1"
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
            {searchParams?.q && (
              <Link href="/cleaning" className="btn-secondary text-center">
                Clear Search
              </Link>
            )}
          </form>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ao-dark border-b border-gray-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Created
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Room
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Task Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Notes
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-ao-teal uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                  No cleaning tasks.
                </td>
              </tr>
            ) : (
              filteredTasks.map((task) => {
                const room = roomById.get(task.roomId)

                return (
                  <tr key={task.id} className="hover:bg-gray-700/40 align-top">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/rooms/${task.roomId}`} className="text-ao-teal hover:text-ao-primary transition-colors">
                        {room ? `${room.code} (${room.name})` : task.roomId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{task.taskType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">{task.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      {canManageTasks && task.status === 'open' && (
                        <form action={startCleaningTaskAction} className="flex items-center gap-2">
                          <input type="hidden" name="redirectTo" value="/cleaning" />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="text"
                            name="occurredAt"
                            placeholder="occurredAt (optional)"
                            className="form-input h-8 text-xs w-36"
                          />
                          <button
                            type="submit"
                            className="btn-primary h-8 px-3 text-xs"
                          >
                            Start
                          </button>
                        </form>
                      )}
                      {canManageTasks && task.status === 'in_progress' && (
                        <form action={completeCleaningTaskAction} className="flex items-center gap-2">
                          <input type="hidden" name="redirectTo" value="/cleaning" />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="text"
                            name="notes"
                            placeholder="completion note"
                            className="form-input h-8 text-xs w-36"
                          />
                          <button
                            type="submit"
                            className="btn-primary h-8 px-3 text-xs"
                          >
                            Complete
                          </button>
                        </form>
                      )}
                      {!canManageTasks && <span className="text-xs text-gray-500">View only</span>}
                      {canManageTasks && task.status !== 'open' && task.status !== 'in_progress' && (
                        <span className="text-xs text-gray-500">No actions</span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
