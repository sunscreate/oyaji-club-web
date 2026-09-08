import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { processImage } from '../../lib/imageCompress'
import { yen } from '../../lib/fee'
import { Button, Card, Field, Input, PageTitle, Spinner } from '../../components/ui'
import { Lightbox } from '../../components/Lightbox'

interface Receipt {
  id: string; event_id: string; item_name: string; amount: number; purchaser: string
  image_path: string | null; settled: boolean
}

const BUCKET = 'receipts'

export default function StaffReceipts() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [rows, setRows] = useState<Receipt[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<string | null>(null)
  // add form
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [purchaser, setPurchaser] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('receipts').select('*').eq('event_id', id).order('created_at')
    const list = (data ?? []) as Receipt[]
    setRows(list)
    const paths = list.map((r) => r.image_path).filter(Boolean) as string[]
    if (paths.length) {
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
      const map: Record<string, string> = {}
      ;(signed ?? []).forEach((s) => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl })
      setUrls(map)
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!item.trim() || !purchaser.trim()) return
    setBusy(true)
    try {
      let imagePath: string | null = null
      const file = fileRef.current?.files?.[0]
      if (file) {
        const { full } = await processImage(file)
        const key = `${id}/${Date.now()}-${Math.random().toString(16).slice(2)}.webp`
        const up = await supabase.storage.from(BUCKET).upload(key, full, { contentType: 'image/webp' })
        if (up.error) throw up.error
        imagePath = key
      }
      await supabase.from('receipts').insert({
        event_id: id, item_name: item.trim(), amount: Number(amount) || 0,
        purchaser: purchaser.trim(), image_path: imagePath, created_by: profile?.id ?? null,
      })
      setItem(''); setAmount(''); setPurchaser(''); setFileName('')
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (er) {
      console.error(er)
    } finally {
      setBusy(false)
    }
  }

  async function toggleSettled(r: Receipt) {
    await supabase.from('receipts').update({ settled: !r.settled }).eq('id', r.id)
    await load()
  }

  async function remove(r: Receipt) {
    if (r.image_path) await supabase.storage.from(BUCKET).remove([r.image_path])
    await supabase.from('receipts').delete().eq('id', r.id)
    await load()
  }

  if (loading) return <Spinner />

  const total = rows.reduce((s, r) => s + r.amount, 0)
  const unsettled = rows.filter((r) => !r.settled)
  const byPurchaser = new Map<string, number>()
  unsettled.forEach((r) => byPurchaser.set(r.purchaser, (byPurchaser.get(r.purchaser) ?? 0) + r.amount))

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <PageTitle>立替精算</PageTitle>

      <Card>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-lg font-extrabold">{yen(total)}</p><p className="text-xs text-gray-500">立替合計</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-lg font-extrabold text-brand-red">{yen(unsettled.reduce((s, r) => s + r.amount, 0))}</p><p className="text-xs text-gray-500">未精算</p></div>
        </div>
        {byPurchaser.size > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-sm font-bold text-gray-500">購入者別 未精算</p>
            <ul className="space-y-1">
              {[...byPurchaser.entries()].map(([p, a]) => (
                <li key={p} className="flex justify-between"><span className="font-bold">{p}</span><span>{yen(a)}</span></li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {rows.map((r) => (
        <Card key={r.id}>
          <div className="flex items-start gap-3">
            {r.image_path && urls[r.image_path] && (
              <button onClick={() => setPreview(urls[r.image_path!])} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <img src={urls[r.image_path]} alt="レシート" className="h-full w-full object-cover" />
              </button>
            )}
            <div className="flex-1">
              <p className="text-lg font-bold">{r.item_name}</p>
              <p className="text-gray-600">{yen(r.amount)} ・ 購入者: {r.purchaser}</p>
              <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${r.settled ? 'bg-green-600 text-white' : 'bg-brand-yellow text-black'}`}>{r.settled ? '精算済み' : '未精算'}</span>
            </div>
            <button onClick={() => remove(r)} className="text-sm text-gray-400">削除</button>
          </div>
          <button onClick={() => toggleSettled(r)} className="mt-2 w-full rounded-xl border border-gray-300 py-2 text-sm font-bold">{r.settled ? '未精算に戻す' : '精算済みにする'}</button>
        </Card>
      ))}

      <Card>
        <form onSubmit={add} className="space-y-3">
          <p className="text-sm font-bold text-gray-500">レシート・立替を追加</p>
          <Field label="品目"><Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="焼き鳥" required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="金額（円）"><Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
            <Field label="購入者"><Input value={purchaser} onChange={(e) => setPurchaser(e.target.value)} placeholder="山田" required /></Field>
          </div>
          <input ref={fileRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')} />
          <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>{fileName ? `📎 ${fileName}` : '🧾 レシート画像を選択（任意）'}</Button>
          <Button type="submit" disabled={busy}>{busy ? '…' : '追加する'}</Button>
        </form>
      </Card>

      {preview && (
        <Lightbox slides={[{ url: preview }]} index={0} onClose={() => setPreview(null)} onIndex={() => {}} />
      )}
    </div>
  )
}
