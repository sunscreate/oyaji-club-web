import type { ButtonHTMLAttributes, ReactNode, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { RoleType } from '../types'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none w-full'
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-red text-white shadow-sm',
    secondary: 'bg-brand-yellow text-black shadow-sm',
    danger: 'bg-white text-brand-red border-2 border-brand-red',
    ghost: 'bg-white text-black border border-gray-300',
  }
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-2xl font-extrabold text-black">{children}</h1>
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold text-gray-700">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-lg outline-none focus:border-brand-red'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ''}`} />
}

export function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-red" />
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl bg-white p-8 text-center text-gray-500">{children}</div>
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-brand-red">{children}</p>
}

const ROLE_BADGE: Partial<Record<RoleType, { icon: string; label: string; cls: string }>> = {
  president: { icon: '👑', label: '会長', cls: 'bg-brand-yellow text-black' },
  staff: { icon: '🔧', label: 'お世話係', cls: 'bg-gray-800 text-white' },
}

export function RoleBadges({ roles, oyaji }: { roles: RoleType[]; oyaji?: boolean }) {
  const badges: ReactNode[] = []
  if (roles.includes('president')) badges.push(mk('president'))
  if (roles.includes('staff')) badges.push(mk('staff'))
  if (oyaji && badges.length === 0) {
    badges.push(
      <span key="oyaji" className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-brand-red">
        🦁 メンバー
      </span>,
    )
  }
  if (badges.length === 0) return null
  return <div className="flex flex-wrap gap-2">{badges}</div>

  function mk(r: 'president' | 'staff') {
    const b = ROLE_BADGE[r]!
    return (
      <span key={r} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${b.cls}`}>
        {b.icon} {b.label}
      </span>
    )
  }
}
