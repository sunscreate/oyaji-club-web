import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { QTYPE_LABEL, type Question } from '../../lib/survey'
import { Card, EmptyState, PageTitle, Spinner } from '../../components/ui'

interface Resp { question_id: string; profile_id: string; value: unknown }

export default function StaffSurveyResults() {
  const { id } = useParams<{ id: string }>()
  const [questions, setQuestions] = useState<Question[]>([])
  const [responses, setResponses] = useState<Resp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!id) return
      const [{ data: qs }, { data: rs }] = await Promise.all([
        supabase.from('survey_questions').select('*').eq('event_id', id).order('sort_order'),
        supabase.from('survey_responses').select('question_id,profile_id,value').eq('event_id', id),
      ])
      setQuestions((qs ?? []) as Question[])
      setResponses((rs ?? []) as Resp[])
      setLoading(false)
    })()
  }, [id])

  if (loading) return <Spinner />

  const respondents = new Set(responses.map((r) => r.profile_id)).size

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}/survey`} className="text-sm text-gray-500">← 設問編集</Link>
      <PageTitle>アンケート集計</PageTitle>

      <Card><p className="text-sm text-gray-500">回答数</p><p className="text-3xl font-extrabold">{respondents}<span className="ml-1 text-base text-gray-500">人</span></p></Card>

      {questions.length === 0 ? (
        <EmptyState>設問がありません。</EmptyState>
      ) : (
        questions.map((q, i) => (
          <Card key={q.id}>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600">{QTYPE_LABEL[q.type]}</span>
            <p className="mb-3 mt-1 font-bold">{i + 1}. {q.text}</p>
            <QResult q={q} responses={responses.filter((r) => r.question_id === q.id)} />
          </Card>
        ))
      )}
    </div>
  )
}

function Bar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="mb-2">
      <div className="mb-0.5 flex justify-between text-sm"><span className="font-bold">{label}</span><span className="text-gray-500">{count}件 ({pct}%)</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-brand-red" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

function QResult({ q, responses }: { q: Question; responses: Resp[] }) {
  const n = responses.length
  if (n === 0) return <p className="text-sm text-gray-400">回答なし</p>

  if (q.type === 'rating5') {
    const nums = responses.map((r) => Number(r.value)).filter((x) => !isNaN(x))
    const avg = nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : 0
    return (
      <div>
        <p className="mb-2 text-2xl font-extrabold text-brand-red">{avg.toFixed(1)}<span className="ml-1 text-sm text-gray-500">/ 5.0（{nums.length}件）</span></p>
        {[5, 4, 3, 2, 1].map((s) => <Bar key={s} label={`★${s}`} count={nums.filter((x) => x === s).length} total={nums.length} />)}
      </div>
    )
  }

  if (q.type === 'single' || q.type === 'yesno') {
    const opts = q.type === 'yesno' ? ['はい', 'いいえ'] : q.options
    return <div>{opts.map((o) => <Bar key={o} label={o} count={responses.filter((r) => r.value === o).length} total={n} />)}</div>
  }

  if (q.type === 'multi') {
    return <div>{q.options.map((o) => <Bar key={o} label={o} count={responses.filter((r) => Array.isArray(r.value) && (r.value as string[]).includes(o)).length} total={n} />)}</div>
  }

  // text
  return (
    <ul className="space-y-2">
      {responses.map((r, i) => (
        <li key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">{String(r.value)}</li>
      ))}
    </ul>
  )
}
