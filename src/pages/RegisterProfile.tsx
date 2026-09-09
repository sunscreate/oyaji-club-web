import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { completeRegistration } from '../lib/register'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input, Select, Spinner } from '../components/ui'
import type { MemberType } from '../types'

/** 認証済だが profiles 未作成のとき、園コード/招待コードで登録を完了する画面。 */
export default function RegisterProfile() {
  const { session, needsRegistration, loading, refresh } = useAuth()
  const nav = useNavigate()
  const [fullName, setFullName] = useState('')
  const [memberType, setMemberType] = useState<MemberType>('current')
  const [mode, setMode] = useState<'new' | 'join'>('new')
  const [householdName, setHouseholdName] = useState('')
  const [code, setCode] = useState('')
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const r = await completeRegistration({ full_name: fullName.trim(), member_type: memberType, mode, household_name: householdName.trim(), code: code.trim() })
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
