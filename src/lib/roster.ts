import { supabase } from './supabase'
import { computeNormal, type FeeConfig } from './fee'
import type { EventRow } from '../types'

export interface DayRecord {
  id: string
  event_id: string
  household_id: string | null
  guest_id: string | null
  received: boolean
  received_at: string | null
  amount_normal: number
  amount_actual: number | null
  change_reason: string | null
  paid: boolean
  paid_at: string | null
}

export interface RosterEntry {
  kind: 'household' | 'guest'
  refId: string           // household_id または guest_id
  name: string
  adults: number
  children: number
  normal: number
  record: DayRecord | null
}

export interface RosterData {
  event: EventRow | null
  entries: RosterEntry[]
}

export async function loadRoster(eventId: string): Promise<RosterData> {
  const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  const event = (ev as EventRow) ?? null
  const feeType = event?.fee_type ?? 'household'
  const cfg = (event?.fee_config ?? {}) as FeeConfig

  const { data: ps } = await supabase.from('participations').select('id,household_id').eq('event_id', eventId)
  const parts = (ps ?? []) as { id: string; household_id: string }[]
  const pIds = parts.map((p) => p.id)
  const hhIds = [...new Set(parts.map((p) => p.household_id))]

  const [{ data: ms }, { data: hh }, { data: gs }, { data: rec }] = await Promise.all([
    pIds.length ? supabase.from('participation_members').select('participation_id,member_kind').in('participation_id', pIds) : Promise.resolve({ data: [] as { participation_id: string; member_kind: string }[] }),
    hhIds.length ? supabase.from('households').select('id,name').in('id', hhIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from('guests').select('*').eq('event_id', eventId),
    supabase.from('day_records').select('*').eq('event_id', eventId),
  ])

  const members = (ms ?? []) as { participation_id: string; member_kind: string }[]
  const nameMap: Record<string, string> = {}
  ;((hh ?? []) as { id: string; name: string }[]).forEach((h) => (nameMap[h.id] = h.name))
  const guests = (gs ?? []) as { id: string; name: string; adults: number; children: number }[]
  const records = (rec ?? []) as DayRecord[]

  // 参加ごとの大人/子ども数
  const countByPart: Record<string, { a: number; c: number }> = {}
  members.forEach((m) => {
    const c = (countByPart[m.participation_id] ??= { a: 0, c: 0 })
    if (m.member_kind === 'adult') c.a++
    else c.c++
  })

  const entries: RosterEntry[] = []

  parts.forEach((p) => {
    const cnt = countByPart[p.id] ?? { a: 0, c: 0 }
    entries.push({
      kind: 'household',
      refId: p.household_id,
      name: nameMap[p.household_id] ?? 'ご家族',
      adults: cnt.a,
      children: cnt.c,
      normal: computeNormal(feeType, cfg, cnt.a, cnt.c),
      record: records.find((r) => r.household_id === p.household_id) ?? null,
    })
  })

  guests.forEach((g) => {
    entries.push({
      kind: 'guest',
      refId: g.id,
      name: `${g.name}（ゲスト）`,
      adults: g.adults,
      children: g.children,
      normal: computeNormal(feeType, cfg, g.adults, g.children),
      record: records.find((r) => r.guest_id === g.id) ?? null,
    })
  })

  entries.sort((a, b) => a.name.localeCompare(b.name, 'ja'))
  return { event, entries }
}

/** day_records を upsert（household は event+household 一意、guest は guest_id で照合） */
export async function upsertDayRecord(
  eventId: string, entry: RosterEntry, patch: Partial<DayRecord>,
): Promise<void> {
  if (entry.record) {
    await supabase.from('day_records').update(patch).eq('id', entry.record.id)
    return
  }
  const base = {
    event_id: eventId,
    household_id: entry.kind === 'household' ? entry.refId : null,
    guest_id: entry.kind === 'guest' ? entry.refId : null,
    amount_normal: entry.normal,
  }
  await supabase.from('day_records').insert({ ...base, ...patch })
}
