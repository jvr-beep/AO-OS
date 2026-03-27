import Link from 'next/link'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { completeCleaningTaskAction, startCleaningTaskAction } from '@/app/actions/operators'
import type { CleaningTask, Room } from '@/types/api'

export default async function CleaningPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string }
}) {
  const session = await getSession()
  const token = session.accessToken!
  const canManageTasks = session.user?.role === 'operations' || session.user?.role === 'admin'
  const okMessage = searchParams?.ok
  const errorMessage = searchParams?.error

  const [tasks, rooms] = await Promise.all([
    apiFetch<CleaningTask[]>('/cleaning/tasks', token),
    apiFetch<Room[]>('/rooms', token),
  ])

  const roomById = new Map(rooms.map((room) => [room.id, room]))
  const orderedTasks = [...tasks].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-semibold mb-2">Cleaning</h1>
      <p className="text-sm text-gray-600 mb-6">
        Front desk can view queue status. Operations and admin can start and complete tasks.
      </p>
      <p className="text-xs text-gray-500 mb-4">Task actions (start/complete) allowed roles: operations, admin.</p>

      {(okMessage || errorMessage) && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            errorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {errorMessage ?? okMessage}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Created
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Room
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Task Type
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Notes
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orderedTasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  No cleaning tasks.
                </td>
              </tr>
            ) : (
              orderedTasks.map((task) => {
                const room = roomById.get(task.roomId)

                return (
                  <tr key={task.id} className="hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <Link href={`/rooms/${task.roomId}`} className="text-blue-600 hover:underline">
                        {room ? `${room.code} (${room.name})` : task.roomId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{task.taskType}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">{task.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      {canManageTasks && task.status === 'open' && (
                        <form action={startCleaningTaskAction} className="flex items-center gap-2">
                          <input type="hidden" name="redirectTo" value="/cleaning" />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="text"
                            name="occurredAt"
                            placeholder="occurredAt (optional)"
                            className="h-8 px-2 text-xs border rounded w-36"
                          />
                          <button
                            type="submit"
                            className="h-8 px-3 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-700"
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
                            className="h-8 px-2 text-xs border rounded w-36"
                          />
                          <button
                            type="submit"
                            className="h-8 px-3 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700"
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
