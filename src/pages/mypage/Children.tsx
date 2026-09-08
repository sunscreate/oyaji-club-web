import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useClasses, classLabel } from '../../hooks/useClasses'
import { Button, Card, Field, Input, PageTitle, Select, Spinner } from '../../components/ui'
import type { Child, MemberType } from '../../types'

export default function Children() {
  const { profile } = useAuth()
  const { classes } = useClasses()
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Child | null>(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.household_id) { setLoading(false); return }
    const { data } = await supabase.from('children').select('*').eq('household_id', profile.household_id).order('created_at')
    setChildren((data ?? []) as Child[])
    setLoading(false)
  }, [profile?.household_id])

  useEffect(() => { load() }, [load])

  async function remove(id: string) {
    await supabase.from('children').delete().eq('id', id)
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/mypage" className="text-sm text-gray-500">← マイページ</Link>
      <PageTitle>子ども・クラス</PageTitle>

      {children.map((c) => (
        <Card key={c.id}>
          {editing?.id === c.id ? (
            <ChildForm classes={classes} initial={c} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); await load() }} householdId={profile!.household_id!} />
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-lg font-bold">{c.full_name}</p>
                <p className="text-sm text-gray-500">{c.status === 'ob' ? `OB${c.grad_year ? `（${c.grad_year}年度卒）` : ''}` : classLabel(classes.find((x) => x.id === c.class_id)) || 'クラス未設定'}</p>
              </div>
              <button onClick={() => setEditing(c)} className="text-sm font-bold text-brand-red">編集</button>
              <button onClick={() => remove(c.id)} className="text-sm text-gray-400">削除</button>
            </div>
          )}
        </Card>
      ))}

      {adding ? (
        <Card>
          <ChildForm classes={classes} onCancel={() => setAdding(false)} onSaved={async () => { setAdding(false); await load() }} householdId={profile!.household_id!} />
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>＋ 子どもを追加</Button>
      )}
    </div>
  )
}

function ChildForm({
  classes, initial, householdId, onCancel, onSaved,
}: {
  classes: ReturnType<typeof useClasses>['classes']
  initial?: Child
  householdId: string
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [fullName, setFullName] = useState(initial?.full_name ?? '')
  const [status, setStatus] = useState<MemberType>(initial?.status ?? 'current')
  const [classId, setClassId] = useState(initial?.class_id ?? '')
  const [gradYear, setGradYear] = useState(initial?.grad_year?.toString() ?? '')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const payload = {
      household_id: householdId,
      full_name: fullName.trim(),
      status,
      class_id: status === 'current' ? (classId || null) : null,
      grad_year: status === 'ob' && gradYear ? Number(gradYear) : null,
    }
    if (initial) await supabase.from('children').update(payload).eq('id', initial.id)
    else await supabase.from('children').insert(payload)
    setBusy(false)
    await onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="氏名">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </Field>
      <Field label="在園 / OB">
        <Select value={status} onChange={(e) => setStatus(e.target.value as MemberType)}>
          <option value="current">在園</option>
          <option value="ob">OB（卒園）</option>
        </Select>
      </Field>
      {status === 'current' ? (
        <Field label="クラス">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">選択してください</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.year}年度 {c.grade} {c.name}</option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="卒園年度">
          <Input type="number" value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2025" />
        </Field>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? '…' : '保存'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>
      </div>
    </form>
  )
}
