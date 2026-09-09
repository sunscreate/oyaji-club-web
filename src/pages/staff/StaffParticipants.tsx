import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateJP } from '../../lib/format'
import { Card, EmptyState, Spinner } from '../../components/ui'
import type { Allergy } from '../../types'

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!id) return
      const { data: ev } = await supabase.from('events').select('title,event_date').eq('id', id).maybeSingle()
      if (ev) { setTitle((ev as { title: string }).title); setDateStr((ev as { event_date: string }).event_date) }
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

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="世帯" value={attendingParts.length} />
          <Stat label="大人" value={adults} />
          <Stat label="子ども" value={kids} />
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">合計 {adults + kids} 人</p>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">参加世帯</h2>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
