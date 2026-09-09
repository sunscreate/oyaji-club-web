import type { ReactNode } from 'react'
import { NavLink, Link, useNavigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.jpg'

function Header() {
  const { isStaff, signOut } = useAuth()
  const nav = useNavigate()
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
        <Link to="/home" className="flex items-center gap-2">
          <img src={logo} alt="おやじ倶楽部" className="h-9 w-auto rounded" />
          <span className="text-base font-extrabold leading-tight">
            さぎぬま幼稚園
            <br />
            <span className="text-brand-red">おやじ倶楽部</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {isStaff && (
            <Link
              to="/staff"
              className="rounded-full bg-gray-800 px-3 py-1.5 text-sm font-bold text-white"
            >
              🔧 お世話係
            </Link>
          )}
          <button
            onClick={async () => {
              await signOut()
              nav('/login')
            }}
            className="text-sm text-gray-500"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}

const items = [
  { to: '/home', label: 'ホーム', icon: '🏠', end: true },
  { to: '/events', label: '予定', icon: '📅', end: false },
  { to: '/photos', label: '写真', icon: '📷', end: false },
  { to: '/mypage', label: 'マイページ', icon: '👤', end: false },
]

function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white nav-safe">
      <div className="mx-auto grid max-w-xl grid-cols-4">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs font-bold ${
                isActive ? 'text-brand-red' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-full">
      <Header />
      <main className="mx-auto max-w-xl px-4 py-4 pb-safe">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

/** ヘッダー無しの薄いレイアウト（ログイン等） */
export function PlainLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-full max-w-xl px-4 py-8">{children}</div>
}
