import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Question } from '../lib/survey'
import { Button, Card, PageTitle, Spinner, Textarea } from '../components/ui'

export default function EventSurvey() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const load = useCallback(async () => {
    if (!id || !profile) return
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('survey_questions').select('*').eq('event_id', id).order('sort_order'),
      supabase.from('survey_responses').select('question_id,value').eq('event_id', id).eq('profile_id', profile.id),
    ])
    setQuestions((qs ?? []) as Question[])
    const a: Record<string, unknown> = {}
    ;((rs ?? []) as { question_id: string; value: unknown }[]).forEach((r) => (a[r.question_id] = r.value))
    setAnswers(a)
    setLoading(false)
  }, [id, profile])

  useEffect(() => { load() }, [load])

  function set(qid: string, v: unknown) { setAnswers((p) => ({ ...p, [qid]: v })) }

  async function submit() {
    if (!profile || !id) return
    setBusy(true)
    const rows = questions
      .filter((q) => {
        const v = answers[q.id]
        if (v == null) return false
        if (Array.isArray(v)) return v.length > 0
        if (typeof v === 'string') return v.trim() !== ''
        return true
      })
      .map((q) => ({ event_id: id, question_id: q.id, profile_id: profile.id, value: answers[q.id] }))
    if (rows.length) {
      await supabase.from('survey_responses').upsert(rows, { onConflict: 'question_id,profile_id' })
    }
    setBusy(false)
    setDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) return <Spinner />
  if (questions.length === 0) return <Card><p className="text-gray-500">このイベントのアンケートはまだありません。</p><Link to={`/events/${id}`} className="text-brand-red underline">イベントへ戻る</Link></Card>

  return (
    <div className="space-y-4">
      <Link to={`/events/${id}`} className="text-sm text-gray-500">← イベントへ戻る</Link>
      <PageTitle>アンケート</PageTitle>
      {done && <p className="rounded-xl bg-green-50 px-4 py-3 font-bold text-green-700">回答を送信しました。ありがとうございます！（何度でも変更できます）</p>}

      {questions.map((q, i) => (
        <Card key={q.id}>
          <p className="mb-3 font-bold">{i + 1}. {q.text}</p>
          <QuestionInput q={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
        </Card>
      ))}

      <Button onClick={submit} disabled={busy}>{busy ? '…' : '回答を送信する'}</Button>
    </div>
  )
}

function QuestionInput({ q, value, onChange }: { q: Question; value: unknown; onChange: (v: unknown) => void }) {
  if (q.type === 'rating5') {
    const cur = typeof value === 'number' ? value : 0
    return (
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => onChange(n)} className={`h-12 w-12 rounded-full text-lg font-bold ${cur >= n ? 'bg-brand-yellow text-black' : 'bg-gray-100 text-gray-400'}`}>★</button>
        ))}
      </div>
    )
  }
  if (q.type === 'yesno') {
    return (
      <div className="flex gap-2">
        {['はい', 'いいえ'].map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`flex-1 rounded-xl px-3 py-3 font-bold ${value === o ? 'bg-brand-red text-white' : 'border border-gray-300 bg-white text-gray-600'}`}>{o}</button>
        ))}
      </div>
    )
  }
  if (q.type === 'single') {
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left ${value === o ? 'border-brand-red bg-red-50' : 'border-gray-200'}`}>
            <span className={`h-5 w-5 rounded-full border-2 ${value === o ? 'border-brand-red bg-brand-red' : 'border-gray-300'}`} />
            <span className="font-bold">{o}</span>
          </button>
        ))}
      </div>
    )
  }
  if (q.type === 'multi') {
    const arr = Array.isArray(value) ? (value as string[]) : []
    const toggle = (o: string) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
    return (
      <div className="space-y-2">
        {q.options.map((o) => (
          <button key={o} onClick={() => toggle(o)} className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left ${arr.includes(o) ? 'border-brand-red bg-red-50' : 'border-gray-200'}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 text-xs ${arr.includes(o) ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300'}`}>{arr.includes(o) ? '✓' : ''}</span>
            <span className="font-bold">{o}</span>
          </button>
        ))}
      </div>
    )
  }
  return <Textarea rows={3} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="自由にご記入ください" />
}
