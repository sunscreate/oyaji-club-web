const WD = ['日', '月', '火', '水', '木', '金', '土']

/** '2026-11-07' -> '11月7日(土)' */
export function formatDateJP(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return `${d.getMonth() + 1}月${d.getDate()}日(${WD[d.getDay()]})`
}

/** 年度（4月始まり）を返す */
export function fiscalYear(iso: string): number {
  const d = new Date(iso + 'T00:00:00')
  const y = d.getFullYear()
  return d.getMonth() + 1 >= 4 ? y : y - 1
}

export function isPast(iso: string): boolean {
  const d = new Date(iso + 'T23:59:59')
  return d.getTime() < Date.now()
}
