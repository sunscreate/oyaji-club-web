import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button, Card, EmptyState, ErrorText, PageTitle, Spinner, Textarea } from '../../components/ui'

interface FB {
  id: string
  profile_id: string | null
  name: string | null
  is_anonymous: boolean
  content: string
  status: string
  created_at: string
  reply: string | null
  replied_at: string | null
  is_published: boolean
}
interface Msg {
  id: string
  feedback_id: string
  sender_role: 'user' | 'staff'
  body: string
  created_at: string
}

export default function StaffFeedback() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<FB[]>([])
  const [messages, setMessages] = useState<Record<string, Msg[]>>({})
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const [savedId, setSavedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    const list = (data ?? []) as FB[]
    setRows(list)
    setDrafts((prev) => {
      const next: Record<string, string> = {}
      list.forEach((f) => (next[f.id] = prev[f.id] ?? ''))
      return next
    })
    if (list.length === 0) {
      setMessages({})
      setLoading(false)
      return
    }
    const { data: msgRows } = await supabase
      .from('feedback_messages')
      .select('id,feedback_id,sender_role,body,created_at')
      .in('feedback_id', list.map((f) => f.id))
      .order('created_at', { ascending: true })
    const grouped: Record<string, Msg[]> = {}
    ;((msgRows ?? []) as Msg[]).forEach((m) => {
      grouped[m.feedback_id] = [...(grouped[m.feedback_id] ?? []), m]
    })
    setMessages(grouped)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(f: FB, status: string) {
    setErr('')
    const { data, error } = await supabase.from('feedback').update({ status }).eq('id', f.id).select('id').maybeSingle()
    if (error || !data) {
      setErr(`更新に失敗しました: ${error?.message ?? '更新権限がないか、対象が見つかりません。'}`)
      return
    }
    await load()
  }

  async function sendReply(f: FB, publish: boolean) {
    const body = (drafts[f.id] ?? '').trim()
    setErr('')
    setSavedId(null)
    if (!body || !profile?.id) {
      setErr('返信内容を入力してください。')
      return
    }
    setBusyId(f.id)
    const { error: msgError } = await supabase.from('feedback_messages').insert({
      feedback_id: f.id,
      sender_profile_id: profile.id,
      sender_role: 'staff',
      body,
    })
    if (msgError) {
      setBusyId(null)
      setErr(`返信の送信に失敗しました: ${msgError.message}`)
      return
    }
    const update = publish
      ? { status: 'read', reply: body, replied_at: new Date().toISOString(), is_published: true }
      : { status: 'read' }
    const { data, error } = await supabase.from('feedback').update(update).eq('id', f.id).select('id').maybeSingle()
    setBusyId(null)
    if (error || !data) {
      setErr(`返信後の状態更新に失敗しました: ${error?.message ?? '更新権限がないか、対象が見つかりません。'}`)
      return
    }
    setDrafts((p) => ({ ...p, [f.id]: '' }))
    setSavedId(f.id)
    await load()
  }

  async function setPublished(f: FB, published: boolean) {
    setErr('')
    setSavedId(null)
    const { data, error } = await supabase
      .from('feedback')
      .update({ is_published: published, replied_at: published ? (f.replied_at ?? new Date().toISOString()) : f.replied_at })
      .eq('id', f.id)
      .select('id')
      .maybeSingle()
    if (error || !data) {
      setErr(`公開設定の変更に失敗しました: ${error?.message ?? '更新権限がないか、対象が見つかりません。'}`)
      return
    }
    setSavedId(f.id)
    await load()
  }

  async function remove(f: FB) {
    setErr('')
    const { data, error } = await supabase.from('feedback').delete().eq('id', f.id).select('id').maybeSingle()
    if (error || !data) {
      setErr(`削除に失敗しました: ${error?.message ?? '削除権限がないか、対象が見つかりません。'}`)
      return
    }
    await load()
  }

  if (loading) return <Spinner />
  const unread = rows.filter((r) => r.status === 'unread').length

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <div className="flex items-center gap-2">
        <PageTitle>ご意見・ご質問</PageTitle>
        {unread > 0 && <span className="rounded-full bg-brand-red px-3 py-1 text-sm font-bold text-white">未確認 {unread}件</span>}
      </div>
      <p className="text-sm text-gray-500">個別に何度でも返信できます。よくある質問は「返信してFAQ公開」で、公開QAに掲載されます。</p>
      <ErrorText>{err}</ErrorText>

      {rows.length === 0 ? (
        <EmptyState>まだ投稿はありません。</EmptyState>
      ) : (
        rows.map((f) => (
          <Card key={f.id} className={f.status === 'unread' ? 'border-l-4 border-brand-red' : ''}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="font-bold">{f.is_anonymous || !f.name ? '匿名' : f.name}</span>
              <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('ja-JP')}</span>
              {f.status === 'unread' && <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs font-bold text-white">未確認</span>}
              {f.is_published && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">FAQ公開中</span>}
            </div>

            <div className="space-y-2">
              {(messages[f.id] ?? [{ id: f.id, feedback_id: f.id, sender_role: 'user', body: f.content, created_at: f.created_at }]).map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
            </div>

            <div className="mt-3 rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-xs font-bold text-gray-500">返信</p>
              <Textarea rows={2} value={drafts[f.id] ?? ''} onChange={(e) => setDrafts((p) => ({ ...p, [f.id]: e.target.value }))} placeholder="回答を入力" />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="ghost" className="px-4 py-3 text-base" onClick={() => sendReply(f, false)} disabled={busyId === f.id}>
                  {busyId === f.id ? '送信中…' : '個別に返信'}
                </Button>
                <Button type="button" variant="secondary" className="px-4 py-3 text-base" onClick={() => sendReply(f, true)} disabled={busyId === f.id}>
                  返信してFAQ公開
                </Button>
              </div>
              {f.is_published && (
                <Button type="button" variant="danger" className="mt-2 px-4 py-3 text-base" onClick={() => setPublished(f, false)}>
                  FAQ公開をやめる
                </Button>
              )}
              {!f.is_published && f.reply && (
                <Button type="button" variant="secondary" className="mt-2 px-4 py-3 text-base" onClick={() => setPublished(f, true)}>
                  既存返信をFAQ公開
                </Button>
              )}
              {savedId === f.id && <p className="mt-2 text-sm font-bold text-green-700">保存しました</p>}
            </div>

            <div className="mt-2 flex gap-2">
              {f.status === 'unread'
                ? <button onClick={() => setStatus(f, 'read')} className="text-sm font-bold text-brand-red">確認済みにする</button>
                : <button onClick={() => setStatus(f, 'unread')} className="text-sm text-gray-500">未確認に戻す</button>}
              <button onClick={() => remove(f)} className="ml-auto text-sm text-gray-400">削除</button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

function MessageBubble({ message }: { message: Msg }) {
  const user = message.sender_role === 'user'
  return (
    <div className={`flex ${user ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${user ? 'bg-gray-100 text-gray-800' : 'bg-brand-red text-white'}`}>
        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
        <p className={`mt-1 text-right text-[11px] ${user ? 'text-gray-400' : 'text-white/70'}`}>
          {new Date(message.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
