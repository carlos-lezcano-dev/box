import { formatTime } from '@/lib/datetime'
import type { Wod } from '@/types/api'

export type PanelWodView = {
  wod_id: string
  title: string
  timeLabel: string
  availableSlots: number
}

export type PanelGeneralView = {
  totalAthletes: number | null
  totalMemberships: number | null
  collectedAmount: number | null
  nextWods: PanelWodView[]
}

export type PanelViewInput = {
  athletesTotal?: number
  membershipsTotal?: number
  wods?: Wod[]
}

/** Las métricas sin fuente confirmada se dejan en `null` y no generan tarjeta. */
export function toPanelGeneralView(input: PanelViewInput): PanelGeneralView {
  return {
    totalAthletes: input.athletesTotal ?? null,
    totalMemberships: input.membershipsTotal ?? null,
    collectedAmount: null,
    nextWods: [...(input.wods ?? [])]
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, 5)
      .map((wod) => ({
        wod_id: wod.wod_id,
        title: wod.title,
        timeLabel: formatTime(wod.start_time),
        availableSlots: wod.available_slots,
      })),
  }
}
