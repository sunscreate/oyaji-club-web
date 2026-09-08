import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDateJP, isPast } from '../../lib/format'
import { Button, Card, ErrorText, PageTitle, RoleBadges, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function MyPage() {
  const { profile, roles, isOwner, signOut } = useAuth()
  const nav = useNavigate()
  const [myEvents, setMyEvents] = useState<EventRow[]>([])
  const [history, setHistory] = useState<{ role: string; year: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDel, setConfirmDel] = useState(false)
  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')

  async function deleteAccount() {
    setDelBusy(true); setDelErr('')
    const { error } = await supabase.rpc('delete_my_account')
    if (error) { setDelBusy(false); setDelErr('削除に失敗しました。時間をおいて再度お試しください。'); return }
    await signOut()
    nav('/login')
  }

  useEffect(() => {
    ;(async () => {
      if (!profile) { setLoading(false); return }
      const { data: hist } = await supabase
        .from('roles')
        .select('role,year')
        .eq('profile_id', profile.id)
        .order('year', { ascending: false })
      setHistory((hist ?? []) as { role: string; year: number | null }[])
      if (profile.household_id) {
        const { data: parts } = await supabase.from('participations').select('event_id').eq('household_id', profile.household_id)
        const ids = (parts ?? []).map((p) => (p as { event_id: string }).event_id)
        if (ids.length) {
          const { data: evs } = await supabase.from('events').select('*').in('id', ids).order('event_date', { ascending: true })
          setMyEvents(((evs ?? []) as EventRow[]).filter((e) => !isPast(e.event_date)))
        }
      }
      setLoading(false)
    })()
  }, [profile])

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

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-500">活動・役職履歴</h2>
          <Card className="space-y-1">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-20 text-sm font-bold text-gray-500">{h.year ?? '—'}年度</span>
                <span className="font-bold">{ROLE_JP[h.role] ?? h.role}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">アカウント</h2>
        <Card>
          <p className="text-sm text-gray-600">アカウントを削除すると、あなたの登録情報・参加履歴などが削除されます。この操作は取り消せません。</p>
          {isOwner && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-brand-red">
              あなたはサイトオーナーです。削除する前に、別の方をオーナーに設定することをおすすめします。
            </p>
          )}
          <div className="mt-3">
            {confirmDel ? (
              <div className="space-y-2">
                <ErrorText>{delErr}</ErrorText>
                <p className="font-bold">本当にアカウントを削除しますか？</p>
                <div className="flex gap-2">
                  <Button variant="danger" onClick={deleteAccount} disabled={delBusy}>{delBusy ? '…' : '削除する'}</Button>
                  <Button variant="ghost" onClick={() => setConfirmDel(false)} disabled={delBusy}>やめる</Button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="text-sm font-bold text-brand-red">アカウントを削除する</button>
            )}
          </div>
        </Card>
      </section>
    </div>
  )
}

const ROLE_JP: Record<string, string> = {
  president: '👑 会長',
  staff: '🔧 お世話係',
  site_owner: '🛠 サイトオーナー',
}

function MenuTile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-5 text-center font-bold shadow-sm active:scale-[0.98]">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm">{label}</span>
    </Link>
  )
}
