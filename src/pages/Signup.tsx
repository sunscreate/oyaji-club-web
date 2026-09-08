import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { completeRegistration } from '../lib/register'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input, Select } from '../components/ui'
import type { MemberType } from '../types'

type Mode = 'new' | 'join'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [memberType, setMemberType] = useState<MemberType>('current')
  const [mode, setMode] = useState<Mode>('new')
  const [householdName, setHouseholdName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const meta = { full_name: fullName.trim(), member_type: memberType, mode, household_name: householdName.trim(), code: code.trim() }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: meta },
    })
    if (error) {
      setBusy(false)
      setErr(error.message.includes('already registered') ? 'このメールアドレスは既に登録されています。' : `登録に失敗しました: ${error.message}`)
      return
    }
    // 確認メール無効(即セッション)の場合はここで profiles を作成
    if (data.session) {
      const r = await completeRegistration(meta)
      setBusy(false)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      nav('/')
    } else {
      setBusy(false)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <PlainLayout>
        <Card>
          <h1 className="mb-2 text-xl font-extrabold">確認メールを送信しました</h1>
          <p className="text-gray-700">
            {email} 宛に確認メールを送りました。メール内のリンクを開いた後、ログインしてください。登録情報はログイン後に自動で反映されます。
          </p>
          <div className="mt-6">
            <Link to="/login"><Button variant="secondary">ログイン画面へ</Button></Link>
          </div>
        </Card>
      </PlainLayout>
    )
  }

  return (
    <PlainLayout>
      <h1 className="mb-3 text-xl font-extrabold">新規登録</h1>
      <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-gray-800">
        このサイトは<span className="font-bold">おやじ倶楽部</span>が運営しています。おやじ倶楽部に加入していない方でも、
        <span className="font-bold">在園児の保護者</span>であれば登録できます（OBの方も登録可能です）。
      </div>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="氏名（ニックネーム不可）">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="山田 太郎" required />
          </Field>
          <Field label="メールアドレス">
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="パスワード（6文字以上）">
            <Input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="ご家庭の種別">
            <Select value={memberType} onChange={(e) => setMemberType(e.target.value as MemberType)}>
              <option value="current">在園家庭</option>
              <option value="ob">OB家庭</option>
            </Select>
          </Field>

          <div className="rounded-xl bg-gray-50 p-3">
            <div className="mb-2 flex gap-2">
              <TabBtn active={mode === 'new'} onClick={() => setMode('new')}>新しく世帯を登録</TabBtn>
              <TabBtn active={mode === 'join'} onClick={() => setMode('join')}>家族の世帯に参加</TabBtn>
            </div>
            {mode === 'new' ? (
              <div className="space-y-3">
                <Field label="世帯名（任意・未入力なら「氏名＋家」）">
                  <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="山田家" />
                </Field>
                <Field label="園コード（園から配布されたコード）">
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAGINUMA2026" required />
                </Field>
              </div>
            ) : (
              <Field label="家族招待コード（先に登録した家族から受け取ったコード）">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="AB7K-92QM" required />
              </Field>
            )}
          </div>

          <ErrorText>{err}</ErrorText>
          <Button type="submit" disabled={busy}>{busy ? '…' : '登録する'}</Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-gray-600">
        登録済みの方は{' '}
        <Link to="/login" className="font-bold text-brand-red underline">ログイン</Link>
      </p>
    </PlainLayout>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${active ? 'bg-brand-red text-white' : 'bg-white text-gray-600 border border-gray-300'}`}
    >
      {children}
    </button>
  )
}
