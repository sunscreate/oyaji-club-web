import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, ErrorText, Field, Input, PageTitle, Select, Spinner, Textarea } from '../../components/ui'
import type { EventRow } from '../../types'

export default function StaffEventForm() {
  const { id } = useParams<{ id: string }>()
  const editing = !!id
  const { profile } = useAuth()
  const nav = useNavigate()

  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const [f, setF] = useState({
    title: '',
    event_date: '',
    start_time: '',
    place: '',
    description: '',
    target: 'both',
    attendance_enabled: true,
    is_annual: false,
    belongings: '',
    rain_info: '',
    notes: '',
  })
  const [feeType, setFeeType] = useState<'household' | 'per_person'>('household')
  const [feeHousehold, setFeeHousehold] = useState('')
  const [feeAdult, setFeeAdult] = useState('')
  const [feeChild, setFeeChild] = useState('')

  useEffect(() => {
    if (!editing) return
    ;(async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
      const e = data as EventRow | null
      if (e) {
        setF({
          title: e.title, event_date: e.event_date, start_time: e.start_time ?? '', place: e.place ?? '',
          description: e.description ?? '', target: e.target, attendance_enabled: e.attendance_enabled,
          is_annual: e.is_annual, belongings: e.belongings ?? '', rain_info: e.rain_info ?? '', notes: e.notes ?? '',
        })
        const cfg = (e.fee_config ?? {}) as { household?: number; adult?: number; child?: number }
        setFeeType(e.fee_type === 'per_person' ? 'per_person' : 'household')
        setFeeHousehold(cfg.household != null ? String(cfg.household) : '')
        setFeeAdult(cfg.adult != null ? String(cfg.adult) : '')
        setFeeChild(cfg.child != null ? String(cfg.child) : '')
      }
      setLoading(false)
    })()
  }, [editing, id])

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF((p) => ({ ...p, [k]: v })) }

  async function save(status: 'draft' | 'published') {
    setErr('')
    if (!f.title.trim() || !f.event_date) { setErr('イベント名と開催日は必須です。'); return }
    setBusy(true)
    const fee_config = feeType === 'per_person'
      ? { adult: Number(feeAdult) || 0, child: Number(feeChild) || 0 }
      : { household: Number(feeHousehold) || 0 }
    const payload = {
      ...f,
      title: f.title.trim(),
      start_time: f.start_time || null,
      place: f.place || null,
      description: f.description || null,
      belongings: f.belongings || null,
      rain_info: f.rain_info || null,
      notes: f.notes || null,
      fee_type: feeType,
      fee_config,
      status,
      created_by: profile?.id ?? null,
    }
    let error
    if (editing) ({ error } = await supabase.from('events').update(payload).eq('id', id))
    else ({ error } = await supabase.from('events').insert(payload))
    setBusy(false)
    if (error) { setErr(`保存に失敗しました: ${error.message}`); return }
    nav('/staff')
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← お世話係</Link>
      <PageTitle>{editing ? 'イベントを編集' : 'イベントを作成'}</PageTitle>
      <Card>
        <div className="space-y-4">
          <Field label="イベント名 *">
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="おやじキャンプフェス" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="開催日 *">
              <Input type="date" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} />
            </Field>
            <Field label="開始時間">
              <Input value={f.start_time} onChange={(e) => set('start_time', e.target.value)} placeholder="10:00" />
            </Field>
          </div>
          <Field label="場所">
            <Input value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="園庭" />
          </Field>
          <Field label="説明">
            <Textarea rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <Field label="参加対象">
            <Select value={f.target} onChange={(e) => set('target', e.target.value)}>
              <option value="both">在園・OB 両方</option>
              <option value="current">在園のみ</option>
              <option value="ob">OBのみ</option>
            </Select>
          </Field>
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-2 text-sm font-bold text-gray-700">参加費</p>
            <Select value={feeType} onChange={(e) => setFeeType(e.target.value as 'household' | 'per_person')}>
              <option value="household">1世帯あたり</option>
              <option value="per_person">大人・子ども別</option>
            </Select>
            {feeType === 'household' ? (
              <div className="mt-2">
                <Field label="1世帯の金額（円）">
                  <Input type="number" inputMode="numeric" value={feeHousehold} onChange={(e) => setFeeHousehold(e.target.value)} placeholder="500" />
                </Field>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Field label="大人（円）">
                  <Input type="number" inputMode="numeric" value={feeAdult} onChange={(e) => setFeeAdult(e.target.value)} placeholder="500" />
                </Field>
                <Field label="子ども（円）">
                  <Input type="number" inputMode="numeric" value={feeChild} onChange={(e) => setFeeChild(e.target.value)} placeholder="300" />
                </Field>
              </div>
            )}
          </div>

          <Field label="持ち物">
            <Textarea rows={2} value={f.belongings} onChange={(e) => set('belongings', e.target.value)} />
          </Field>
          <Field label="雨天時について">
            <Textarea rows={2} value={f.rain_info} onChange={(e) => set('rain_info', e.target.value)} />
          </Field>
          <Field label="注意事項">
            <Textarea rows={2} value={f.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>

          <ToggleRow label="参加確認を受け付ける" checked={f.attendance_enabled} onChange={(v) => set('attendance_enabled', v)} />
          <ToggleRow label="年間予定に含める（総会・懇親会・お手伝い等）" checked={f.is_annual} onChange={(v) => set('is_annual', v)} />

          <ErrorText>{err}</ErrorText>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => save('draft')} disabled={busy}>下書き保存</Button>
            <Button variant="primary" onClick={() => save('published')} disabled={busy}>公開する</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-left">
      <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${checked ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300'}`}>{checked ? '✓' : ''}</span>
      <span className="font-bold">{label}</span>
    </button>
  )
}
