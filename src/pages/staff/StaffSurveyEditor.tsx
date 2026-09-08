import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QTYPE_LABEL, QTYPE_LIST, needsOptions, type QType, type Question } from '../../lib/survey'
import { Button, Card, Field, Input, PageTitle, Select, Spinner, Textarea } from '../../components/ui'

export default function StaffSurveyEditor() {
  const { id } = useParams<{ id: string }>()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await supabase.from('survey_questions').select('*').eq('event_id', id).order('sort_order')
    setQuestions((data ?? []) as Question[])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function remove(qid: string) {
    await supabase.from('survey_questions').delete().eq('id', qid)
    await load()
  }

  async function move(q: Question, dir: -1 | 1) {
    const i = questions.findIndex((x) => x.id === q.id)
    const j = i + dir
    if (j < 0 || j >= questions.length) return
    const a = questions[i], b = questions[j]
    await Promise.all([
      supabase.from('survey_questions').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('survey_questions').update({ sort_order: a.sort_order }).eq('id', b.id),
    ])
    await load()
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <div className="flex items-center justify-between">
        <PageTitle>アンケート設問</PageTitle>
        <Link to={`/staff/events/${id}/survey-results`} className="text-sm font-bold text-brand-red">集計を見る →</Link>
      </div>

      {questions.length === 0 && <Card><p className="text-gray-500">まだ設問がありません。</p></Card>}

      {questions.map((q, i) => (
        <Card key={q.id}>
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{QTYPE_LABEL[q.type]}</span>
              <p className="mt-1 font-bold">{i + 1}. {q.text}</p>
              {needsOptions(q.type) && q.options.length > 0 && (
                <p className="mt-1 text-sm text-gray-500">選択肢: {q.options.join(' / ')}</p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => move(q, -1)} disabled={i === 0} className="text-gray-400 disabled:opacity-30">▲</button>
              <button onClick={() => move(q, 1)} disabled={i === questions.length - 1} className="text-gray-400 disabled:opacity-30">▼</button>
            </div>
            <button onClick={() => remove(q.id)} className="text-sm text-gray-400">削除</button>
          </div>
        </Card>
      ))}

      {adding ? (
        <Card><QuestionForm eventId={id!} nextOrder={(questions.at(-1)?.sort_order ?? 0) + 10} onCancel={() => setAdding(false)} onSaved={async () => { setAdding(false); await load() }} /></Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>＋ 質問を追加</Button>
      )}
    </div>
  )
}

function QuestionForm({ eventId, nextOrder, onCancel, onSaved }: { eventId: string; nextOrder: number; onCancel: () => void; onSaved: () => Promise<void> }) {
  const [type, setType] = useState<QType>('rating5')
  const [text, setText] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    const options = needsOptions(type)
      ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean)
      : []
    await supabase.from('survey_questions').insert({
      event_id: eventId, type, text: text.trim(), options, sort_order: nextOrder,
    })
    setBusy(false)
    await onSaved()
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Field label="回答形式">
        <Select value={type} onChange={(e) => setType(e.target.value as QType)}>
          {QTYPE_LIST.map((t) => <option key={t} value={t}>{QTYPE_LABEL[t]}</option>)}
        </Select>
      </Field>
      <Field label="質問文">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="今回のイベントの満足度は？" required />
      </Field>
      {needsOptions(type) && (
        <Field label="選択肢（1行に1つ）">
          <Textarea rows={4} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} placeholder={'とても満足\n満足\n普通\n不満'} />
        </Field>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? '…' : '追加'}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>キャンセル</Button>
      </div>
    </form>
  )
}
