import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button, Card, EmptyState, PageTitle, Spinner, Textarea } from '../../components/ui'

interface FB {
  id: string; name: string | null; is_anonymous: boolean; content: string; status: string; created_at: string
  reply: string | null; replied_at: string | null; is_published: boolean
}

export default function StaffFeedback() {
  const [rows, setRows] = useState<FB[]>([])
  const [loading, setLoading] = useState(true)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    const list = (data ?? []) as FB[]
    setRows(list)
    const d: Record<string, string> = {}
    list.forEach((f) => (d[f.id] = f.reply ?? ''))
    setDrafts(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(f: FB, status: string) {
    await supabase.from('feedback').update({ status }).eq('id', f.id)
    await load()
  }
  async function saveReply(f: FB, publish: boolean) {
    const reply = (drafts[f.id] ?? '').trim()
    await supabase.from('feedback').update({
      reply: reply || null,
      replied_at: reply ? new Date().toISOString() : null,
      is_published: publish,
      status: 'read',
    }).eq('id', f.id)
    await load()
  }
  async function remove(f: FB) {
    await supabase.from('feedback').delete().eq('id', f.id)
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
      <p className="text-sm text-gray-500">返信を書いて「公開して返信」すると、みんなの質問・回答ページに掲載されます。</p>

      {rows.length === 0 ? (
        <EmptyState>まだ投稿はありません。</EmptyState>
      ) : (
        rows.map((f) => (
          <Card key={f.id} className={f.status === 'unread' ? 'border-l-4 border-brand-red' : ''}>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-bold">{f.is_anonymous || !f.name ? '匿名' : f.name}</span>
              <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('ja-JP')}</span>
              {f.status === 'unread' && <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs font-bold text-white">未確認</span>}
              {f.is_published && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">公開中</span>}
            </div>
            <p className="whitespace-pre-wrap text-gray-800">{f.content}</p>

            <div className="mt-3 rounded-xl bg-gray-50 p-3">
              <p className="mb-1 text-xs font-bold text-gray-500">返信</p>
              <Textarea rows={2} value={drafts[f.id] ?? ''} onChange={(e) => setDrafts((p) => ({ ...p, [f.id]: e.target.value }))} placeholder="回答を入力" />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" className="w-auto px-4" onClick={() => saveReply(f, true)}>公開して返信</Button>
                <Button variant="ghost" className="w-auto px-4" onClick={() => saveReply(f, false)}>非公開で保存</Button>
              </div>
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
