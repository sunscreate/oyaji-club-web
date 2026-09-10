import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, EmptyState, Input, PageTitle, RoleBadges, Spinner } from '../../components/ui'
import type { RoleType } from '../../types'

interface P { id: string; full_name: string; household_id: string | null; member_type: string; oyaji_member: boolean }
interface HouseholdGroup { key: string; name: string; members: P[] }

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

  const allGroups = groupByHousehold(profiles, households)
  const joinedHouseholds = allGroups.filter((g) => g.members.some((p) => isJoinedOyaji(p, roleMap[p.id] ?? []))).length
  const filtered = profiles.filter((p) => {
    const keyword = q.trim()
    if (!keyword) return true
    return p.full_name.includes(keyword) || (households[p.household_id ?? ''] ?? '').includes(keyword)
  })
  const filteredGroups = groupByHousehold(filtered, households)

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>アカウント名簿</PageTitle>
      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold">{allGroups.length}</p><p className="text-xs text-gray-500">登録世帯</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-brand-red">{joinedHouseholds}</p><p className="text-xs text-gray-500">加盟世帯</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-gray-400">{allGroups.length - joinedHouseholds}</p><p className="text-xs text-gray-500">未加盟世帯</p></div>
        </div>
        <p className="mt-3 text-xs text-gray-500">同じ世帯に複数人登録されていても、集計では1世帯として数えます。</p>
      </Card>

      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="氏名・世帯名で検索" />
      {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-brand-red">{err}</p>}

      {filteredGroups.length === 0 ? <EmptyState>該当なし</EmptyState> : (
        <div className="space-y-2">
          {filteredGroups.map((group) => {
            const joined = group.members.some((p) => isJoinedOyaji(p, roleMap[p.id] ?? []))
            return (
              <Card key={group.key}>
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex-1">
                    <p className="font-extrabold">{group.name}</p>
                    <p className="text-xs text-gray-500">{group.members.length}名登録</p>
                  </div>
                  {joined
                    ? <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-brand-red">🦁 加盟</span>
                    : <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-500">未加盟</span>}
                </div>
                <div className="divide-y divide-gray-100">
                  {group.members.map((p) => {
                    const roles = roleMap[p.id] ?? []
                    return (
                      <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <p className="font-bold">{p.full_name}
                              {p.id === profile?.id && <span className="ml-1 text-xs text-gray-400">（あなた）</span>}
                            </p>
                            <p className="text-xs text-gray-500">{p.member_type === 'ob' ? 'OB' : '在園'}</p>
                          </div>
                          {isJoinedOyaji(p, roles)
                            ? <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-brand-red">加盟</span>
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
                      </div>
                    )
                  })}
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

function groupByHousehold(rows: P[], households: Record<string, string>): HouseholdGroup[] {
  const groups = new Map<string, HouseholdGroup>()
  rows.forEach((p) => {
    const key = p.household_id ? `household:${p.household_id}` : `profile:${p.id}`
    const name = p.household_id ? (households[p.household_id] ?? '世帯名未設定') : '世帯なし'
    if (!groups.has(key)) groups.set(key, { key, name, members: [] })
    groups.get(key)!.members.push(p)
  })
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'))
}

function isJoinedOyaji(profile: P, roles: RoleType[]) {
  return profile.oyaji_member || roles.includes('site_owner') || roles.includes('president')
}
