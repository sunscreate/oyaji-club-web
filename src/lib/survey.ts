export type QType = 'rating5' | 'single' | 'multi' | 'yesno' | 'text'

export interface Question {
  id: string
  event_id: string
  type: QType
  text: string
  options: string[]
  sort_order: number
}

export interface ResponseRow {
  id: string
  question_id: string
  profile_id: string
  value: unknown
}

export const QTYPE_LABEL: Record<QType, string> = {
  rating5: '5段階評価',
  single: '単一選択',
  multi: '複数選択',
  yesno: 'はい / いいえ',
  text: '自由記述',
}

export const QTYPE_LIST: QType[] = ['rating5', 'single', 'multi', 'yesno', 'text']

export function needsOptions(t: QType): boolean {
  return t === 'single' || t === 'multi'
}
