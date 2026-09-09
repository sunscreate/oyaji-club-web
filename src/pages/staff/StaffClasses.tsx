import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../../lib/supabase'
import { Button, Card, EmptyState, ErrorText, Field, Input, PageTitle, Select, Spinner } from '../../components/ui'
import type { ClassRow } from '../../types'

const GRADES = ['年少', '年中', '年長', '未就園', 'その他']

export default function StaffClasses() {
  const [rows, setRows] = useState<ClassRow[]>([])
  const [editing, setEditing] = useState<ClassRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .order('year', { ascending: false })
      .order('sort_order', { ascending: true })
    setRows((data ?? []) as ClassRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(row: ClassRow) {
    setErr('')
    const { error } = await supabase.from('classes').delete().eq('id', row.id)
    if (error) {
      setErr('このクラスを使っている子どもがいるため削除できません。先に子どものクラスを変更してください。')
      return
    }
    await load()
  }

  async function moveClass(event: DragEndEvent) {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : ''
    if (!overId || activeId === overId) return
    setErr('')
    const from = rows.findIndex((r) => r.id === activeId)
    const to = rows.findIndex((r) => r.id === overId)
    if (from < 0 || to < 0) return
    const next = arrayMove(rows, from, to)
    setRows(next)
    const updates = next.map((row, index) =>
      supabase.from('classes').update({ sort_order: (index + 1) * 10 }).eq('id', row.id),
    )
    const results = await Promise.all(updates)
    const failed = results.find((r) => r.error)
    if (failed?.error) {
      setErr(`並び替えに失敗しました: ${failed.error.message}`)
      await load()
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4 pb-24">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>クラス管理</PageTitle>
      <p className="text-sm text-gray-600">子ども登録で選ぶクラスをここで追加・修正できます。</p>
      <ErrorText>{err}</ErrorText>

      {adding ? (
        <Card>
          <ClassForm
            onCancel={() => setAdding(false)}
            onSaved={async () => { setAdding(false); await load() }}
          />
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>＋ クラスを追加</Button>
      )}

      {rows.length === 0 ? (
        <EmptyState>クラスがまだありません。</EmptyState>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={moveClass}>
          <SortableContext items={rows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 pb-32">
              {rows.map((row) => (
                <SortableClassRow
                  key={row.id}
                  row={row}
                  editing={editing?.id === row.id}
                  onEdit={() => setEditing(row)}
                  onRemove={() => remove(row)}
                >
                  <ClassForm
                    initial={row}
                    onCancel={() => setEditing(null)}
                    onSaved={async () => { setEditing(null); await load() }}
                  />
                </SortableClassRow>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

function SortableClassRow({
  row, editing, onEdit, onRemove, children,
}: {
  row: ClassRow
  editing: boolean
  onEdit: () => void
  onRemove: () => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={isDragging ? 'opacity-60 shadow-lg' : ''}>
        {editing ? children : (
          <div className="flex items-stretch gap-3">
            <button
              type="button"
              className="flex w-16 shrink-0 touch-none flex-col items-center justify-center gap-2 rounded-xl bg-gray-50 px-2 py-4 text-gray-500 active:bg-gray-100"
              aria-label={`${row.grade} ${row.name}を並び替え`}
              {...attributes}
              {...listeners}
            >
              <span className="text-2xl font-extrabold leading-none">≡</span>
              <span className="[writing-mode:vertical-rl] text-xs font-bold tracking-widest">ドラッグ</span>
            </button>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-lg font-extrabold">{row.year}年度 {row.grade} {row.name}</p>
                <p className="text-xs text-gray-500">左のつまみを長押ししてドラッグ</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onEdit} className="rounded-lg bg-red-50 py-2 text-sm font-bold text-brand-red">編集</button>
                <button type="button" onClick={onRemove} className="rounded-lg bg-gray-100 py-2 text-sm font-bold text-gray-500">削除</button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

function ClassForm({
  initial, onCancel, onSaved,
}: {
  initial?: ClassRow
  onCancel: () => void
  onSaved: () => Promise<void>
}) {
  const [year, setYear] = useState(String(initial?.year ?? new Date().getFullYear()))
  const [grade, setGrade] = useState(initial?.grade ?? '年少')
  const [name, setName] = useState(initial?.name ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('クラス名を入力してください。'); return }
    setBusy(true)
    const payload = {
      year: Number(year) || new Date().getFullYear(),
      grade,
      name: name.trim(),
      sort_order: initial?.sort_order ?? 999,
    }
    const { error } = initial
      ? await supabase.from('classes').update(payload).eq('id', initial.id)
      : await supabase.from('classes').insert(payload)
    setBusy(false)
    if (error) {
      setErr(`保存に失敗しました: ${error.message}`)
      return
    }
    await onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="年度">
          <Input type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} required />
        </Field>
        <Field label="学年">
          <Select value={grade} onChange={(e) => setGrade(e.target.value)}>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="クラス名">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="さくら組" required />
      </Field>
      <ErrorText>{err}</ErrorText>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>キャンセル</Button>
        <Button type="submit" disabled={busy}>{busy ? '…' : '保存'}</Button>
      </div>
    </form>
  )
}
