import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, EmptyState, ErrorText, Field, Input, PageTitle, Spinner, Textarea } from '../components/ui'

interface QA { id: string; content: string; reply: string | null; replied_at: string | null }
interface Thread {
  id: string
  content: string
  status: string
  created_at: string
  is_published: boolean
}
interface Message {
  id: string
  feedback_id: string
  sender_role: 'user' | 'staff'
  body: string
  created_at: string
}

type View = 'new' | 'mine' | 'qa'

export default function Feedback() {
  const { profile } = useAuth()
  const [view, setView] = useState<View>('new')
  const [name, setName] = useState(profile?.full_name ?? '')
  const [anon, setAnon] = useState(false)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const [qa, setQa] = useState<QA[]>([])
  const [threads, setThreads] = useState<Thread[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [loadingMine, setLoadingMine] = useState(true)
  const [replyBusyId, setReplyBusyId] = useState<string | null>(null)

  const loadQA = useCallback(async () => {
    const { data } = await supabase
      .from('feedback')
      .select('id,content,reply,replied_at')
      .eq('is_published', true)
      .not('reply', 'is', null)
      .order('replied_at', { ascending: false })
    setQa((data ?? []) as QA[])
  }, [])

  const loadMine = useCallback(async () => {
    if (!profile?.id) return
    setLoadingMine(true)
    const { data } = await supabase
      .from('feedback')
      .select('id,content,status,created_at,is_published')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
    const list = (data ?? []) as Thread[]
    setThreads(list)
    if (list.length === 0) {
      setMessages({})
      setLoadingMine(false)
      return
    }
    const { data: msgRows } = await supabase
      .from('feedback_messages')
      .select('id,feedback_id,sender_role,body,created_at')
      .in('feedback_id', list.map((t) => t.id))
      .order('created_at', { ascending: true })
    const grouped: Record<string, Message[]> = {}
    ;((msgRows ?? []) as Message[]).forEach((m) => {
      grouped[m.feedback_id] = [...(grouped[m.feedback_id] ?? []), m]
    })
    setMessages(grouped)
    setLoadingMine(false)
  }, [profile?.id])

  useEffect(() => {
    setName(profile?.full_name ?? '')
  }, [profile?.full_name])

  useEffect(() => {
    loadQA()
    loadMine()
  }, [loadQA, loadMine])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !profile?.id) return
    setBusy(true)
    setErr('')
    const { error } = await supabase.from('feedback').insert({
      profile_id: profile.id,
      name: anon ? null : (name.trim() || null),
      is_anonymous: anon,
      content: content.trim(),
    })
    setBusy(false)
    if (error) {
      setErr(`送信に失敗しました: ${error.message}`)
      return
    }
    setContent('')
    setDone(true)
    setView('mine')
    await loadMine()
  }

  async function sendReply(thread: Thread) {
    const body = (replyDrafts[thread.id] ?? '').trim()
    if (!body || !profile?.id) return
    setReplyBusyId(thread.id)
    setErr('')
    const { error } = await supabase.from('feedback_messages').insert({
      feedback_id: thread.id,
      sender_profile_id: profile.id,
      sender_role: 'user',
      body,
    })
    setReplyBusyId(null)
    if (error) {
      setErr(`送信に失敗しました: ${error.message}`)
      return
    }
    setReplyDrafts((p) => ({ ...p, [thread.id]: '' }))
    await loadMine()
  }

  return (
    <div>
      <PageTitle>ご意見・ご質問</PageTitle>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Tab active={view === 'new'} onClick={() => setView('new')}>投稿する</Tab>
        <Tab active={view === 'mine'} onClick={() => setView('mine')}>やりとり</Tab>
        <Tab active={view === 'qa'} onClick={() => setView('qa')}>質問回答</Tab>
      </div>
      <ErrorText>{err}</ErrorText>

      {view === 'new' && (
        <div>
          <p className="mb-4 text-sm text-gray-600">運営への要望・質問をお寄せください。匿名でも送信できます。</p>
          <Card>
            <form onSubmit={submit} className="space-y-4">
              <Field label="お名前（任意）">
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={anon} placeholder="山田 太郎" />
              </Field>
              <button type="button" onClick={() => setAnon(!anon)} className="flex items-center gap-3">
                <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${anon ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300'}`}>{anon ? '✓' : ''}</span>
                <span className="font-bold">匿名で送信する</span>
              </button>
              <Field label="内容">
                <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)} required placeholder="ご自由にご記入ください" />
              </Field>
              <Button type="submit" disabled={busy}>{busy ? '…' : '送信する'}</Button>
            </form>
          </Card>
        </div>
      )}

      {view === 'mine' && (
        <div className="space-y-3">
          {done && (
            <Card>
              <p className="font-bold text-green-700">送信しました。ありがとうございます！</p>
              <p className="mt-2 text-sm text-gray-600">返信があると、この画面で続けてやりとりできます。</p>
            </Card>
          )}
          {loadingMine ? <Spinner /> : threads.length === 0 ? (
            <EmptyState>まだやりとりはありません。</EmptyState>
          ) : (
            threads.map((t) => (
              <Card key={t.id}>
                <div className="mb-3 flex items-center gap-2">
                  <p className="font-extrabold">相談内容</p>
                  {t.status === 'unread' && <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs font-bold text-white">確認待ち</span>}
                </div>
                <div className="space-y-2">
                  {(messages[t.id] ?? []).map((m) => (
                    <MessageBubble key={m.id} message={m} />
                  ))}
                </div>
                <div className="mt-3 rounded-xl bg-gray-50 p-3">
                  <Textarea
                    rows={2}
                    value={replyDrafts[t.id] ?? ''}
                    onChange={(e) => setReplyDrafts((p) => ({ ...p, [t.id]: e.target.value }))}
                    placeholder="続けて返信する"
                  />
                  <Button type="button" className="mt-2 py-3 text-base" onClick={() => sendReply(t)} disabled={replyBusyId === t.id || !(replyDrafts[t.id] ?? '').trim()}>
                    {replyBusyId === t.id ? '送信中…' : '返信する'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {view === 'qa' && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">みんなの質問・回答</h2>
          {qa.length === 0 ? (
            <EmptyState>公開中の質問回答はまだありません。</EmptyState>
          ) : (
            <div className="space-y-3">
              {qa.map((q) => (
                <Card key={q.id}>
                  <p className="font-bold">Q. {q.content}</p>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-red-50 px-3 py-2 text-gray-800">A. {q.reply}</p>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-2 py-3 text-sm font-extrabold ${active ? 'bg-brand-red text-white' : 'bg-white text-gray-700 shadow-sm'}`}
    >
      {children}
    </button>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const mine = message.sender_role === 'user'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${mine ? 'bg-brand-red text-white' : 'bg-gray-100 text-gray-800'}`}>
        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
        <p className={`mt-1 text-right text-[11px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>
          {new Date(message.created_at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
