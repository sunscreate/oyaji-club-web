import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui'

interface Row { profile_id: string; full_name: string; role: string; year: number | null }

export default function RolesHistory() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.rpc('get_role_history')
      setRows((data ?? []) as Row[])
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  const years = [...new Set(rows.map((r) => r.year ?? 0))].sort((a, b) => b - a)
  const uniq = (arr: string[]) => [...new Set(arr)]

  return (
    <div>
      <PageTitle>歴代役職</PageTitle>
      {years.length === 0 ? (
        <EmptyState>役職の記録はまだありません。</EmptyState>
      ) : (
        <div className="space-y-4">
          {years.map((y) => {
            const presidents = uniq(rows.filter((r) => (r.year ?? 0) === y && r.role === 'president').map((r) => r.full_name))
            const staff = uniq(rows.filter((r) => (r.year ?? 0) === y && r.role === 'staff').map((r) => r.full_name))
            return (
              <section key={y}>
                <h2 className="mb-2 text-sm font-bold text-gray-500">{y}年度</h2>
                <Card className="space-y-3">
                  {presidents.length > 0 && (
                    <div>
                      <p className="mb-1 text-sm font-bold text-brand-red">👑 会長</p>
                      {presidents.map((n) => <p key={n} className="text-lg font-extrabold">{n}</p>)}
                    </div>
                  )}
                  {staff.length > 0 && (
                    <div>
                      <p className="mb-1 text-sm font-bold text-gray-700">🔧 お世話係</p>
                      <ul className="space-y-0.5">
                        {staff.map((n) => <li key={n} className="font-bold">{n}</li>)}
                      </ul>
                    </div>
                  )}
                </Card>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
