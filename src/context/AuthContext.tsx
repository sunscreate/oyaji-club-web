import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile, RoleType } from '../types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  roles: RoleType[]
  loading: boolean
  /** ログイン済みだが profiles 未作成（園コード/招待での登録が未完了） */
  needsRegistration: boolean
  isStaff: boolean
  isPresident: boolean
  isOwner: boolean
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [roles, setRoles] = useState<RoleType[]>([])
  const [loading, setLoading] = useState(true)

  async function loadProfile(uid: string | undefined) {
    if (!uid) {
      setProfile(null)
      setRoles([])
      return
    }
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
      supabase.from('roles').select('role').eq('profile_id', uid).is('end_date', null),
    ])
    setProfile((prof as Profile) ?? null)
    setRoles(((roleRows ?? []) as { role: RoleType }[]).map((r) => r.role))
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await loadProfile(data.session?.user.id)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      await loadProfile(data.session?.user.id)
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s)
      await loadProfile(s?.user.id)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value: AuthState = {
    session,
    profile,
    roles,
    loading,
    needsRegistration: !!session && !profile,
    isStaff: roles.some((r) => r === 'site_owner' || r === 'president' || r === 'staff'),
    isPresident: roles.includes('president'),
    isOwner: roles.includes('site_owner'),
    refresh,
    signOut: async () => {
      await supabase.auth.signOut()
      setProfile(null)
      setRoles([])
    },
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth must be used within AuthProvider')
  return c
}
