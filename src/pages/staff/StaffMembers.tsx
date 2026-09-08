import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, EmptyState, Input, PageTitle, RoleBadges, Spinner } from '../../components/ui'
import type { RoleType } from '../../types'

interface P { id: string; full_name: string; household_id: string | null; member_type: string; oyaji_member: boolean }

export default function StaffMembers() {
  const { isOwner, isPresident, profile } = useAuth()
  const canDelete = isOwner || isPresident
  const [profiles, setProfiles] = useState<P[]>([])
  const [households, setHouseholds] = useState<Record<string, string>>({})
  const [roleMap, setRoleMap] = useState<Record<string, RoleType[]>>({})
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const [{ data: ps }, { data: hh }, { data: rs }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,household_id,member_type,oyaji_member').order('full_name'),
      supabase.from('households').select('id,name'),
      supabase.from('roles').select('profile_id,role').is('end_date', null),
    ])
    setProfiles((ps ?? []) as P[])
    const hmap: Record<string, string> = {}
    ;((hh ?? []) as { id: string; name: string }[]).forEach((h) => (hmap[h.id] = h.name))
    setHouseholds(hmap)
    const rmap: Record<string, RoleType[]> = {}
    ;((rs ?? []) as { profile_id: string; role: RoleType }[]).forEach((r) => { (rmap[r.profile_id] ??= []).push(r.role) })
    setRoleMap(rmap)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function del(id: string) {
    setBusy(true); setErr('')
    const { error } = await supabase.rpc('admin_delete_account', { p_target: id })
    setBusy(false); setConfirmId(null)
    if (error) {
      setErr(error.message.includes('cannot_delete_owner') ? 'オーナーは削除できません。'
        : error.message.includes('cannot_delete_self') ? '自分自身は削除できません。'
        : error.message.includes('forbidden') ? '削除権限がありません。' : `削除に失敗しました: ${error.message}`)
      return
    }
    await load()
  }

  if (loading) return <Spinner />

  const joined = profiles.filter((p) => p.oyaji_member).length
  const filtered = profiles.filter((p) => p.full_name.includes(q.trim()))

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>アカウント名簿</PageTitle>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold">{profiles.length}</p><p className="text-xs text-gray-500">全アカウント</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-brand-red">{joined}</p><p className="text-xs text-gray-500">加盟</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-gray-400">{profiles.length - joined}</p><p className="text-xs text-gray-500">未加盟</p></div>
        </div>
      </Card>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="氏名で検索" />
      {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-brand-red">{err}</p>}

      {filtered.length === 0 ? <EmptyState>該当なし</EmptyState> : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const roles = roleMap[p.id] ?? []
            return (
              <Card key={p.id}>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <p className="font-bold">{p.full_name}
                      {p.id === profile?.id && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
                    </p>
                    <p className="text-xs text-gray-500">{households[p.household_id ?? ''] ?? '世帯なし'} ・ {p.member_type === 'ob' ? 'OB' : '在園'}</p>
                  </div>
                  {p.oyaji_member
                    ? <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-brand-red">🦁 加盟</span>
                    : <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-500">未加盟</span>}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <RoleBadges roles={roles} />
                  {canDelete && p.id !== profile?.id && !roles.includes('site_owner') && (
                    confirmId === p.id ? (
                      <span className="ml-auto flex items-center gap-2">
                        <button onClick={() => del(p.id)} disabled={busy} className="rounded-lg bg-brand-red px-3 py-1.5 text-sm font-bold text-white">本当に削除</button>
                        <button onClick={() => setConfirmId(null)} className="text-sm text-gray-500">やめる</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmId(p.id)} className="ml-auto text-sm text-gray-400">アカウント削除</button>
                    )
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {!canDelete && <p className="text-xs text-gray-400">※ アカウント削除は会長・オーナーのみ可能です。</p>}
    </div>
  )
}
