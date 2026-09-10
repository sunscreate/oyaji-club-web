import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { completeRegistration } from '../lib/register'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input, Select, Spinner } from '../components/ui'
import type { MemberType } from '../types'

type OyajiStatus = 'none' | 'current' | 'new'
const TSHIRT_SIZES = ['S', 'M', 'L', 'XL']

/** 認証済だが profiles 未作成のとき、園コード/招待コードで登録を完了する画面。 */
export default function RegisterProfile() {
  const { session, needsRegistration, loading, refresh } = useAuth()
  const nav = useNavigate()
  const [fullName, setFullName] = useState('')
  const [memberType, setMemberType] = useState<MemberType>('current')
  const [mode, setMode] = useState<'new' | 'join'>('new')
  const [householdName, setHouseholdName] = useState('')
  const [code, setCode] = useState('')
  const [oyajiStatus, setOyajiStatus] = useState<OyajiStatus>('none')
  const [tshirtSize, setTshirtSize] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [tried, setTried] = useState(false)

  // メタデータから自動補完 & 自動登録を1度だけ試みる
  useEffect(() => {
    if (loading || !session || tried) return
    const meta = session.user.user_metadata ?? {}
    if (meta.full_name) setFullName(meta.full_name)
    if (meta.member_type) setMemberType(meta.member_type)
    if (meta.mode) setMode(meta.mode)
    if (meta.household_name) setHouseholdName(meta.household_name)
    if (meta.code) setCode(meta.code)
    if (meta.oyaji_status) setOyajiStatus(meta.oyaji_status)
    else if (meta.oyaji_member) setOyajiStatus(meta.tshirt_size ? 'new' : 'current')
    if (meta.tshirt_size) setTshirtSize(meta.tshirt_size)
    if (meta.full_name && meta.code) {
      setTried(true)
      ;(async () => {
        setBusy(true)
        const r = await completeRegistration({
          full_name: meta.full_name,
          member_type: meta.member_type ?? 'current',
          mode: meta.mode ?? 'new',
          household_name: meta.household_name,
          code: meta.code,
          oyaji_status: meta.oyaji_status ?? (meta.oyaji_member ? (meta.tshirt_size ? 'new' : 'current') : 'none'),
          oyaji_member: !!meta.oyaji_member,
          tshirt_size: meta.tshirt_size,
        })
        setBusy(false)
        if (r.ok) {
          await refresh()
          nav('/home')
        } else {
          setErr(r.message)
        }
      })()
    } else {
      setTried(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session])

  if (loading) return <Spinner />
  if (session && !needsRegistration) {
    nav('/home')
    return null
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    if (oyajiStatus === 'new' && !tshirtSize) {
      setErr('新規加盟する場合はTシャツサイズを選択してください。')
      return
    }
    setBusy(true)
    const r = await completeRegistration({
      full_name: fullName.trim(),
      member_type: memberType,
      mode,
      household_name: householdName.trim(),
      code: code.trim(),
      oyaji_status: oyajiStatus,
      oyaji_member: oyajiStatus !== 'none',
      tshirt_size: oyajiStatus === 'new' ? tshirtSize : '',
    })
    setBusy(false)
    if (!r.ok) {
      setErr(r.message)
      return
    }
    await refresh()
    nav('/home')
  }

  return (
    <PlainLayout>
      <h1 className="mb-3 text-xl font-extrabold">登録の完了</h1>
      <p className="mb-4 text-gray-700">登録内容を確認して完了してください。</p>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="氏名">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="ご家庭の種別">
            <Select value={memberType} onChange={(e) => setMemberType(e.target.value as MemberType)}>
              <option value="current">在園家庭</option>
              <option value="ob">OB家庭</option>
            </Select>
          </Field>
          <div className="space-y-3 rounded-xl bg-gray-50 p-3">
            <p className="text-sm font-extrabold text-gray-700">おやじ倶楽部への加盟状況</p>
            <OyajiStatusButton active={oyajiStatus === 'none'} onClick={() => { setOyajiStatus('none'); setTshirtSize('') }}>
              未加盟・サイトだけ利用する
            </OyajiStatusButton>
            <OyajiStatusButton active={oyajiStatus === 'current'} onClick={() => { setOyajiStatus('current'); setTshirtSize('') }}>
              現在加盟済み
              <span className="mt-1 block text-xs font-normal text-gray-600">すでにTシャツを持っている方</span>
            </OyajiStatusButton>
            <OyajiStatusButton active={oyajiStatus === 'new'} onClick={() => setOyajiStatus('new')}>
              新規加盟する
              <span className="mt-1 block text-xs font-normal text-gray-600">これから加盟し、Tシャツを受け取る方</span>
            </OyajiStatusButton>
            <p className="text-sm leading-relaxed text-gray-600">
              おやじ倶楽部への加盟はパパのみです。加盟していなくても、イベント参加やサイトの利用はできます。
            </p>
            {oyajiStatus === 'new' && (
              <div className="mt-3">
                <Field label="Tシャツサイズ">
                  <Select value={tshirtSize} onChange={(e) => setTshirtSize(e.target.value)}>
                    <option value="">選択してください</option>
                    {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('new')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === 'new' ? 'bg-brand-red text-white' : 'border border-gray-300 bg-white text-gray-600'}`}>新しく世帯を登録</button>
            <button type="button" onClick={() => setMode('join')} className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${mode === 'join' ? 'bg-brand-red text-white' : 'border border-gray-300 bg-white text-gray-600'}`}>家族の世帯に参加</button>
          </div>
          {mode === 'new' ? (
            <>
              <Field label="世帯名（任意）">
                <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="山田家" />
              </Field>
              <Field label="園コード">
                <Input value={code} onChange={(e) => setCode(e.target.value)} required />
              </Field>
            </>
          ) : (
            <Field label="家族招待コード">
              <Input value={code} onChange={(e) => setCode(e.target.value)} required />
            </Field>
          )}
          <ErrorText>{err}</ErrorText>
          <Button type="submit" disabled={busy}>{busy ? '…' : '登録を完了する'}</Button>
        </form>
      </Card>
    </PlainLayout>
  )
}

function OyajiStatusButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-xl border-2 px-4 py-3 text-left font-bold ${active ? 'border-brand-red bg-white text-brand-red' : 'border-gray-200 bg-white text-gray-700'}`}
    >
      {children}
    </button>
  )
}
