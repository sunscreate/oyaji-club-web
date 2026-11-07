import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateJP } from '../../lib/format'
import { Card, EmptyState, Spinner } from '../../components/ui'
import type { Allergy } from '../../types'
import { loadRoster, type RosterEntry } from '../../lib/roster'

interface PMember { participation_id: string; member_kind: string; label: string | null }
interface Part { id: string; household_id: string; join_type: string; planned_time: string | null; note: string | null }

export default function StaffParticipants() {
  const { id } = useParams<{ id: string }>()
  const [title, setTitle] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [parts, setParts] = useState<Part[]>([])
  const [members, setMembers] = useState<PMember[]>([])
  const [households, setHouseholds] = useState<Record<string, string>>({})
  const [allergies, setAllergies] = useState<Allergy[]>([])
  const [entries, setEntries] = useState<RosterEntry[]>([])
  const [ended, setEnded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!id) return
      const { data: ev } = await supabase.from('events').select('title,event_date,end_time').eq('id', id).maybeSingle()
      if (ev) {
        const e = ev as { title: string; event_date: string; end_time: string | null }
        setTitle(e.title); setDateStr(e.event_date); setEnded(eventEnded(e.event_date, e.end_time))
      }
      const roster = await loadRoster(id)
      setEntries(roster.entries)
      const { data: ps } = await supabase.from('participations').select('*').eq('event_id', id)
      const partList = (ps ?? []) as Part[]
      setParts(partList)
      const pIds = partList.map((p) => p.id)
      const hhIds = [...new Set(partList.map((p) => p.household_id))]
      const [{ data: ms }, { data: hh }, { data: al }] = await Promise.all([
        pIds.length ? supabase.from('participation_members').select('participation_id,member_kind,label').in('participation_id', pIds) : Promise.resolve({ data: [] as PMember[] }),
        hhIds.length ? supabase.from('households').select('id,name').in('id', hhIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        hhIds.length ? supabase.from('allergies').select('*').in('household_id', hhIds) : Promise.resolve({ data: [] as Allergy[] }),
      ])
      setMembers((ms ?? []) as PMember[])
      const map: Record<string, string> = {}
      ;((hh ?? []) as { id: string; name: string }[]).forEach((h) => (map[h.id] = h.name))
      setHouseholds(map)
      setAllergies((al ?? []) as Allergy[])
      setLoading(false)
    })()
  }, [id])

  if (loading) return <Spinner />

  const attendingParts = parts.filter((p) => p.join_type !== 'absent')
  const absentParts = parts.filter((p) => p.join_type === 'absent')
  const attendingPartIds = new Set(attendingParts.map((p) => p.id))
  const attendingMembers = members.filter((m) => attendingPartIds.has(m.participation_id))
  const adults = attendingMembers.filter((m) => m.member_kind === 'adult').length
  const kids = attendingMembers.filter((m) => m.member_kind === 'child').length

  return (
    <div className="space-y-4">
      <Link to="/staff/events" className="text-sm text-gray-500">← イベント管理</Link>
      <div>
        <p className="text-sm font-bold text-brand-red">{dateStr && formatDateJP(dateStr)}</p>
        <h1 className="text-xl font-extrabold">{title} 参加状況</h1>
      </div>

      {ended && <FinalResult entries={entries} />}

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="世帯" value={attendingParts.length} />
          <Stat label="大人" value={adults} />
          <Stat label="子ども" value={kids} />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">合計 {adults + kids} 人</p>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">{ended ? '事前の参加登録' : '参加世帯'}</h2>
        {attendingParts.length === 0 ? (
          <EmptyState>まだ参加登録はありません。</EmptyState>
        ) : (
          <div className="space-y-3">
            {attendingParts.map((p) => {
              const mine = members.filter((m) => m.participation_id === p.id)
              return (
                <Card key={p.id}>
                  <p className="font-extrabold">{households[p.household_id] ?? 'ご家族'}</p>
                  <ul className="mt-1 text-gray-700">
                    {mine.map((m, i) => (
                      <li key={i}>{m.member_kind === 'adult' ? '👤' : '🧒'} {m.label}</li>
                    ))}
                  </ul>
                  {p.join_type === 'partial' && (
                    <p className="mt-1 text-sm text-brand-red">途中参加{p.planned_time ? `（${p.planned_time}頃）` : ''}</p>
                  )}
                  {p.note && <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">📝 {p.note}</p>}
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {absentParts.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">参加しない回答（{absentParts.length}世帯）</h2>
          <div className="space-y-3">
            {absentParts.map((p) => (
              <Card key={p.id}>
                <p className="font-extrabold">{households[p.household_id] ?? 'ご家族'}</p>
                {p.note && <p className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">📝 {p.note}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">参加者のアレルギー（{allergies.filter((a) => attendingParts.some((p) => p.household_id === a.household_id)).length}件）</h2>
        {allergies.filter((a) => attendingParts.some((p) => p.household_id === a.household_id)).length === 0 ? (
          <Card><p className="text-gray-500">登録されたアレルギーはありません。</p></Card>
        ) : (
          <Card className="divide-y divide-gray-100 p-0">
            {allergies.filter((a) => attendingParts.some((p) => p.household_id === a.household_id)).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-xs text-gray-400">{households[a.household_id] ?? ''}</span>
                <span className="font-bold">{a.target_name}</span>
                <span className="ml-auto rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-brand-red">{a.content}</span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}

function eventEnded(dateStr: string, endTime: string | null) {
  if (!dateStr) return false
  const end = endTime ? `${dateStr}T${endTime}` : `${dateStr}T23:59:59`
  const t = new Date(end).getTime()
  return !Number.isNaN(t) && t < Date.now()
}

function FinalResult({ entries }: { entries: RosterEntry[] }) {
  const received = entries.filter((e) => e.record?.received)
  const count = received.length
  const adults = received.reduce((s, e) => s + e.adults, 0)
  const kids = received.reduce((s, e) => s + e.children, 0)
  const paid = received.filter((e) => e.record?.paid).length
  return (
    <section>
      <div className="rounded-2xl border-2 border-green-600 bg-green-50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-extrabold text-white">最終結果</span>
          <h2 className="text-base font-extrabold text-green-800">当日受付での実際の参加</h2>
        </div>
        {count === 0 ? (
          <p className="text-sm text-gray-600">当日受付でチェックされた参加者はまだいません。</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="参加世帯" value={count} />
              <Stat label="大人" value={adults} />
              <Stat label="子ども" value={kids} />
            </div>
            <p className="mt-2 text-center text-sm font-bold text-green-800">合計 {adults + kids} 人（集金済 {paid} / {count}）</p>
            <ul className="mt-3 space-y-1">
              {received.map((e) => (
                <li key={`${e.kind}-${e.refId}`} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm">
                  <span className="text-green-600">✅</span>
                  <span className="font-bold">{e.name}</span>
                  <span className="ml-auto text-gray-500">大人{e.adults}・子{e.children}</span>
                  {e.record?.paid && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">集金済</span>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
