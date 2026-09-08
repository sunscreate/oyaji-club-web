import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input } from '../components/ui'
import logo from '../assets/logo.jpg'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) {
      setErr(
        error.message.includes('Email not confirmed')
          ? 'メールの確認が完了していません。届いた確認メールのリンクを開いてください。'
          : 'メールアドレスまたはパスワードが正しくありません。',
      )
      return
    }
    nav('/')
  }

  return (
    <PlainLayout>
      <div className="mb-6 flex flex-col items-center">
        <img src={logo} alt="おやじ倶楽部" className="mb-3 w-40 rounded-lg" />
        <h1 className="text-xl font-extrabold">さぎぬま幼稚園 おやじ倶楽部</h1>
      </div>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="メールアドレス">
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="パスワード">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <ErrorText>{err}</ErrorText>
          <Button type="submit" disabled={busy}>{busy ? '…' : 'ログイン'}</Button>
        </form>
      </Card>
      <p className="mt-6 text-center text-gray-600">
        はじめての方は{' '}
        <Link to="/signup" className="font-bold text-brand-red underline">新規登録</Link>
      </p>
    </PlainLayout>
  )
}
