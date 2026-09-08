import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card, PageTitle, Spinner } from '../../components/ui'

const SIZES = ['S', 'M', 'L', 'XL']

export default function StaffTshirt() {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [total, setTotal] = useState(0)
  const [unset, setUnset] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('profiles').select('tshirt_size').eq('oyaji_member', true)
      const rows = (data ?? []) as { tshirt_size: string | null }[]
      const c: Record<string, number> = {}
      let u = 0
      rows.forEach((r) => {
        if (r.tshirt_size && SIZES.includes(r.tshirt_size)) c[r.tshirt_size] = (c[r.tshirt_size] ?? 0) + 1
        else u++
      })
      setCounts(c); setTotal(rows.length); setUnset(u); setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />
  const max = Math.max(1, ...SIZES.map((s) => counts[s] ?? 0))

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>Tシャツ集計</PageTitle>
      <Card><p className="text-sm text-gray-500">おやじ倶楽部 参加者</p><p className="text-3xl font-extrabold">{total}<span className="ml-1 text-base text-gray-500">人</span></p></Card>
      <Card>
        {SIZES.map((s) => {
          const n = counts[s] ?? 0
          return (
            <div key={s} className="mb-3">
              <div className="mb-1 flex justify-between"><span className="text-lg font-extrabold">{s}</span><span className="font-bold">{n}枚</span></div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-red" style={{ width: `${(n / max) * 100}%` }} /></div>
            </div>
          )
        })}
        {unset > 0 && <p className="mt-2 text-sm text-gray-500">サイズ未設定: {unset}人</p>}
      </Card>
    </div>
  )
}
