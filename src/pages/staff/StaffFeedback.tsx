import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, EmptyState, PageTitle, Spinner } from '../../components/ui'

interface FB { id: string; name: string | null; is_anonymous: boolean; content: string; status: string; created_at: string }

export default function StaffFeedback() {
  const [rows, setRows] = useState<FB[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from('feedback').select('*').order('created_at', { ascending: false })
    setRows((data ?? []) as FB[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(f: FB, status: string) {
    await supabase.from('feedback').update({ status }).eq('id', f.id)
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

      {rows.length === 0 ? (
        <EmptyState>まだ投稿はありません。</EmptyState>
      ) : (
        rows.map((f) => (
          <Card key={f.id} className={f.status === 'unread' ? 'border-l-4 border-brand-red' : ''}>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-bold">{f.is_anonymous || !f.name ? '匿名' : f.name}</span>
              <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('ja-JP')}</span>
              {f.status === 'unread' && <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs font-bold text-white">未確認</span>}
            </div>
            <p className="whitespace-pre-wrap text-gray-800">{f.content}</p>
            <div className="mt-2 flex gap-2">
              {f.status === 'unread'
                ? <button onClick={() => setStatus(f, 'read')} className="rounded-xl bg-brand-red px-4 py-2 text-sm font-bold text-white">確認済みにする</button>
                : <button onClick={() => setStatus(f, 'unread')} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold">未確認に戻す</button>}
              <button onClick={() => remove(f)} className="ml-auto text-sm text-gray-400">削除</button>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
