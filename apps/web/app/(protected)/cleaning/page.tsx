import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { getSession } from '@/lib/session'
import { apiFetch } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import type { CleaningTask, Room } from '@/types/api'

async function startTaskAction(formData: FormData) {
  'use server'

  const session = await getSession()
  const taskId = String(formData.get('taskId') ?? '')
  const notesValue = formData.get('notes')
  const notes = typeof notesValue === 'string' ? notesValue.trim() : ''

  if (!session.accessToken || !session.user) return
  if (session.user.role === 'front_desk' || !taskId) return

  await apiFetch(`/cleaning/tasks/${taskId}/start`, session.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      assignedToStaffUserId: session.user.id,
      notes: notes || undefined,
    }),
  })

  revalidatePath('/cleaning')
}

async function completeTaskAction(formData: FormData) {
  'use server'

  const session = await getSession()
  const taskId = String(formData.get('taskId') ?? '')
  const notesValue = formData.get('notes')
  const notes = typeof notesValue === 'string' ? notesValue.trim() : ''

  if (!session.accessToken || !session.user) return
  if (session.user.role === 'front_desk' || !taskId) return

  await apiFetch(`/cleaning/tasks/${taskId}/complete`, session.accessToken, {
    method: 'POST',
    body: JSON.stringify({
      notes: notes || undefined,
    }),
  })

  revalidatePath('/cleaning')
}

export default async function CleaningPage() {
  const session = await getSession()
  const token = session.accessToken!
  const canManageTasks = session.user?.role === 'operations' || session.user?.role === 'admin'

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
                        <form action={startTaskAction} className="flex items-center gap-2">
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="text"
                            name="notes"
                            placeholder="start note"
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
                        <form action={completeTaskAction} className="flex items-center gap-2">
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
