import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Button, Card, EmptyState, Field, Input, PageTitle, Spinner, Textarea } from '../../components/ui'

interface Ann { id: string; title: string; content: string; created_at: string }

export default function StaffAnnouncements() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Ann[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setRows((data ?? []) as Ann[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    setBusy(true)
    await supabase.from('announcements').insert({ title: title.trim(), content: content.trim(), created_by: profile?.id ?? null })
    setTitle(''); setContent(''); setBusy(false)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('announcements').delete().eq('id', id)
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>お知らせ管理</PageTitle>

      <Card>
        <form onSubmit={add} className="space-y-3">
          <Field label="タイトル"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="次回イベントのお知らせ" required /></Field>
          <Field label="内容"><Textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} required /></Field>
          <Button type="submit" disabled={busy}>{busy ? '…' : '投稿する'}</Button>
        </form>
      </Card>

      {rows.length === 0 ? (
        <EmptyState>お知らせはまだありません。</EmptyState>
      ) : (
        rows.map((a) => (
          <Card key={a.id}>
            <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('ja-JP')}</p>
            <h3 className="font-extrabold">{a.title}</h3>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{a.content}</p>
            <button onClick={() => remove(a.id)} className="mt-2 text-sm text-gray-400">削除</button>
          </Card>
        ))
      )}
    </div>
  )
}
