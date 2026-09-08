import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui'

interface Ann { id: string; title: string; content: string; created_at: string }

export default function News() {
  const [rows, setRows] = useState<Ann[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
      setRows((data ?? []) as Ann[])
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <PageTitle>お知らせ</PageTitle>
      {rows.length === 0 ? (
        <EmptyState>お知らせはまだありません。</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id}>
              <p className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('ja-JP')}</p>
              <h3 className="text-lg font-extrabold">{a.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-gray-800">{a.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
