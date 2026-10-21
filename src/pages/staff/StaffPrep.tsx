import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { yen } from '../../lib/fee'
import { Button, Card, Field, Input, PageTitle, Spinner, Textarea } from '../../components/ui'

interface Item {
  id: string; event_id: string; name: string; qty: string | null; planned_cost: number
  assignee: string | null; store: string | null; note: string | null; status: string
}

const isPurchased = (it: Item) => it.status === 'bought' || it.status === 'ready'

export default function StaffPrep() {
  const { id } = useParams<{ id: string }>()
  const [items, setItems] = useState<Item[]>([])
  const [budget, setBudget] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

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

  async function togglePurchased(it: Item) {
    const next = isPurchased(it) ? 'todo' : 'bought'
    await supabase.from('shopping_items').update({ status: next }).eq('id', it.id)
    await load()
  }

  async function remove(itemId: string) {
    await supabase.from('shopping_items').delete().eq('id', itemId)
    await load()
  }

  if (loading) return <Spinner />

  const planned = items.reduce((s, i) => s + (i.planned_cost || 0), 0)
  const bought = items.filter(isPurchased).reduce((s, i) => s + (i.planned_cost || 0), 0)
  const budgetNum = Number(budget) || 0
  const remain = budgetNum - bought
  const doneCount = items.filter(isPurchased).length

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
          <div className="flex gap-2">
            <Input type="number" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="60000" className="flex-1" />
            <Button variant="ghost" className="w-auto shrink-0 px-5" onClick={saveBudget}>保存</Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm text-gray-500">
            <span>購入の進捗</span><span className="font-bold">{doneCount} / {items.length} 購入済み</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-green-600" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
          </div>
        </div>
      </Card>

      {items.map((it) => (
        <Card key={it.id}>
          {editingId === it.id ? (
            <ItemForm eventId={id!} initial={it} onCancel={() => setEditingId(null)} onSaved={async () => { setEditingId(null); await load() }} />
          ) : (
            <div className="flex items-start gap-3">
              <button
                onClick={() => togglePurchased(it)}
                aria-label="購入済み"
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${isPurchased(it) ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300 text-transparent'}`}
              >✓</button>
              <div className="flex-1">
                <p className={`text-lg font-bold ${isPurchased(it) ? 'text-gray-400 line-through' : ''}`}>{it.name}{it.qty ? ` ${it.qty}` : ''}</p>
                <p className="text-sm text-gray-500">
                  {it.planned_cost ? yen(it.planned_cost) : '金額未定'}
                  {it.assignee ? ` ・ 担当: ${it.assignee}` : ''}
                  {it.store ? ` ・ ${it.store}` : ''}
                </p>
                {it.note && <p className="mt-1 text-sm text-gray-500">{it.note}</p>}
                <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${isPurchased(it) ? 'bg-brand-red text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {isPurchased(it) ? '購入済み' : '未購入'}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button onClick={() => setEditingId(it.id)} className="text-sm font-bold text-brand-red">編集</button>
                <button onClick={() => remove(it.id)} className="text-sm text-gray-400">削除</button>
              </div>
            </div>
          )}
        </Card>
      ))}

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

function ItemForm({ eventId, initial, onCancel, onSaved }: { eventId: string; initial?: Item; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [qty, setQty] = useState(initial?.qty ?? '')
  const [cost, setCost] = useState(initial?.planned_cost ? String(initial.planned_cost) : '')
  const [assignee, setAssignee] = useState(initial?.assignee ?? '')
  const [store, setStore] = useState(initial?.store ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    const payload = {
      name: name.trim(), qty: qty || null, planned_cost: Number(cost) || 0,
      assignee: assignee || null, store: store || null, note: note || null,
    }
    if (initial) {
      await supabase.from('shopping_items').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('shopping_items').insert({ event_id: eventId, status: 'todo', ...payload })
    }
    setBusy(false)
    await onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {initial && <p className="text-sm font-bold text-gray-500">品目を編集</p>}
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
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? '…' : initial ? '保存' : '追加'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>
      </div>
    </form>
  )
}
