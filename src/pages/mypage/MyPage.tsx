import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDateJP, isPast } from '../../lib/format'
import { Card, PageTitle, RoleBadges, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function MyPage() {
  const { profile, roles } = useAuth()
  const [myEvents, setMyEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!profile?.household_id) { setLoading(false); return }
      const { data: parts } = await supabase.from('participations').select('event_id').eq('household_id', profile.household_id)
      const ids = (parts ?? []).map((p) => (p as { event_id: string }).event_id)
      if (ids.length) {
        const { data: evs } = await supabase.from('events').select('*').in('id', ids).order('event_date', { ascending: true })
        setMyEvents(((evs ?? []) as EventRow[]).filter((e) => !isPast(e.event_date)))
      }
      setLoading(false)
    })()
  }, [profile?.household_id])

  return (
    <div className="space-y-4">
      <PageTitle>マイページ</PageTitle>

      <Card>
        <p className="text-lg font-extrabold">{profile?.full_name}</p>
        <p className="mb-2 text-sm text-gray-500">{profile?.member_type === 'ob' ? 'OB家庭' : '在園家庭'}</p>
        <RoleBadges roles={roles} oyaji={profile?.oyaji_member} />
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MenuTile to="/mypage/profile" icon="🙍" label="自分の情報" />
        <MenuTile to="/mypage/household" icon="🏠" label="世帯・家族招待" />
        <MenuTile to="/mypage/children" icon="🧒" label="子ども・クラス" />
        <MenuTile to="/mypage/allergy" icon="🍽" label="アレルギー" />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">参加予定のイベント</h2>
        {loading ? <Spinner /> : myEvents.length === 0 ? (
          <Card><p className="text-gray-500">参加予定はありません。</p></Card>
        ) : (
          <div className="space-y-2">
            {myEvents.map((e) => (
              <Link key={e.id} to={`/events/${e.id}`}>
                <Card><p className="text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}</p><p className="font-bold">{e.title}</p></Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MenuTile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-5 text-center font-bold shadow-sm active:scale-[0.98]">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  )
}
