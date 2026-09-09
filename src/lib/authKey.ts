const INTERNAL_AUTH_DOMAIN = 'oyaji-club.example.com'

export function normalizeLoginKey(value: string) {
  return value.trim().toLowerCase()
}

export function loginKeyToEmail(value: string) {
  return `${normalizeLoginKey(value)}@${INTERNAL_AUTH_DOMAIN}`
}

export function validateLoginKey(value: string) {
  const key = normalizeLoginKey(value)
  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(key)) {
    return 'ログインキーは3〜32文字の半角英数字・記号（.-_）で入力してください。'
  }
  return ''
}
