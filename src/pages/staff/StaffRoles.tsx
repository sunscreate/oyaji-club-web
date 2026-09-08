import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card, EmptyState, Input, PageTitle, RoleBadges, Spinner } from '../../components/ui'
import type { RoleType } from '../../types'

interface P { id: string; full_name: string; member_type: string }

export default function StaffRoles() {
  const { isOwner, isPresident, refresh } = useAuth()
  const [profiles, setProfiles] = useState<P[]>([])
  const [roleMap, setRoleMap] = useState<Record<string, RoleType[]>>({})
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const canManage = isOwner || isPresident

  const load = useCallback(async () => {
    const [{ data: ps }, { data: rs }] = await Promise.all([
      supabase.from('profiles').select('id,full_name,member_type').order('full_name'),
      supabase.from('roles').select('profile_id,role').is('end_date', null),
    ])
    setProfiles((ps ?? []) as P[])
    const map: Record<string, RoleType[]> = {}
    ;((rs ?? []) as { profile_id: string; role: RoleType }[]).forEach((r) => {
      (map[r.profile_id] ??= []).push(r.role)
    })
    setRoleMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function call(fn: string, target: string) {
    setBusy(true)
    const { error } = await supabase.rpc(fn, { p_target: target })
    if (error) console.error(fn, error)
    await load()
    await refresh()
    setBusy(false)
  }

  if (loading) return <Spinner />

  if (!canManage) {
    return (
      <div>
        <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
        <PageTitle>役職管理</PageTitle>
        <EmptyState>役職の管理は会長・サイトオーナーのみ可能です。</EmptyState>
      </div>
    )
  }

  const filtered = profiles.filter((p) => p.full_name.includes(q.trim()))

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>役職管理</PageTitle>
      <p className="text-sm text-gray-600">
        {isOwner ? 'サイトオーナー権限：会長・お世話係の任命/変更ができます。' : '会長権限：お世話係の任命/解除、次期会長の指名ができます。'}
      </p>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="氏名で検索" />

      {filtered.map((p) => {
        const roles = roleMap[p.id] ?? []
        const isStaffRole = roles.includes('staff')
        const isPres = roles.includes('president')
        return (
          <Card key={p.id}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-lg font-bold">{p.full_name}</span>
              <span className="text-xs text-gray-400">{p.member_type === 'ob' ? 'OB' : '在園'}</span>
            </div>
            <div className="mb-3"><RoleBadges roles={roles} /></div>
            <div className="flex flex-wrap gap-2">
              {isStaffRole
                ? <Btn onClick={() => call('remove_staff', p.id)} disabled={busy} kind="ghost">お世話係を解除</Btn>
                : <Btn onClick={() => call('assign_staff', p.id)} disabled={busy} kind="yellow">お世話係に任命</Btn>}
              {!isPres && <Btn onClick={() => call('set_president', p.id)} disabled={busy} kind="red">会長にする</Btn>}
              {isOwner && !roles.includes('site_owner') && <Btn onClick={() => call('set_owner', p.id)} disabled={busy} kind="ghost">オーナーに追加</Btn>}
            </div>
          </Card>
        )
      })}
      {filtered.length === 0 && <EmptyState>該当するユーザーがいません。</EmptyState>}
    </div>
  )
}

function Btn({ onClick, disabled, kind, children }: { onClick: () => void; disabled: boolean; kind: 'red' | 'yellow' | 'ghost'; children: React.ReactNode }) {
  const cls = kind === 'red' ? 'bg-brand-red text-white' : kind === 'yellow' ? 'bg-brand-yellow text-black' : 'border border-gray-300 bg-white text-gray-700'
  return <button onClick={onClick} disabled={disabled} className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${cls}`}>{children}</button>
}
