import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useClasses, classLabel } from '../hooks/useClasses'
import { formatDateJP, formatTimeRange } from '../lib/format'
import { feeLabel, type FeeConfig } from '../lib/fee'
import { Button, Card, ErrorText, Field, Input, Spinner, Textarea } from '../components/ui'
import type { Child, ClassRow, EventRow, Profile } from '../types'

interface PMember { id: string; participation_id: string; member_kind: string; profile_id: string | null; child_id: string | null; label: string | null }
interface Part { id: string; household_id: string; join_type: string; planned_time: string | null; note: string | null }

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const { classes } = useClasses()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [parts, setParts] = useState<Part[]>([])
  const [members, setMembers] = useState<PMember[]>([])
  const [households, setHouseholds] = useState<Record<string, string>>({})
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const { data: ev } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
    setEvent((ev as EventRow) ?? null)
    const evRow = ev as (EventRow & { media_kind?: string | null }) | null
    if (evRow?.image_path) {
      const { data: signed } = await supabase.storage.from('event-media').createSignedUrl(evRow.image_path, 3600)
      setMediaUrl(signed?.signedUrl ?? null)
    } else {
      setMediaUrl(null)
    }
    const { data: ps } = await supabase.from('participations').select('*').eq('event_id', id)
    const partList = (ps ?? []) as Part[]
    setParts(partList)
    const pIds = partList.map((p) => p.id)
    const hhIds = [...new Set(partList.map((p) => p.household_id))]
    const [{ data: ms }, { data: hh }] = await Promise.all([
      pIds.length ? supabase.from('participation_members').select('*').in('participation_id', pIds) : Promise.resolve({ data: [] as PMember[] }),
      hhIds.length ? supabase.from('households').select('id,name').in('id', hhIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])
    setMembers((ms ?? []) as PMember[])
    const map: Record<string, string> = {}
    ;((hh ?? []) as { id: string; name: string }[]).forEach((h) => (map[h.id] = h.name))
    setHouseholds(map)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  // 参加人数のリアルタイム更新
  useEffect(() => {
    if (!id) return
    const ch = supabase
      .channel(`event-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participations', filter: `event_id=eq.${id}` }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participation_members' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [id, load])

  if (loading) return <Spinner />
  if (!event) return <Card><p>イベントが見つかりません。</p><Link to="/events" className="text-brand-red underline">一覧へ戻る</Link></Card>

  const householdCount = parts.length
  const peopleCount = members.length
  const myPart = profile?.household_id ? parts.find((p) => p.household_id === profile.household_id) : undefined
  const myMembers = myPart ? members.filter((m) => m.participation_id === myPart.id) : []

  return (
    <div className="space-y-4">
      <div>
        <p className="text-lg font-bold text-brand-red">{formatDateJP(event.event_date)}{formatTimeRange(event.start_time, event.end_time) ? ` ${formatTimeRange(event.start_time, event.end_time)}` : ''}</p>
        <h1 className="text-2xl font-extrabold">{event.title}</h1>
        {event.place && <p className="text-gray-600">📍 {event.place}</p>}
      </div>

      {mediaUrl && (
        event.media_kind === 'pdf' ? (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
            <Card className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <span className="font-extrabold">チラシ（PDF）を開く</span>
              <span className="ml-auto text-gray-400">›</span>
            </Card>
          </a>
        ) : (
          <img src={mediaUrl} alt={event.title} className="w-full rounded-2xl shadow-sm" />
        )
      )}

      {event.description && <Card><p className="whitespace-pre-wrap">{event.description}</p></Card>}

      <InfoRow label="参加費" value={feeText(event.fee_type, event.fee_config as FeeConfig)} />

      <InfoRow label="持ち物" value={event.belongings} />
      <InfoRow label="雨天時" value={event.rain_info} />
      <InfoRow label="注意事項" value={event.notes} />

      {event.photos_enabled && (
        <Link to={`/events/${event.id}/photos`}>
          <Card className="flex items-center gap-3">
            <span className="text-2xl">📷</span>
            <span className="font-extrabold">写真を見る・追加する</span>
            <span className="ml-auto text-gray-400">›</span>
          </Card>
        </Link>
      )}

      {event.survey_enabled && (
        <Link to={`/events/${event.id}/survey`}>
          <Card className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <span className="font-extrabold">アンケートに回答する</span>
            <span className="ml-auto text-gray-400">›</span>
          </Card>
        </Link>
      )}

      {event.attendance_enabled && (
        <Card>
          <h2 className="mb-1 text-sm font-bold text-gray-500">参加予定</h2>
          <p className="text-2xl font-extrabold">
            {householdCount}<span className="ml-1 text-base font-bold text-gray-500">世帯</span>
            <span className="mx-2 text-gray-300">/</span>
            {peopleCount}<span className="ml-1 text-base font-bold text-gray-500">人</span>
          </p>
        </Card>
      )}

      {event.attendance_enabled && (
        <div id="join">
          <ParticipationForm
            eventId={event.id}
            profile={profile}
            classes={classes}
            myPart={myPart}
            myMembers={myMembers}
            onSaved={load}
          />
        </div>
      )}

      {event.attendance_enabled && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">参加予定のご家族</h2>
          {parts.length === 0 ? (
            <Card><p className="text-gray-500">まだ参加登録はありません。</p></Card>
          ) : (
            <div className="space-y-3">
              {parts.map((p) => {
                const kids = members.filter((m) => m.participation_id === p.id && m.member_kind === 'child')
                return (
                  <Card key={p.id}>
                    <p className="font-extrabold">{households[p.household_id] ?? 'ご家族'}</p>
                    {kids.length > 0 ? (
                      <ul className="mt-1 text-gray-700">
                        {kids.map((k) => <li key={k.id}>{k.label}</li>)}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">大人のみ参加</p>
                    )}
                    {p.join_type === 'partial' && (
                      <p className="mt-1 text-sm text-brand-red">途中参加{p.planned_time ? `（${p.planned_time}頃）` : ''}</p>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function feeText(feeType: string, cfg: FeeConfig): string | null {
  const has = (cfg?.household ?? 0) > 0 || (cfg?.adult ?? 0) > 0 || (cfg?.child ?? 0) > 0
  return has ? feeLabel(feeType, cfg) : null
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null
  return (
    <Card>
      <h2 className="mb-1 text-sm font-bold text-gray-500">{label}</h2>
      <p className="whitespace-pre-wrap">{value}</p>
    </Card>
  )
}

function ParticipationForm({
  eventId, profile, classes, myPart, myMembers, onSaved,
}: {
  eventId: string
  profile: Profile | null
  classes: ClassRow[]
  myPart?: Part
  myMembers: PMember[]
  onSaved: () => Promise<void>
}) {
  const [adults, setAdults] = useState<Profile[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [checkedAdults, setCheckedAdults] = useState<Set<string>>(new Set())
  const [checkedChildren, setCheckedChildren] = useState<Set<string>>(new Set())
  const [joinType, setJoinType] = useState<'full' | 'partial'>('full')
  const [plannedTime, setPlannedTime] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!profile?.household_id) { setReady(true); return }
    ;(async () => {
      const [{ data: ad }, { data: ch }] = await Promise.all([
        supabase.from('profiles').select('id,full_name,household_id,member_type,oyaji_member,tshirt_size').eq('household_id', profile.household_id),
        supabase.from('children').select('*').eq('household_id', profile.household_id),
      ])
      setAdults((ad ?? []) as Profile[])
      setChildren((ch ?? []) as Child[])
      setReady(true)
    })()
  }, [profile?.household_id])

  // 既存参加の内容をフォームへ反映（大人=profile_id / 子ども=child_id で照合）
  useEffect(() => {
    if (!myPart) return
    setJoinType(myPart.join_type === 'partial' ? 'partial' : 'full')
    setPlannedTime(myPart.planned_time ?? '')
    setNote(myPart.note ?? '')
    setCheckedAdults(new Set(myMembers.filter((m) => m.member_kind === 'adult' && m.profile_id).map((m) => m.profile_id as string)))
    setCheckedChildren(new Set(myMembers.filter((m) => m.member_kind === 'child' && m.child_id).map((m) => m.child_id as string)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPart?.id, myMembers.length])

  if (!ready) return <Card><Spinner /></Card>
  if (!profile?.household_id) {
    return <Card><p className="text-gray-600">参加登録には世帯情報が必要です。<Link to="/mypage" className="text-brand-red underline">マイページ</Link>で家族・子どもを登録してください。</p></Card>
  }

  const classOf = (cid: string | null) => classes.find((c) => c.id === cid)

  function toggle(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const n = new Set(set)
    n.has(key) ? n.delete(key) : n.add(key)
    setter(n)
  }

  async function save() {
    setErr('')
    if (checkedAdults.size === 0 && checkedChildren.size === 0) { setErr('参加する家族を1人以上選んでください。'); return }
    setBusy(true)
    try {
      // participation を upsert
      const { data: up, error: e1 } = await supabase
        .from('participations')
        .upsert(
          { event_id: eventId, household_id: profile!.household_id, join_type: joinType, planned_time: joinType === 'partial' ? plannedTime : null, note: note || null, created_by: profile!.id },
          { onConflict: 'event_id,household_id' },
        )
        .select('id')
        .single()
      if (e1) throw e1
      const pid = (up as { id: string }).id
      // メンバーを入れ替え
      await supabase.from('participation_members').delete().eq('participation_id', pid)
      const rows = [
        ...adults.filter((a) => checkedAdults.has(a.id)).map((a) => ({ participation_id: pid, member_kind: 'adult', profile_id: a.id, label: a.full_name })),
        ...children.filter((c) => checkedChildren.has(c.id)).map((c) => {
          const cl = classOf(c.class_id)
          return { participation_id: pid, member_kind: 'child', child_id: c.id, label: cl ? `${c.full_name}（${classLabel(cl)}）` : c.full_name }
        }),
      ]
      if (rows.length) {
        const { error: e2 } = await supabase.from('participation_members').insert(rows)
        if (e2) throw e2
      }
      await onSaved()
    } catch (e) {
      setErr('保存に失敗しました。時間をおいて再度お試しください。')
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (!myPart) return
    setBusy(true)
    await supabase.from('participations').delete().eq('id', myPart.id)
    await onSaved()
    setCheckedAdults(new Set())
    setCheckedChildren(new Set())
    setBusy(false)
  }

  return (
    <Card>
      <h2 className="mb-3 text-lg font-extrabold">{myPart ? '参加内容の変更' : 'イベントに参加する'}</h2>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-bold text-gray-700">参加する家族</p>
          <div className="space-y-2">
            {adults.map((a) => (
              <CheckRow key={a.id} checked={checkedAdults.has(a.id)} onChange={() => toggle(checkedAdults, a.id, setCheckedAdults)} label={a.full_name} sub="大人" />
            ))}
            {children.map((c) => (
              <CheckRow key={c.id} checked={checkedChildren.has(c.id)} onChange={() => toggle(checkedChildren, c.id, setCheckedChildren)} label={c.full_name} sub={classLabel(classOf(c.class_id)) || '子ども'} />
            ))}
            {adults.length + children.length === 0 && (
              <p className="text-sm text-gray-500">家族が未登録です。<Link to="/mypage/children" className="text-brand-red underline">子どもを登録</Link>してください。</p>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1 text-sm font-bold text-gray-700">参加方法</p>
          <div className="flex gap-2">
            <SegBtn active={joinType === 'full'} onClick={() => setJoinType('full')}>最初から参加</SegBtn>
            <SegBtn active={joinType === 'partial'} onClick={() => setJoinType('partial')}>途中から参加</SegBtn>
          </div>
          {joinType === 'partial' && (
            <div className="mt-2">
              <Field label="参加予定時間（任意）">
                <Input value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} placeholder="15:30" />
              </Field>
            </div>
          )}
        </div>

        <Field label="連絡欄（任意）">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="食事不要 / 途中で帰る など" />
        </Field>

        <ErrorText>{err}</ErrorText>
        <Button onClick={save} disabled={busy}>{busy ? '…' : myPart ? '変更を保存' : '参加する'}</Button>
        {myPart && <Button variant="danger" onClick={cancel} disabled={busy}>参加をキャンセル</Button>}
      </div>
    </Card>
  )
}

function CheckRow({ checked, onChange, label, sub }: { checked: boolean; onChange: () => void; label: string; sub: string }) {
  return (
    <button type="button" onClick={onChange} className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left ${checked ? 'border-brand-red bg-red-50' : 'border-gray-200 bg-white'}`}>
      <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${checked ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300'}`}>{checked ? '✓' : ''}</span>
      <span className="font-bold">{label}</span>
      <span className="ml-auto text-sm text-gray-500">{sub}</span>
    </button>
  )
}

function SegBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`flex-1 rounded-xl px-3 py-3 text-sm font-bold ${active ? 'bg-brand-red text-white' : 'border border-gray-300 bg-white text-gray-600'}`}>{children}</button>
  )
}
