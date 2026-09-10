export type FeeType = 'none' | 'household' | 'per_person'

export interface FeeConfig {
  household?: number
  adult?: number
  child?: number
}

/** 1世帯あたりの通常金額を計算 */
export function computeNormal(feeType: string, cfg: FeeConfig, adults: number, children: number): number {
  if (feeType === 'none') return 0
  if (feeType === 'per_person') return (cfg.adult ?? 0) * adults + (cfg.child ?? 0) * children
  return cfg.household ?? 0
}

export function feeLabel(feeType: string, cfg: FeeConfig): string {
  if (feeType === 'none') return '参加費なし'
  if (feeType === 'per_person') return `大人 ${yen(cfg.adult ?? 0)} / 子ども ${yen(cfg.child ?? 0)}`
  return `1世帯 ${yen(cfg.household ?? 0)}`
}

export function yen(n: number): string {
  return `${(n ?? 0).toLocaleString('ja-JP')}円`
}
