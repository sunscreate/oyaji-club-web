import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { processImage } from '../../lib/imageCompress'
import { Button, Card, ErrorText, Field, Input, PageTitle, Select, Spinner, Textarea } from '../../components/ui'
import type { EventRow } from '../../types'
import type { FeeType } from '../../lib/fee'

const TIME_OPTIONS = (() => {
  const a: string[] = ['']
  for (let h = 6; h <= 21; h++) for (const m of ['00', '30']) a.push(`${String(h).padStart(2, '0')}:${m}`)
  return a
})()

const MEDIA_BUCKET = 'event-media'

export default function StaffEventForm() {
  const { id } = useParams<{ id: string }>()
  const editing = !!id
  const { profile } = useAuth()
  const nav = useNavigate()

  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const [f, setF] = useState({
    title: '', event_date: '', start_time: '', end_time: '', place: '', description: '',
    target: 'both', attendance_enabled: true, is_annual: false, belongings: '', rain_info: '', notes: '',
    photos_enabled: true, survey_enabled: false,
  })
  const [feeType, setFeeType] = useState<FeeType>('household')
  const [feeHousehold, setFeeHousehold] = useState('')
  const [feeAdult, setFeeAdult] = useState('')
  const [feeChild, setFeeChild] = useState('')

  // 告知メディア
  const [mediaKind, setMediaKind] = useState<string | null>(null)
  const [mediaPath, setMediaPath] = useState<string | null>(null)
  const [mediaName, setMediaName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) return
    ;(async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
      const e = data as (EventRow & { media_kind?: string | null }) | null
      if (e) {
        setF({
          title: e.title, event_date: e.event_date, start_time: e.start_time ?? '', end_time: e.end_time ?? '', place: e.place ?? '',
          description: e.description ?? '', target: e.target, attendance_enabled: e.attendance_enabled,
          is_annual: e.is_annual, belongings: e.belongings ?? '', rain_info: e.rain_info ?? '', notes: e.notes ?? '',
          photos_enabled: e.photos_enabled, survey_enabled: e.survey_enabled,
        })
        const cfg = (e.fee_config ?? {}) as { household?: number; adult?: number; child?: number }
        setFeeType(e.fee_type === 'none' ? 'none' : e.fee_type === 'per_person' ? 'per_person' : 'household')
        setFeeHousehold(cfg.household != null ? String(cfg.household) : '')
        setFeeAdult(cfg.adult != null ? String(cfg.adult) : '')
        setFeeChild(cfg.child != null ? String(cfg.child) : '')
        setMediaPath(e.image_path ?? null)
        setMediaKind(e.media_kind ?? null)
      }
      setLoading(false)
    })()
  }, [editing, id])

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF((p) => ({ ...p, [k]: v })) }

  async function uploadMedia(eventId: string): Promise<{ path: string; kind: string } | null> {
    const file = fileRef.current?.files?.[0]
    if (!file) return null
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (isPdf) {
      const key = `${eventId}/${crypto.randomUUID()}.pdf`
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(key, file, { contentType: 'application/pdf', upsert: true })
      if (up.error) throw up.error
      return { path: key, kind: 'pdf' }
    }
    const { full } = await processImage(file)
    const key = `${eventId}/${crypto.randomUUID()}.webp`
    const up = await supabase.storage.from(MEDIA_BUCKET).upload(key, full, { contentType: 'image/webp', upsert: true })
    if (up.error) throw up.error
    return { path: key, kind: 'image' }
  }

  async function save(status: 'draft' | 'published') {
    setErr('')
    if (!f.title.trim() || !f.event_date) { setErr('イベント名と開催日は必須です。'); return }
    setBusy(true)
    try {
      const fee_config = feeType === 'none'
        ? {}
        : feeType === 'per_person'
        ? { adult: Number(feeAdult) || 0, child: Number(feeChild) || 0 }
        : { household: Number(feeHousehold) || 0 }
      const payload = {
        ...f,
        title: f.title.trim(),
        start_time: f.start_time || null,
        end_time: f.end_time || null,
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
      let eventId = id as string | undefined
      const savePayload = async (p: typeof payload) => {
        if (editing) {
          const { error } = await supabase.from('events').update(p).eq('id', id)
          if (error) throw error
          return eventId
        }
        const { data, error } = await supabase.from('events').insert(p).select('id').single()
        if (error) throw error
        return (data as { id: string }).id
      }
      try {
        eventId = await savePayload(payload)
      } catch (e) {
        if (!(e instanceof Error) || !e.message.includes('end_time')) throw e
        const { end_time: _endTime, ...legacyPayload } = payload
        eventId = await savePayload(legacyPayload as typeof payload)
      }
      // 告知メディアのアップロード
      const media = await uploadMedia(eventId!)
      if (media) {
        await supabase.from('events').update({ image_path: media.path, media_kind: media.kind }).eq('id', eventId)
      }
      setBusy(false)
      nav('/staff')
    } catch (e) {
      setBusy(false)
      setErr(`保存に失敗しました: ${(e as Error).message}`)
    }
  }

  async function removeMedia() {
    if (!mediaPath) { setMediaName(''); if (fileRef.current) fileRef.current.value = ''; return }
    await supabase.storage.from(MEDIA_BUCKET).remove([mediaPath])
    if (editing) await supabase.from('events').update({ image_path: null, media_kind: null }).eq('id', id)
    setMediaPath(null); setMediaKind(null); setMediaName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/staff/events" className="text-sm text-gray-500">← イベント管理</Link>
      <PageTitle>{editing ? 'イベントを編集' : 'イベントを作成'}</PageTitle>
      <Card>
        <div className="space-y-4">
          <Field label="イベント名 *">
            <Input value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="おやじキャンプフェス" />
          </Field>

          <Field label="開催日 *">
            <Input type="date" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="開始時間">
              <Select value={f.start_time} onChange={(e) => set('start_time', e.target.value)}>
                <option value="">未定</option>
                {TIME_OPTIONS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="終了時間">
              <Select value={f.end_time} onChange={(e) => set('end_time', e.target.value)}>
                <option value="">未定</option>
                {TIME_OPTIONS.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </Field>
          </div>

          <Field label="場所">
            <Input value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="園庭" />
          </Field>

          {/* 告知メディア（画像 or PDF） */}
          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-sm font-bold text-gray-700">告知の画像・チラシ（画像 または PDF）</p>
            <p className="mb-2 text-xs text-gray-500">イベントページの先頭に表示されます。</p>
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif,application/pdf" hidden
              onChange={(e) => setMediaName(e.target.files?.[0]?.name ?? '')} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" className="w-auto px-4" onClick={() => fileRef.current?.click()}>
                {mediaName ? `📎 ${mediaName}` : mediaPath ? `現在: ${mediaKind === 'pdf' ? 'PDF' : '画像'}（変更する）` : '画像・PDFを選択'}
              </Button>
              {(mediaName || mediaPath) && (
                <Button type="button" variant="danger" className="w-auto px-4" onClick={removeMedia}>削除</Button>
              )}
            </div>
          </div>

          <Field label="説明（任意）">
            <Textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} />
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
            <Select value={feeType} onChange={(e) => setFeeType(e.target.value as FeeType)}>
              <option value="none">参加費を取らない</option>
              <option value="household">1世帯あたり</option>
              <option value="per_person">大人・子ども別</option>
            </Select>
            {feeType === 'none' ? (
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-gray-600">このイベントは参加費なしとして扱います。受付・集金の集計は行いません。</p>
            ) : feeType === 'household' ? (
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
          <ToggleRow label="写真共有を使う" checked={f.photos_enabled} onChange={(v) => set('photos_enabled', v)} />
          <ToggleRow label="アンケートを使う" checked={f.survey_enabled} onChange={(v) => set('survey_enabled', v)} />
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
