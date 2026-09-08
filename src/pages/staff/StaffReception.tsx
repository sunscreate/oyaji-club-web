import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { loadRoster, upsertDayRecord, type RosterEntry } from '../../lib/roster'
import { computeNormal, yen, type FeeConfig } from '../../lib/fee'
import { Button, Card, Field, Input, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function StaffReception() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [entries, setEntries] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [gName, setGName] = useState('')
  const [gAdults, setGAdults] = useState('1')
  const [gChildren, setGChildren] = useState('0')
  const [gPaid, setGPaid] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const { event, entries } = await loadRoster(id)
    setEvent(event)
    setEntries(entries)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggleReceived(entry: RosterEntry) {
    const now = entry.record?.received ? null : new Date().toISOString()
    await upsertDayRecord(id!, entry, { received: !entry.record?.received, received_at: now })
    await load()
  }
  async function togglePaid(entry: RosterEntry) {
    const paid = !entry.record?.paid
    await upsertDayRecord(id!, entry, {
      paid,
      paid_at: paid ? new Date().toISOString() : null,
      received: paid ? true : entry.record?.received ?? false,
      received_at: paid && !entry.record?.received ? new Date().toISOString() : entry.record?.received_at ?? null,
    })
    await load()
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!gName.trim()) return
    setBusy(true)
    const a = Number(gAdults) || 0, c = Number(gChildren) || 0
    const { data, error } = await supabase.from('guests').insert({ event_id: id, name: gName.trim(), adults: a, children: c }).select('id').single()
    if (!error && data) {
      const cfg = (event?.fee_config ?? {}) as FeeConfig
      const normal = computeNormal(event?.fee_type ?? 'household', cfg, a, c)
      const nowIso = new Date().toISOString()
      await supabase.from('day_records').insert({
        event_id: id, guest_id: (data as { id: string }).id,
        received: true, received_at: nowIso, amount_normal: normal,
        paid: gPaid, paid_at: gPaid ? nowIso : null, amount_actual: gPaid ? normal : null,
      })
    }
    setGName(''); setGAdults('1'); setGChildren('0'); setGPaid(false); setAdding(false); setBusy(false)
    await load()
  }

  if (loading) return <Spinner />

  const receivedCount = entries.filter((e) => e.record?.received).length
  const paidEntries = entries.filter((e) => e.record?.paid)
  const collected = paidEntries.reduce((s, e) => s + (e.record?.amount_actual ?? e.normal), 0)

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <PageTitle>当日受付・集金</PageTitle>

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold">{entries.length}</p><p className="text-xs text-gray-500">名簿</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-green-600">{receivedCount}</p><p className="text-xs text-gray-500">受付済</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-brand-red">{paidEntries.length}</p><p className="text-xs text-gray-500">集金済</p></div>
        </div>
        <p className="mt-2 text-center text-sm text-gray-500">集金合計 <span className="font-extrabold text-black">{yen(collected)}</span></p>
      </Card>

      {adding ? (
        <Card>
          <form onSubmit={addGuest} className="space-y-3">
            <p className="text-sm font-bold text-gray-500">当日参加を名簿に追加</p>
            <Field label="お名前"><Input value={gName} onChange={(e) => setGName(e.target.value)} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="大人"><Input type="number" inputMode="numeric" value={gAdults} onChange={(e) => setGAdults(e.target.value)} /></Field>
              <Field label="子ども"><Input type="number" inputMode="numeric" value={gChildren} onChange={(e) => setGChildren(e.target.value)} /></Field>
            </div>
            <button type="button" onClick={() => setGPaid(!gPaid)} className="flex items-center gap-3">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${gPaid ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300'}`}>{gPaid ? '✓' : ''}</span>
              <span className="font-bold">集金済みとして追加</span>
            </button>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>追加</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>キャンセル</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>＋ 当日参加を追加</Button>
      )}

      <div className="space-y-2">
        {entries.map((e) => {
          const received = !!e.record?.received
          const paid = !!e.record?.paid
          return (
            <Card key={`${e.kind}:${e.refId}`}>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="font-bold">{e.name}</p>
                  <p className="text-sm text-gray-500">大人{e.adults} 子ども{e.children} ・ {yen(e.normal)}</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button onClick={() => toggleReceived(e)} className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${received ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
                  {received ? '✓ 受付済' : '受付する'}
                </button>
                <button onClick={() => togglePaid(e)} className={`rounded-xl border-2 px-3 py-2 text-sm font-bold ${paid ? 'border-brand-red bg-red-50 text-brand-red' : 'border-gray-200 text-gray-500'}`}>
                  {paid ? '✓ 集金済' : '集金する'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      <Card><p className="text-xs text-gray-500">金額の変更（食材不足・一部参加など）が必要な場合は「当日会計」で調整できます。</p></Card>
    </div>
  )
}
