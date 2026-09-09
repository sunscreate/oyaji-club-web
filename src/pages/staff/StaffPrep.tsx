import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { yen } from '../../lib/fee'
import { Button, Card, Field, Input, PageTitle, Spinner, Textarea } from '../../components/ui'

interface Item {
  id: string; event_id: string; name: string; qty: string | null; planned_cost: number
  assignee: string | null; store: string | null; note: string | null; status: string
}

const STATUS: { v: string; label: string; cls: string }[] = [
  { v: 'todo', label: '未対応', cls: 'bg-gray-200 text-gray-700' },
  { v: 'planned', label: '購入予定', cls: 'bg-brand-yellow text-black' },
  { v: 'bought', label: '購入済み', cls: 'bg-brand-red text-white' },
  { v: 'ready', label: '準備済み', cls: 'bg-green-600 text-white' },
]

export default function StaffPrep() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [budget, setBudget] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [{ data: its }, { data: bg }] = await Promise.all([
      supabase.from('shopping_items').select('*').eq('event_id', id).order('created_at'),
      supabase.from('budgets').select('budget_amount').eq('event_id', id).maybeSingle(),
    ])
    setItems((its ?? []) as Item[])
    setBudget(bg ? String((bg as { budget_amount: number }).budget_amount) : '')
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function saveBudget() {
    await supabase.from('budgets').upsert({ event_id: id, budget_amount: Number(budget) || 0 }, { onConflict: 'event_id' })
    await load()
  }

  async function cycleStatus(it: Item) {
    const i = STATUS.findIndex((s) => s.v === it.status)
    const next = STATUS[(i + 1) % STATUS.length].v
    await supabase.from('shopping_items').update({ status: next }).eq('id', it.id)
    await load()
  }

  async function remove(itemId: string) {
    await supabase.from('shopping_items').delete().eq('id', itemId)
    await load()
  }

  if (loading) return <Spinner />

  const planned = items.reduce((s, i) => s + (i.planned_cost || 0), 0)
  const bought = items.filter((i) => i.status === 'bought' || i.status === 'ready').reduce((s, i) => s + (i.planned_cost || 0), 0)
  const budgetNum = Number(budget) || 0
  const remain = budgetNum - bought
  const doneCount = items.filter((i) => i.status === 'bought' || i.status === 'ready').length

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <PageTitle>準備・買い物</PageTitle>

      <Card>
        <div className={`rounded-2xl p-4 text-center ${remain < 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <p className="text-sm text-gray-500">残予算</p>
          <p className={`text-3xl font-extrabold ${remain < 0 ? 'text-brand-red' : 'text-black'}`}>{yen(remain)}</p>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Metric label="予算" value={yen(budgetNum)} />
          <Metric label="予定支出" value={yen(planned)} />
          <Metric label="購入済み" value={yen(bought)} />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-bold text-gray-700">予算を設定（円）</label>
          <div className="space-y-2">
            <Input type="number" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="60000" />
            <Button variant="ghost" className="py-3 text-base" onClick={saveBudget}>保存</Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm text-gray-500">
            <span>準備の進捗</span><span className="font-bold">{doneCount} / {items.length} 完了</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-600" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
          </div>
        </div>
      </Card>

      {items.map((it) => {
        const st = STATUS.find((s) => s.v === it.status)!
        return (
          <Card key={it.id}>
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="text-lg font-bold">{it.name}{it.qty ? ` ${it.qty}` : ''}</p>
                <p className="text-sm text-gray-500">
                  {it.planned_cost ? yen(it.planned_cost) : '金額未定'}
                  {it.assignee ? ` ・ 担当: ${it.assignee}` : ''}
                  {it.store ? ` ・ ${it.store}` : ''}
                </p>
                {it.note && <p className="mt-1 text-sm text-gray-500">{it.note}</p>}
              </div>
              <button onClick={() => remove(it.id)} className="text-sm text-gray-400">削除</button>
            </div>
            <button onClick={() => cycleStatus(it)} className={`mt-2 rounded-full px-3 py-1 text-sm font-bold ${st.cls}`}>{st.label}（タップで変更）</button>
          </Card>
        )
      })}

      {adding ? (
        <Card><ItemForm eventId={id!} onCancel={() => setAdding(false)} onSaved={async () => { setAdding(false); await load() }} /></Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>＋ 品目を追加</Button>
      )}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 py-2">
      <p className={`text-lg font-extrabold ${accent ? 'text-brand-red' : ''}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function ItemForm({ eventId, onCancel, onSaved }: { eventId: string; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [assignee, setAssignee] = useState('')
  const [store, setStore] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    await supabase.from('shopping_items').insert({
      event_id: eventId, name: name.trim(), qty: qty || null, planned_cost: Number(cost) || 0,
      assignee: assignee || null, store: store || null, note: note || null, status: 'todo',
    })
    setBusy(false)
    await onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="品名"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="焼き鳥" required /></Field>
        <Field label="数量"><Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="300本" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="予定金額（円）"><Input type="number" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} /></Field>
        <Field label="担当者"><Input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="山田" /></Field>
      </div>
      <Field label="購入先"><Input value={store} onChange={(e) => setStore(e.target.value)} /></Field>
      <Field label="備考"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>キャンセル</Button>
        <Button type="submit" disabled={busy}>{busy ? '…' : '追加'}</Button>
      </div>
    </form>
  )
}
