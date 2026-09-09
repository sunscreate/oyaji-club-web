import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { personNameToEmail, validateAuthName } from '../lib/authKey'
import { PlainLayout } from '../components/Layout'
import { Button, Card, ErrorText, Field, Input } from '../components/ui'
import logo from '../assets/logo.jpg'

export default function Login() {
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const nav = useNavigate()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    const nameError = validateAuthName(fullName)
    if (nameError) {
      setErr(nameError)
      return
    }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email: await personNameToEmail(fullName), password })
    setBusy(false)
    if (error) {
      setErr(
        error.message.includes('Email not confirmed')
          ? '登録確認が完了していません。管理者に確認してください。'
          : '氏名またはパスワードが正しくありません。',
      )
      return
    }
    nav('/home')
  }

  return (
    <PlainLayout>
      <div className="mb-6 flex flex-col items-center">
        <img src={logo} alt="おやじ倶楽部" className="mb-3 w-40 rounded-lg" />
        <h1 className="text-xl font-extrabold">さぎぬま幼稚園 おやじ倶楽部</h1>
      </div>
      <Card className="mb-4 border-2 border-brand-yellow bg-yellow-50">
        <p className="text-center text-sm font-bold text-gray-700">はじめて使う方はこちら</p>
        <Link to="/guide" className="mt-2 block">
          <Button type="button" variant="secondary">まず使い方ガイドを開く</Button>
        </Link>
      </Card>
      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="氏名">
            <Input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="山田 太郎" required />
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
