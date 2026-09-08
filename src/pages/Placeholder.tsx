import { PageTitle, EmptyState } from '../components/ui'

export default function Placeholder({ title, note }: { title: string; note?: string }) {
  return (
    <div>
      <PageTitle>{title}</PageTitle>
      <EmptyState>{note ?? 'この機能は準備中です（今後のフェーズで追加されます）。'}</EmptyState>
    </div>
  )
}
