import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDateJP, formatTimeRange } from '../../lib/format'
import { yen } from '../../lib/fee'
import { Button, Card, Input, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function StaffDashboard() {
  const { isOwner, isPresident } = useAuth()
  const canEditFunds = isOwner || isPresident
  const [next, setNext] = useState<EventRow | null>(null)
  const [stats, setStats] = useState<{ hh: number; people: number }>({ hh: 0, people: 0 })
  const [unread, setUnread] = useState(0)
  const [funds, setFunds] = useState<{ base: number; income: number; expense: number; total: number } | null>(null)
  const [newMembers, setNewMembers] = useState(0)
  const [baseInput, setBaseInput] = useState('')
  const [editFunds, setEditFunds] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('events').select('*').eq('status', 'published').gte('event_date', today).order('event_date', { ascending: true }).limit(1)
    const ev = ((data ?? [])[0] as EventRow) ?? null
    setNext(ev)
    if (ev) {
      const { data: ps } = await supabase.from('participations').select('id').eq('event_id', ev.id).neq('join_type', 'absent')
      const pIds = (ps ?? []).map((p) => (p as { id: string }).id)
      let people = 0
      if (pIds.length) {
        const { count } = await supabase.from('participation_members').select('id', { count: 'exact', head: true }).in('participation_id', pIds)
        people = count ?? 0
      }
      setStats({ hh: pIds.length, people })
    }
    const { count: fbUnread } = await supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'unread')
    setUnread(fbUnread ?? 0)
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    const { count: nm } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('oyaji_member', true).gte('oyaji_joined_at', since)
    setNewMembers(nm ?? 0)
    const { data: fd } = await supabase.rpc('get_club_funds')
    if (fd) { setFunds(fd as never); setBaseInput(String((fd as { base: number }).base)) }
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function saveFunds() {
    await supabase.rpc('set_club_base_funds', { p_amount: Number(baseInput) || 0 })
    setEditFunds(false)
    await loadAll()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>お世話係</PageTitle>
        <Link to="/home" className="text-sm text-gray-500">一般画面へ →</Link>
      </div>

      {/* おやじ倶楽部 総予算 */}
      <Card>
        <p className="text-sm text-gray-500">おやじ倶楽部 総予算（現在残高）</p>
        <p className="text-3xl font-extrabold text-brand-red">{funds ? yen(funds.total) : '—'}</p>
        {funds && (
          <p className="mt-1 text-xs text-gray-500">初期資金 {yen(funds.base)} ＋ 集金 {yen(funds.income)} − 立替 {yen(funds.expense)}</p>
        )}
        {canEditFunds && (
          editFunds ? (
            <div className="mt-3 space-y-2">
              <Input type="number" inputMode="numeric" value={baseInput} onChange={(e) => setBaseInput(e.target.value)} placeholder="初期資金/繰越金" />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="ghost" className="py-3 text-base" onClick={() => { setEditFunds(false); setBaseInput(funds ? String(funds.base) : '') }}>やめる</Button>
                <Button variant="secondary" className="py-3 text-base" onClick={saveFunds}>保存</Button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditFunds(true)} className="mt-2 text-xs font-bold text-brand-red">初期資金・繰越金を設定</button>
          )
        )}
      </Card>

      {newMembers > 0 && (
        <Link to="/staff/oyaji">
          <div className="rounded-2xl bg-brand-yellow p-4 text-black shadow-sm">
            <p className="font-extrabold">🦁 おやじ倶楽部に新規加盟がありました！（{newMembers}名）</p>
            <p className="text-sm">タップして加盟者・Tシャツサイズを確認 ›</p>
          </div>
        </Link>
      )}

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">次回イベント</h2>
        {loading ? <Spinner /> : next ? (
          <Card>
            <p className="text-sm font-bold text-brand-red">{formatDateJP(next.event_date)}{formatTimeRange(next.start_time, next.end_time) ? ` ${formatTimeRange(next.start_time, next.end_time)}` : ''}</p>
            <h3 className="mb-3 text-xl font-extrabold">{next.title}</h3>
            <div className="mb-3 rounded-xl bg-gray-50 p-3">
              <p className="text-sm text-gray-500">参加</p>
              <p className="text-2xl font-extrabold">{stats.hh}<span className="ml-1 text-base text-gray-500">世帯</span> / {stats.people}<span className="ml-1 text-base text-gray-500">人</span></p>
            </div>
            <Link to={`/staff/events/${next.id}/participants`} className="block"><div className="rounded-xl bg-brand-red px-4 py-3 text-center font-bold text-white">参加状況を見る</div></Link>
          </Card>
        ) : (
          <Card><p className="text-gray-500">公開中の次回イベントはありません。</p></Card>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Tile to="/staff/events" icon="🎪" label="イベント管理" />
        <Tile to="/staff/events/new" icon="➕" label="イベント作成" />
        {next ? <Tile to={`/staff/events/${next.id}/reception`} icon="✅" label="当日受付・集金" /> : <Tile to="/staff/events" icon="✅" label="当日受付・集金" sub="イベントを選択" />}
        {next ? <Tile to={`/staff/events/${next.id}/prep`} icon="🛒" label="準備・買い物" /> : <Tile to="/staff/events" icon="🛒" label="準備・買い物" sub="イベントを選択" />}
        <Tile to="/staff/oyaji" icon="🦁" label="加盟者名簿" />
        <Tile to="/staff/members" icon="📇" label="アカウント名簿" />
        <Tile to="/staff/feedback" icon="✉️" label={`ご意見・ご質問${unread > 0 ? `（未確認${unread}）` : ''}`} />
        <Tile to="/staff/announcements" icon="📢" label="お知らせ管理" />
        <Tile to="/staff/classes" icon="🏷" label="クラス管理" />
        <Tile to="/staff/roles" icon="👑" label="役職管理" />
      </section>
    </div>
  )
}

function Tile({ to, icon, label, sub }: { to: string; icon: string; label: string; sub?: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white p-5 text-center font-bold shadow-sm active:scale-[0.98]">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm">{label}</span>
      {sub && <span className="text-xs font-normal text-gray-400">{sub}</span>}
    </Link>
  )
}
