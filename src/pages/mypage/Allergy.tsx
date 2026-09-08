import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button, Card, Field, Input, PageTitle, Spinner } from '../../components/ui'
import type { Allergy } from '../../types'

export default function AllergyPage() {
  const { profile } = useAuth()
  const [rows, setRows] = useState<Allergy[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!profile?.household_id) { setLoading(false); return }
    const { data } = await supabase.from('allergies').select('*').eq('household_id', profile.household_id).order('target_name')
    setRows((data ?? []) as Allergy[])
    setLoading(false)
  }, [profile?.household_id])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!target.trim() || !content.trim()) return
    setBusy(true)
    await supabase.from('allergies').insert({ household_id: profile!.household_id, target_name: target.trim(), content: content.trim() })
    setTarget(''); setContent('')
    setBusy(false)
    await load()
  }

  async function remove(id: string) {
    await supabase.from('allergies').delete().eq('id', id)
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/mypage" className="text-sm text-gray-500">← マイページ</Link>
      <PageTitle>食物アレルギー</PageTitle>
      <p className="text-sm text-gray-600">一度登録すると、イベント参加時に自動で表示されます。無い場合は登録不要です。</p>

      {rows.length > 0 && (
        <Card className="divide-y divide-gray-100 p-0">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span className="font-bold">{r.target_name}</span>
              <span className="text-gray-700">{r.content}</span>
              <button onClick={() => remove(r.id)} className="ml-auto text-sm text-gray-400">削除</button>
            </div>
          ))}
        </Card>
      )}

      <Card>
        <form onSubmit={add} className="space-y-3">
          <Field label="対象者（例：太郎）">
            <Input value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <Field label="アレルギー内容（例：卵）">
            <Input value={content} onChange={(e) => setContent(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>＋ 追加する</Button>
        </form>
      </Card>
    </div>
  )
}
