const INTERNAL_AUTH_DOMAIN = 'oyaji-club.example.com'

export function normalizeAuthName(value: string) {
  return value.trim().replace(/[\s\u3000]+/g, '')
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function personNameToEmail(value: string) {
  const hash = await sha256Hex(normalizeAuthName(value))
  return `name-${hash.slice(0, 48)}@${INTERNAL_AUTH_DOMAIN}`
}

export function validateAuthName(value: string) {
  if (!normalizeAuthName(value)) {
    return '氏名を入力してください。'
  }
  return ''
}
