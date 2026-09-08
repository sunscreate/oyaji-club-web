import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, EmptyState, PageTitle, Spinner } from '../../components/ui'

interface Row { id: string; full_name: string; tshirt_size: string | null; oyaji_joined_at: string | null }
const SIZES = ['S', 'M', 'L', 'XL']
const NEW_DAYS = 7

export default function StaffOyajiMembers() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id,full_name,tshirt_size,oyaji_joined_at')
        .eq('oyaji_member', true)
        .order('oyaji_joined_at', { ascending: false, nullsFirst: false })
      setRows((data ?? []) as Row[])
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  const now = Date.now()
  const isNew = (r: Row) => r.oyaji_joined_at && now - new Date(r.oyaji_joined_at).getTime() < NEW_DAYS * 86400000
  const newbies = rows.filter(isNew)
  const counts: Record<string, number> = {}
  rows.forEach((r) => { if (r.tshirt_size) counts[r.tshirt_size] = (counts[r.tshirt_size] ?? 0) + 1 })
  const max = Math.max(1, ...SIZES.map((s) => counts[s] ?? 0))

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>おやじ倶楽部 加盟者</PageTitle>

      {newbies.length > 0 && (
        <div className="rounded-2xl bg-brand-yellow p-4 text-black shadow-sm">
          <p className="text-lg font-extrabold">🦁 おやじ倶楽部に新規加盟がありました！</p>
          <p className="mt-1 text-sm">過去{NEW_DAYS}日で {newbies.length}名：{newbies.map((n) => `${n.full_name}（${n.tshirt_size ?? 'サイズ未設定'}）`).join(' / ')}</p>
        </div>
      )}

      <Card>
        <p className="text-sm text-gray-500">加盟者数</p>
        <p className="text-3xl font-extrabold">{rows.length}<span className="ml-1 text-base text-gray-500">名</span></p>
        <div className="mt-3">
          {SIZES.map((s) => {
            const n = counts[s] ?? 0
            return (
              <div key={s} className="mb-2">
                <div className="mb-0.5 flex justify-between text-sm"><span className="font-extrabold">{s}</span><span className="font-bold">{n}枚</span></div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-red" style={{ width: `${(n / max) * 100}%` }} /></div>
              </div>
            )
          })}
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">加盟者名簿（新しい順）</h2>
        {rows.length === 0 ? (
          <EmptyState>まだ加盟者はいません。</EmptyState>
        ) : (
          <Card className="divide-y divide-gray-100 p-0">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-bold">{r.full_name}</span>
                {isNew(r) && <span className="rounded-full bg-brand-red px-2 py-0.5 text-xs font-bold text-white">NEW</span>}
                <span className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-sm font-bold">{r.tshirt_size ?? '未設定'}</span>
                {r.oyaji_joined_at && <span className="w-20 shrink-0 text-right text-xs text-gray-400">{new Date(r.oyaji_joined_at).toLocaleDateString('ja-JP')}</span>}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  )
}
