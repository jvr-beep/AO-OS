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
        className="form-input flex-1"
      />
      <button
        type="submit"
        className="btn-primary"
      >
        Look up
      </button>
    </form>
  )
}
