import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button, Card, Field, Input, PageTitle, Spinner } from '../../components/ui'
import type { Profile } from '../../types'

export default function Household() {
  const { profile } = useAuth()
  const [name, setName] = useState('')
  const [members, setMembers] = useState<Profile[]>([])
  const [invite, setInvite] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyMode, setCopyMode] = useState<'code' | 'message'>('message')

  useEffect(() => {
    ;(async () => {
      if (!profile?.household_id) { setLoading(false); return }
      const [{ data: hh }, { data: ms }, { data: code }] = await Promise.all([
        supabase.from('households').select('name').eq('id', profile.household_id).maybeSingle(),
        supabase.from('profiles').select('id,full_name,household_id,member_type,oyaji_member,tshirt_size').eq('household_id', profile.household_id),
        supabase.rpc('get_my_invite_code'),
      ])
      setName((hh as { name: string } | null)?.name ?? '')
      setMembers((ms ?? []) as Profile[])
      setInvite((code as string) ?? '')
      setLoading(false)
    })()
  }, [profile?.household_id])

  async function saveName() {
    setBusy(true)
    await supabase.from('households').update({ name: name.trim() }).eq('id', profile!.household_id!)
    setBusy(false)
  }

  async function newCode() {
    setBusy(true)
    const { data } = await supabase.rpc('rotate_invite_code')
    setInvite((data as string) ?? '')
    setBusy(false)
    setCopied(false)
  }

  async function copy() {
    const signupUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/signup`
    const text = copyMode === 'message'
      ? `さぎぬま幼稚園 おやじ倶楽部サイトの家族招待です。\n\n登録はこちら：${signupUrl}\n家族招待コード：${invite}\n\n新規登録画面で「家族の世帯に参加」を選び、このコードを入力してください。`
      : invite
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* noop */ }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/mypage" className="text-sm text-gray-500">← マイページ</Link>
      <PageTitle>世帯・家族招待</PageTitle>

      <Card>
        <Field label="世帯名">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田家" />
        </Field>
        <div className="mt-3"><Button variant="ghost" onClick={saveName} disabled={busy}>世帯名を保存</Button></div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-bold text-gray-500">この世帯のメンバー</h2>
        <ul className="space-y-1">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2">
              <span className="font-bold">{m.full_name}</span>
              {m.id === profile?.id && <span className="text-xs text-gray-400">（あなた）</span>}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="mb-1 text-sm font-bold text-gray-500">家族を招待</h2>
        <p className="mb-3 text-sm text-gray-600">下のコードを家族に送り、新規登録時に「家族の世帯に参加」で入力してもらうと同じ世帯になります。新しく発行すると前のコードは無効になります。</p>
        {invite ? (
          <div className="mb-3 space-y-3">
            <span className="block rounded-xl bg-gray-100 px-4 py-3 text-center text-2xl font-extrabold tracking-widest">{invite}</span>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setCopyMode('message')}
                className={`rounded-lg px-3 py-2 text-sm font-bold ${copyMode === 'message' ? 'bg-white text-brand-red shadow-sm' : 'text-gray-500'}`}
              >
                リンク付き
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('code')}
                className={`rounded-lg px-3 py-2 text-sm font-bold ${copyMode === 'code' ? 'bg-white text-brand-red shadow-sm' : 'text-gray-500'}`}
              >
                コードだけ
              </button>
            </div>
            <button onClick={copy} className="w-full rounded-xl bg-brand-yellow px-4 py-3 font-bold">{copied ? 'コピー済' : 'コピーする'}</button>
          </div>
        ) : (
          <p className="mb-3 text-gray-500">まだ招待コードがありません。</p>
        )}
        <Button onClick={newCode} disabled={busy}>{invite ? '新しいコードを発行' : '招待コードを発行'}</Button>
      </Card>
    </div>
  )
}
