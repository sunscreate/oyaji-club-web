import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button, Card, Field, Input, PageTitle, Textarea } from '../components/ui'

interface QA { id: string; content: string; reply: string | null; replied_at: string | null }

export default function Feedback() {
  const { profile } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [anon, setAnon] = useState(false)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [qa, setQa] = useState<QA[]>([])

  async function loadQA() {
    const { data } = await supabase
      .from('feedback')
      .select('id,content,reply,replied_at')
      .eq('is_published', true)
      .not('reply', 'is', null)
      .order('replied_at', { ascending: false })
    setQa((data ?? []) as QA[])
  }
  useEffect(() => { loadQA() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setBusy(true)
    await supabase.from('feedback').insert({
      name: anon ? null : (name.trim() || null),
      is_anonymous: anon,
      content: content.trim(),
    })
    setBusy(false)
    setContent('')
    setDone(true)
  }

  const qaSection = qa.length > 0 && (
    <section className="mt-8">
      <h2 className="mb-2 text-sm font-bold text-gray-500">みんなの質問・回答</h2>
      <div className="space-y-3">
        {qa.map((q) => (
          <Card key={q.id}>
            <p className="font-bold">Q. {q.content}</p>
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-red-50 px-3 py-2 text-gray-800">A. {q.reply}</p>
          </Card>
        ))}
      </div>
    </section>
  )

  if (done) {
    return (
      <div>
        <PageTitle>ご意見・ご質問</PageTitle>
        <Card>
          <p className="font-bold text-green-700">送信しました。ありがとうございます！</p>
          <p className="mt-2 text-sm text-gray-600">いただいた内容はお世話係が確認します。</p>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" onClick={() => setDone(false)}>続けて投稿</Button>
            <Link to="/" className="flex-1"><Button variant="secondary">ホームへ</Button></Link>
          </div>
        </Card>
        {qaSection}
      </div>
    )
  }

  return (
    <div>
      <PageTitle>ご意見・ご質問</PageTitle>
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
      {qaSection}
    </div>
  )
}
