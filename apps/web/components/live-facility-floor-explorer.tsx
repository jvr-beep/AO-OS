'use client'

import { useEffect, useState } from 'react'
import { FacilityFloorExplorer } from '@/components/facility-floor-explorer'
import { getBrowserApiBase, readBrowserAccessToken } from '@/lib/browser-auth'
import { mapFacilityFloorApiToViewModel, type FacilityFloorMap } from '@/lib/facility-floor-map'
import type { FacilityFloorMapResponse } from '@/types/api'

type LiveFacilityFloorExplorerProps = {
  floorPlanId: string
  initialFloor: FacilityFloorMap
}

async function fetchLatestFacilityFloorMap(floorPlanId: string) {
  const accessToken = readBrowserAccessToken()
  if (!accessToken) {
    return null
  }

  const response = await fetch(`${getBrowserApiBase()}/floor-plans/${floorPlanId}/facility-map`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (response.status === 401 || response.status === 403) {
    window.location.assign('/login')
    return null
  }

  if (!response.ok) {
    throw new Error(`Facility map refresh failed with status ${response.status}`)
  }

  return mapFacilityFloorApiToViewModel(await response.json() as FacilityFloorMapResponse)
}

export function LiveFacilityFloorExplorer({ floorPlanId, initialFloor }: LiveFacilityFloorExplorerProps) {
  const [floor, setFloor] = useState(initialFloor)
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'error'>('idle')

  useEffect(() => {
    let isCancelled = false

    async function refreshInBackground() {
      try {
        setRefreshState('refreshing')
        const latest = await fetchLatestFacilityFloorMap(floorPlanId)
        if (!isCancelled && latest) {
          setFloor(latest)
        }
        if (!isCancelled) {
          setRefreshState('idle')
        }
      } catch (error) {
        console.error('Facility floor refresh failed', {
          floorPlanId,
          error: error instanceof Error ? error.message : 'unknown_error',
        })
        if (!isCancelled) {
          setRefreshState('error')
        }
      }
    }

    void refreshInBackground()
    const intervalId = window.setInterval(() => {
      void refreshInBackground()
    }, 20000)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
    }
  }, [floorPlanId])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-text-secondary">
        <div>
          <span className="font-medium text-text-primary">Live floor telemetry</span>
          <span className="ml-2 text-text-muted">Auto-refresh every 20s</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.22em] text-text-muted">{refreshState === 'error' ? 'Refresh delayed' : refreshState === 'refreshing' ? 'Refreshing' : 'Synced'}</span>
          <button
            type="button"
            className="btn-secondary px-3 py-1 text-xs"
            onClick={async () => {
              try {
                setRefreshState('refreshing')
                const latest = await fetchLatestFacilityFloorMap(floorPlanId)
                if (latest) {
                  setFloor(latest)
                }
                setRefreshState('idle')
              } catch (error) {
                console.error('Facility floor manual refresh failed', {
                  floorPlanId,
                  error: error instanceof Error ? error.message : 'unknown_error',
                })
                setRefreshState('error')
              }
            }}
          >
            Refresh now
          </button>
        </div>
      </div>

      <FacilityFloorExplorer floor={floor} />
    </div>
  )
}