import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui'

/** 認証必須。未登録(profiles無し)なら /register へ */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, needsRegistration } = useAuth()
  const loc = useLocation()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  if (needsRegistration) return <Navigate to="/register" replace />
  return <>{children}</>
}

/** お世話係以上のみ */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { loading, session, needsRegistration, isStaff } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (needsRegistration) return <Navigate to="/register" replace />
  if (!isStaff) return <Navigate to="/" replace />
  return <>{children}</>
}
