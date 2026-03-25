'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function MemberLookup() {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = memberId.trim()
    if (id) router.push(`/members/${id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Member UUID"
        value={memberId}
        onChange={(e) => setMemberId(e.target.value)}
        className="border border-gray-300 rounded px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white rounded px-3 py-1.5 text-sm hover:bg-blue-700 transition-colors"
      >
        Look up
      </button>
    </form>
  )
}
