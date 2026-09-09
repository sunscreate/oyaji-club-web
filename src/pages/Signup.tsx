import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { personNameToEmail, validateAuthName } from '../lib/authKey'
import { completeRegistration } from '../lib/register'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input, Select } from '../components/ui'
import type { MemberType } from '../types'

type Mode = 'new' | 'join'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [memberType, setMemberType] = useState<MemberType>('current')
  const [mode, setMode] = useState<Mode | null>(null)
  const [householdName, setHouseholdName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [doneName, setDoneName] = useState<string | null>(null)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!mode) {
      setErr('登録方法を選んでください。')
      return
    }
    const nameError = validateAuthName(fullName)
    if (nameError) {
      setErr(nameError)
      return
    }
    setBusy(true)
    const meta = {
      full_name: fullName.trim(),
      member_type: memberType,
      mode,
      household_name: householdName.trim(),
      code: code.trim(),
    }
    const { data, error } = await supabase.auth.signUp({
      email: await personNameToEmail(fullName),
      password,
      options: { data: meta },
    })
    if (error) {
      setBusy(false)
      setErr(error.message.includes('already registered') ? 'この氏名は既に登録されています。管理者に確認してください。' : `登録に失敗しました: ${error.message}`)
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
      setDoneName(meta.full_name)
    } else {
      setBusy(false)
      setSent(true)
    }
  }

  if (doneName) {
    return (
      <PlainLayout>
        <Card>
          <h1 className="mb-2 text-xl font-extrabold text-green-700">登録が完了しました！</h1>
          <p className="text-gray-700">{doneName} さんとして登録されました。このまま利用を始めるか、ログイン画面に戻れます。</p>
          <div className="mt-6 space-y-3">
            <Button onClick={() => nav('/')}>このまま始める（ホームへ）</Button>
            <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); nav('/login') }}>ログイン画面へ戻る</Button>
          </div>
        </Card>
      </PlainLayout>
    )
  }

  if (sent) {
    return (
      <PlainLayout>
        <Card>
          <h1 className="mb-2 text-xl font-extrabold">確認メールを送信しました</h1>
          <p className="text-gray-700">
            現在のSupabase設定でメール確認が必要になっています。メールなし登録にするには、Supabaseのメール確認をOFFにしてください。
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

      {!mode && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => { setMode('new'); setCode('') }}
            className="block w-full rounded-2xl border-2 border-brand-red bg-white p-5 text-left shadow-sm active:scale-[0.99]"
          >
            <span className="block text-lg font-extrabold text-brand-red">新規アカウント登録</span>
            <span className="mt-1 block text-sm text-gray-700">園から配布された園コードで、あなたの世帯を新しく作ります。</span>
            <span className="mt-3 block rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-gray-800">必要なもの：園コード・氏名・パスワード</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setCode('') }}
            className="block w-full rounded-2xl border-2 border-brand-yellow bg-white p-5 text-left shadow-sm active:scale-[0.99]"
          >
            <span className="block text-lg font-extrabold text-black">家族招待コードで登録する</span>
            <span className="mt-1 block text-sm text-gray-700">先に登録した家族と同じ世帯に入ります。園コードは不要です。</span>
            <span className="mt-3 block rounded-xl bg-yellow-50 px-3 py-2 text-sm font-bold text-gray-800">必要なもの：家族招待コード・氏名・パスワード</span>
          </button>
          <p className="mt-6 text-center text-gray-600">
            登録済みの方は{' '}
            <Link to="/login" className="font-bold text-brand-red underline">ログイン</Link>
          </p>
        </div>
      )}

      {mode && (
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-gray-500">登録方法</p>
              <h2 className="text-lg font-extrabold">{mode === 'new' ? '新規アカウント登録' : '家族招待コードで登録する'}</h2>
            </div>
            <button type="button" onClick={() => { setMode(null); setErr('') }} className="shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-sm font-bold text-gray-600">変更</button>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === 'new' ? (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-gray-800">
                園から配布された<span className="font-bold">園コード</span>を使って、新しい世帯を作ります。
              </div>
            ) : (
              <div className="rounded-xl bg-yellow-50 px-4 py-3 text-sm text-gray-800">
                家族から受け取った<span className="font-bold">家族招待コード</span>を使って、同じ世帯に参加します。
              </div>
            )}

            {mode === 'new' ? (
              <div className="space-y-3">
                <Field label="園コード">
                  <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="saginuma-2026" required />
                </Field>
                <Field label="世帯名（任意）">
                  <Input value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="未入力なら「氏名＋家」" />
                </Field>
              </div>
            ) : (
              <Field label="家族招待コード">
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="AB7K-92QM" required />
              </Field>
            )}

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-500">あなたの情報</p>
              <Field label="氏名（ニックネーム不可）">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="山田 太郎" required />
              </Field>
              <Field label="ご家庭の種別">
                <Select value={memberType} onChange={(e) => setMemberType(e.target.value as MemberType)}>
                  <option value="current">在園家庭</option>
                  <option value="ob">OB家庭</option>
                </Select>
              </Field>
            </div>

            <div className="space-y-3 border-t border-gray-100 pt-4">
              <p className="text-sm font-extrabold text-gray-500">ログイン用パスワード</p>
              <Field label="パスワード（6文字以上）">
                <Input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
            </div>

            <ErrorText>{err}</ErrorText>
            <Button type="submit" disabled={busy}>{busy ? '…' : '登録する'}</Button>
          </form>
        </Card>
      )}
      {mode && (
        <p className="mt-6 text-center text-gray-600">
          登録済みの方は{' '}
          <Link to="/login" className="font-bold text-brand-red underline">ログイン</Link>
        </p>
      )}
    </PlainLayout>
  )
}
