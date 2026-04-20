'use client'

import { useEffect, useRef, useState } from 'react'

interface SandboxLocation {
  id: string
  code: string
  name: string
}

interface AccessPoint {
  id: string
  code: string
  name: string
  zoneId: string
  zoneCode: string
  zoneName: string
}

interface ActiveSession {
  sessionId: string
  memberId: string
  memberName: string
  memberEmail: string
  checkInAt: string
}

interface Member {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface EventLogEntry {
  id: string
  ts: string
  type: 'check-in' | 'check-out' | 'reader'
  result: 'allowed' | 'denied' | 'ok' | 'error'
  message: string
}

const SANDBOX_LOCATION_ID = '55000000-0000-0000-0000-000000000001'

export default function SandboxPage() {
  const [location, setLocation] = useState<SandboxLocation | null>(null)
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([])
  const [sessions, setSessions] = useState<ActiveSession[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [eventLog])

  async function loadAll() {
    const [locs, aps, sess] = await Promise.all([
      fetch('/api/simulation/locations').then((r) => r.json()),
      fetch(`/api/simulation/${SANDBOX_LOCATION_ID}/access-points`).then((r) => r.json()),
      fetch(`/api/simulation/${SANDBOX_LOCATION_ID}/sessions`).then((r) => r.json()),
    ])
    setLocation(Array.isArray(locs) ? locs[0] ?? null : null)
    setAccessPoints(Array.isArray(aps) ? aps : [])
    setSessions(Array.isArray(sess) ? sess : [])
  }

  async function searchMembers(q: string) {
    if (q.length < 2) { setMembers([]); return }
    const res = await fetch(`/api/members?q=${encodeURIComponent(q)}`)
    const data = await res.json()
    setMembers(Array.isArray(data) ? data : data.members ?? [])
  }

  function log(entry: Omit<EventLogEntry, 'id' | 'ts'>) {
    setEventLog((prev) => [
      ...prev,
      { ...entry, id: crypto.randomUUID(), ts: new Date().toLocaleTimeString() },
    ])
  }

  async function handleCheckIn() {
    if (!selectedMember) return
    setLoading('check-in')
    try {
      const res = await fetch('/api/simulation/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: selectedMember, locationId: SANDBOX_LOCATION_ID }),
      })
      const data = await res.json()
      if (!res.ok) {
        log({ type: 'check-in', result: 'error', message: data.message ?? data.error ?? 'Check-in failed' })
      } else {
        log({ type: 'check-in', result: 'ok', message: `${data.memberName} checked in` })
        setSessions((prev) => [...prev, {
          sessionId: data.sessionId,
          memberId: data.memberId,
          memberName: data.memberName,
          memberEmail: '',
          checkInAt: data.checkInAt,
        }])
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleCheckOut(session: ActiveSession) {
    setLoading(`out-${session.memberId}`)
    try {
      const res = await fetch('/api/simulation/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: session.memberId, locationId: SANDBOX_LOCATION_ID }),
      })
      const data = await res.json()
      if (!res.ok) {
        log({ type: 'check-out', result: 'error', message: data.message ?? 'Check-out failed' })
      } else {
        log({ type: 'check-out', result: 'ok', message: `${session.memberName} checked out` })
        setSessions((prev) => prev.filter((s) => s.memberId !== session.memberId))
      }
    } finally {
      setLoading(null)
    }
  }

  async function handleFireReader(ap: AccessPoint) {
    if (!selectedMember) return
    const memberName = members.find((m) => m.id === selectedMember)
      ? `${members.find((m) => m.id === selectedMember)!.firstName} ${members.find((m) => m.id === selectedMember)!.lastName}`
      : sessions.find((s) => s.memberId === selectedMember)?.memberName ?? selectedMember

    setLoading(`reader-${ap.id}`)
    try {
      const res = await fetch('/api/simulation/fire-reader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessPointId: ap.id, memberId: selectedMember }),
      })
      const data = await res.json()
      if (!res.ok) {
        log({ type: 'reader', result: 'error', message: `${ap.name}: ${data.message ?? 'Error'}` })
      } else {
        log({
          type: 'reader',
          result: data.decision,
          message: `${ap.name} — ${memberName} → ${data.decision.toUpperCase()}${data.denialReasonCode ? ` (${data.denialReasonCode})` : ''}`,
        })
      }
    } finally {
      setLoading(null)
    }
  }

  const resultColor = (r: EventLogEntry['result']) => {
    if (r === 'allowed' || r === 'ok') return 'text-green-400'
    if (r === 'denied') return 'text-yellow-400'
    return 'text-red-400'
  }

  const resultIcon = (r: EventLogEntry['result']) => {
    if (r === 'allowed' || r === 'ok') return '✓'
    if (r === 'denied') return '✗'
    return '!'
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Sandbox Sensor Panel</h1>
          <p className="text-sm text-text-muted font-sans mt-0.5">
            {location ? location.name : 'Loading...'} — virtual sensor simulation
          </p>
        </div>
        <button onClick={loadAll} className="text-sm text-accent-primary hover:underline">
          Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Member picker + check-in */}
        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Member</h2>
            <input
              type="text"
              placeholder="Search by name or email…"
              value={memberSearch}
              onChange={(e) => {
                setMemberSearch(e.target.value)
                searchMembers(e.target.value)
              }}
              className="w-full bg-surface-secondary border border-border-primary rounded px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent-primary"
            />
            {members.length > 0 && (
              <ul className="mt-1 border border-border-primary rounded bg-surface-secondary divide-y divide-border-primary max-h-48 overflow-y-auto">
                {members.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => {
                        setSelectedMember(m.id)
                        setMemberSearch(`${m.firstName} ${m.lastName}`)
                        setMembers([])
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-tertiary ${selectedMember === m.id ? 'text-accent-primary' : 'text-gray-200'}`}
                    >
                      <div>{m.firstName} {m.lastName}</div>
                      <div className="text-xs text-text-muted">{m.email}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedMember && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCheckIn}
                  disabled={loading === 'check-in'}
                  className="flex-1 btn-primary text-sm py-1.5 disabled:opacity-50"
                >
                  {loading === 'check-in' ? 'Checking in…' : 'Check In'}
                </button>
              </div>
            )}
          </div>

          {/* Active Sessions */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">
              Active Sessions <span className="text-text-muted font-normal">({sessions.length})</span>
            </h2>
            {sessions.length === 0 ? (
              <p className="text-xs text-text-muted">No active sessions</p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => (
                  <li key={s.sessionId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        onClick={() => {
                          setSelectedMember(s.memberId)
                          setMemberSearch(s.memberName)
                          setMembers([])
                        }}
                        className={`text-sm font-medium truncate block hover:text-accent-primary ${selectedMember === s.memberId ? 'text-accent-primary' : 'text-gray-200'}`}
                      >
                        {s.memberName}
                      </button>
                      <p className="text-xs text-text-muted">
                        since {new Date(s.checkInAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCheckOut(s)}
                      disabled={loading === `out-${s.memberId}`}
                      className="text-xs text-red-400 hover:text-red-300 whitespace-nowrap disabled:opacity-50"
                    >
                      Check Out
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Center: Access Points (readers) */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-1">Readers</h2>
          <p className="text-xs text-text-muted mb-3">
            {selectedMember ? 'Click a reader to fire a tap event' : 'Select a member first'}
          </p>
          <div className="space-y-2">
            {accessPoints.map((ap) => (
              <button
                key={ap.id}
                onClick={() => handleFireReader(ap)}
                disabled={!selectedMember || loading === `reader-${ap.id}`}
                className="w-full text-left p-3 rounded border border-border-primary bg-surface-secondary hover:border-accent-primary hover:bg-surface-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-200">{ap.name}</span>
                  {loading === `reader-${ap.id}` && (
                    <span className="text-xs text-text-muted">firing…</span>
                  )}
                </div>
                <span className="text-xs text-text-muted">{ap.zoneName}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Event log */}
        <div className="card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-300">Event Log</h2>
            <button onClick={() => setEventLog([])} className="text-xs text-text-muted hover:text-gray-300">
              Clear
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[480px]">
            {eventLog.length === 0 ? (
              <p className="text-xs text-text-muted">Events will appear here</p>
            ) : (
              eventLog.map((e) => (
                <div key={e.id} className="font-mono text-xs leading-relaxed">
                  <span className="text-text-muted">{e.ts}</span>{' '}
                  <span className={resultColor(e.result)}>[{resultIcon(e.result)}]</span>{' '}
                  <span className="text-gray-300">{e.message}</span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}
