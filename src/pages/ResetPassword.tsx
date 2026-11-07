import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { personNameToEmail, validateAuthName } from '../lib/authKey'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input } from '../components/ui'

export default function ResetPassword() {
  const [fullName, setFullName] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr('')
    const nameError = validateAuthName(fullName)
    if (nameError) { setErr(nameError); return }
    if (!code.trim()) { setErr('園コードを入力してください。'); return }
    if (password.length < 6) { setErr('新しいパスワードは6文字以上にしてください。'); return }
    if (password !== confirm) { setErr('確認用パスワードが一致しません。'); return }

    setBusy(true)
    const email = await personNameToEmail(fullName)
    const { data, error } = await supabase.rpc('reset_password_with_code', {
      p_email: email,
      p_code: code.trim(),
      p_new_password: password,
    })
    setBusy(false)

    if (error) { setErr('再設定に失敗しました。時間をおいて再度お試しください。'); return }
    const res = data as { ok: boolean; error?: string }
    if (!res?.ok) {
      setErr(
        res?.error === 'bad_code' ? '園コードが正しくありません。'
        : res?.error === 'not_found' ? 'その氏名の登録が見つかりません。登録時と同じ氏名（姓名）でお試しください。'
        : res?.error === 'password_too_short' ? '新しいパスワードは6文字以上にしてください。'
        : '再設定に失敗しました。',
      )
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <PlainLayout>
        <Card>
          <h1 className="mb-2 text-xl font-extrabold text-green-700">パスワードを再設定しました</h1>
          <p className="text-gray-700">新しいパスワードでログインできます。</p>
          <div className="mt-6">
            <Button onClick={() => nav('/signin')}>ログイン画面へ</Button>
          </div>
        </Card>
      </PlainLayout>
    )
  }

  return (
    <PlainLayout>
      <h1 className="mb-3 text-xl font-extrabold">パスワードの再設定</h1>
      <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm text-gray-800">
        園から配布された<span className="font-bold">園コード</span>と、登録時の<span className="font-bold">氏名</span>で本人確認し、
        新しいパスワードを設定します。
      </div>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="氏名（登録時と同じ表記）">
            <Input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="山田 太郎" required />
          </Field>
          <Field label="園コード">
            <Input value={code} onChange={(e) => setCode(e.target.value)} required />
          </Field>
          <Field label="新しいパスワード（6文字以上）">
            <Input type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <Field label="新しいパスワード（確認）">
            <Input type="password" autoComplete="new-password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          <ErrorText>{err}</ErrorText>
          <Button type="submit" disabled={busy}>{busy ? '…' : 'パスワードを再設定する'}</Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-gray-600">
        <Link to="/signin" className="font-bold text-brand-red underline">ログイン画面へ戻る</Link>
      </p>
    </PlainLayout>
  )
}
