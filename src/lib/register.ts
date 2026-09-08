import { supabase } from './supabase'
import type { MemberType } from '../types'

export interface RegMeta {
  full_name: string
  member_type: MemberType
  mode: 'new' | 'join'
  household_name?: string
  code: string
}

const MSG: Record<string, string> = {
  invalid_signup_code: '園コードが正しくありません。園から配布されたコードをご確認ください。',
  invalid_invite: '招待コードが正しくありません。家族から届いたコードをご確認ください。',
  already_registered: 'すでに登録が完了しています。',
  not_authenticated: 'ログインが必要です。',
  no_household: '世帯が見つかりません。',
}

export async function completeRegistration(m: RegMeta): Promise<{ ok: boolean; message: string }> {
  if (!m.full_name || !m.code) return { ok: false, message: '氏名とコードを入力してください。' }
  const rpc =
    m.mode === 'join'
      ? supabase.rpc('join_household', {
          p_full_name: m.full_name,
          p_member_type: m.member_type,
          p_invite: m.code,
        })
      : supabase.rpc('register_household', {
          p_full_name: m.full_name,
          p_member_type: m.member_type,
          p_household_name: m.household_name ?? '',
          p_code: m.code,
        })
  const { error } = await rpc
  if (error) {
    const key = Object.keys(MSG).find((k) => error.message.includes(k))
    return { ok: false, message: key ? MSG[key] : `登録に失敗しました: ${error.message}` }
  }
  return { ok: true, message: '' }
}
