import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadRoster, upsertDayRecord, type RosterEntry } from '../../lib/roster'
import { yen } from '../../lib/fee'
import { Card, PageTitle, Select, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

const REASONS = ['食材不足', '遅れて参加', '一部のみ参加', 'その他']

export default function StaffAccounting() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [entries, setEntries] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const { event, entries } = await loadRoster(id)
    setEvent(event)
    setEntries(entries)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) return <Spinner />
  if (event?.fee_type === 'none') {
    return (
      <div className="space-y-4">
        <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
        <PageTitle>当日会計</PageTitle>
        <Card>
          <p className="font-extrabold">このイベントは参加費なしです。</p>
          <p className="mt-2 text-sm text-gray-600">当日の集金集計は不要です。参加者は名簿で確認できます。</p>
          <Link to={`/staff/events/${id}/participants`} className="mt-4 block rounded-xl bg-brand-red px-4 py-3 text-center font-bold text-white">参加名簿を見る</Link>
        </Card>
      </div>
    )
  }

  const paid = entries.filter((e) => e.record?.paid)
  const normalBase = paid.reduce((s, e) => s + e.normal, 0)
  const actualSum = paid.reduce((s, e) => s + (e.record?.amount_actual ?? e.normal), 0)
  const adjust = actualSum - normalBase
  const changed = paid.filter((e) => (e.record?.amount_actual ?? e.normal) !== e.normal)

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <PageTitle>当日会計</PageTitle>

      <Card>
        <div className="grid grid-cols-2 gap-2 text-center">
          <M label="受取済" value={`${paid.length}世帯`} />
          <M label="通常料金ベース" value={yen(normalBase)} />
          <M label="実際の受取" value={yen(actualSum)} />
          <M label="調整額" value={`${adjust >= 0 ? '+' : ''}${yen(adjust)}`} accent={adjust !== 0} />
        </div>
        {changed.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-sm font-bold text-gray-500">料金変更した世帯</p>
            <ul className="space-y-1 text-sm">
              {changed.map((e) => (
                <li key={`${e.kind}:${e.refId}`} className="flex justify-between gap-2">
                  <span className="font-bold">{e.name}</span>
                  <span className="text-gray-600">{yen(e.normal)}→{yen(e.record?.amount_actual ?? e.normal)}{e.record?.change_reason ? `（${e.record.change_reason}）` : ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {entries.map((e) => (
          <AccountingRow key={`${e.kind}:${e.refId}`} eventId={id!} entry={e} onSaved={load} />
        ))}
      </div>
    </div>
  )
}

function M({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 py-2">
      <p className={`text-lg font-extrabold ${accent ? 'text-brand-red' : ''}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function AccountingRow({ eventId, entry, onSaved }: { eventId: string; entry: RosterEntry; onSaved: () => Promise<void> }) {
  const initial = entry.record?.amount_actual ?? entry.normal
  const [amount, setAmount] = useState(String(initial))
  const [reason, setReason] = useState(entry.record?.change_reason ?? '')
  const [busy, setBusy] = useState(false)

  const paid = !!entry.record?.paid
  const changed = Number(amount) !== entry.normal

  async function markPaid() {
    setBusy(true)
    await upsertDayRecord(eventId, entry, {
      amount_actual: Number(amount) || 0,
      change_reason: changed ? (reason || 'その他') : null,
      paid: true,
      paid_at: new Date().toISOString(),
    })
    setBusy(false)
    await onSaved()
  }

  async function undo() {
    setBusy(true)
    await upsertDayRecord(eventId, entry, { paid: false, paid_at: null })
    setBusy(false)
    await onSaved()
  }

  return (
    <Card className={paid ? 'border-2 border-green-500' : ''}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="font-extrabold">{entry.name}</p>
          <p className="text-sm text-gray-500">大人{entry.adults} 子ども{entry.children} ・ 通常 {yen(entry.normal)}</p>
        </div>
        {paid && <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">受取済</span>}
      </div>

      {paid ? (
        <div className="flex items-center justify-between">
          <p className="text-lg font-extrabold">受取 {yen(entry.record?.amount_actual ?? entry.normal)}{(entry.record?.amount_actual ?? entry.normal) !== entry.normal ? `（${entry.record?.change_reason ?? ''}）` : ''}</p>
          <button onClick={undo} disabled={busy} className="text-sm text-gray-400">取消</button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">今回の金額</span>
            <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 rounded-xl border border-gray-300 px-3 py-2 text-right text-lg font-bold" />
            <span className="text-sm text-gray-500">円</span>
          </div>
          {changed && (
            <Select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">変更理由を選択</option>
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          )}
          <button onClick={markPaid} disabled={busy} className="w-full rounded-xl bg-brand-red py-3 font-bold text-white">受取済みにする</button>
        </div>
      )}
    </Card>
  )
}
