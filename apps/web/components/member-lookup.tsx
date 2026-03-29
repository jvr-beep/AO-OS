'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function MemberLookup() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = query.trim()
    if (!value) return

    const looksLikeId = /^[0-9a-fA-F-]{20,}$/.test(value)
    if (looksLikeId) {
      router.push(`/members/${value}`)
      return
    }

    router.push(`/members?q=${encodeURIComponent(value)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Member UUID, name, email, or AO-#"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
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
