import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useClasses, classLabel } from '../../hooks/useClasses'
import { Button, Card, Field, Input, PageTitle, Spinner } from '../../components/ui'
import type { Child, Profile } from '../../types'

export default function Household() {
  const { profile } = useAuth()
  const { classes } = useClasses()
  const [name, setName] = useState('')
  const [members, setMembers] = useState<Profile[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [invite, setInvite] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'failed'>('idle')
  const [copyMode, setCopyMode] = useState<'code' | 'message'>('message')
  const copyTextRef = useRef<HTMLTextAreaElement>(null)
  const signupUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/signup`
  const copyText = useMemo(() => (
    copyMode === 'message'
      ? `さぎぬま幼稚園 おやじ倶楽部サイトの家族招待です。\n\n登録はこちら：${signupUrl}\n家族招待コード：${invite}\n\n新規登録画面で「家族の世帯に参加」を選び、このコードを入力してください。`
      : invite
  ), [copyMode, invite, signupUrl])

  useEffect(() => {
    ;(async () => {
      if (!profile?.household_id) { setLoading(false); return }
      const [{ data: hh }, { data: ms }, { data: cs }, { data: code }] = await Promise.all([
        supabase.from('households').select('name').eq('id', profile.household_id).maybeSingle(),
        supabase.from('profiles').select('id,full_name,household_id,member_type,oyaji_member,tshirt_size,tshirt_delivered').eq('household_id', profile.household_id),
        supabase.from('children').select('*').eq('household_id', profile.household_id).order('created_at'),
        supabase.rpc('get_my_invite_code'),
      ])
      setName((hh as { name: string } | null)?.name ?? '')
      setMembers((ms ?? []) as Profile[])
      setChildren((cs ?? []) as Child[])
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
    setCopyStatus('idle')
  }

  function selectCopyText() {
    const area = copyTextRef.current
    if (!area) return false
    area.focus()
    area.select()
    area.setSelectionRange(0, area.value.length)
    return true
  }

  function copyWithFallback(text: string) {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '-1000px'
    area.style.left = '-1000px'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.focus()
    area.select()
    area.setSelectionRange(0, area.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  }

  function withTimeout<T>(promise: Promise<T>, ms: number) {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('copy timeout')), ms)),
    ])
  }

  async function copy() {
    setCopyStatus('copying')
    let copied = false
    try {
      if (navigator.clipboard?.writeText) {
        await withTimeout(navigator.clipboard.writeText(copyText), 800)
        copied = true
      }
    } catch { /* fallback below */ }

    if (!copied) {
      try {
        copied = copyWithFallback(copyText)
      } catch { /* show failure below */ }
    }

    if (copied) {
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 1800)
    } else {
      setCopyStatus('failed')
    }
  }

  async function share() {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: 'さぎぬま幼稚園 おやじ倶楽部 家族招待',
        text: copyText,
      })
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 1800)
    } catch { /* user cancelled */ }
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
        <h2 className="mb-3 text-sm font-bold text-gray-500">この世帯のメンバー</h2>
        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-bold text-gray-400">保護者</p>
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span className="font-bold">{m.full_name}</span>
                  {m.id === profile?.id && <span className="text-xs text-gray-400">（あなた）</span>}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1 text-xs font-bold text-gray-400">子ども</p>
            {children.length === 0 ? (
              <p className="text-sm text-gray-500">まだ子どもが登録されていません。</p>
            ) : (
              <ul className="space-y-1">
                {children.map((c) => {
                  const cls = classes.find((x) => x.id === c.class_id)
                  const sub = c.status === 'ob'
                    ? `OB${c.grad_year ? `（${c.grad_year}年度卒）` : ''}`
                    : classLabel(cls) || 'クラス未設定'
                  return (
                    <li key={c.id} className="flex items-center gap-2">
                      <span className="font-bold">{c.full_name}</span>
                      <span className="text-xs text-gray-500">{sub}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
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
            <textarea
              ref={copyTextRef}
              readOnly
              value={copyText}
              onFocus={(e) => e.currentTarget.select()}
              className="h-36 w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm font-bold leading-relaxed text-gray-800"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                disabled={copyStatus === 'copying'}
                className="rounded-xl bg-brand-yellow px-4 py-3 font-bold disabled:opacity-60"
              >
                {copyStatus === 'copying' ? 'コピー中…' : copyStatus === 'copied' ? 'コピー済' : 'コピーする'}
              </button>
              {'share' in navigator ? (
                <button type="button" onClick={share} className="rounded-xl bg-brand-red px-4 py-3 font-bold text-white">共有する</button>
              ) : (
                <button type="button" onClick={selectCopyText} className="rounded-xl border border-gray-300 bg-white px-4 py-3 font-bold text-gray-700">選択する</button>
              )}
            </div>
            {copyStatus === 'copying' && <p className="text-center text-sm font-bold text-gray-500">コピーしています…</p>}
            {copyStatus === 'copied' && <p className="text-center text-sm font-bold text-green-600">コピーしました</p>}
            {copyStatus === 'failed' && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-brand-red">自動コピーできませんでした。上の文章を長押ししてコピーしてください。</p>}
          </div>
        ) : (
          <p className="mb-3 text-gray-500">まだ招待コードがありません。</p>
        )}
        <Button onClick={newCode} disabled={busy}>{invite ? '新しいコードを発行' : '招待コードを発行'}</Button>
      </Card>
    </div>
  )
}
