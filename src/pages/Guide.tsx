import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import logo from '../assets/logo.jpg'

const steps = [
  {
    title: '1. 登録方法を選ぶ',
    body: 'はじめて登録する方は「新規アカウント登録」。同じ世帯の家族は「家族招待コードで登録」を選びます。',
    screen: 'signup',
  },
  {
    title: '2. 必要な内容を入れる',
    body: '園コードまたは家族招待コード、氏名、パスワードを入力します。メールアドレスは不要です。',
    screen: 'form',
  },
  {
    title: '3. 家族・子どもを登録する',
    body: 'マイページで世帯、子ども、クラス、アレルギーを登録します。家族招待コードもここで発行できます。',
    screen: 'mypage',
  },
  {
    title: '4. イベントに回答する',
    body: 'イベントを開き、参加する家族を選んで保存します。予定変更時は「参加しない」も選べます。',
    screen: 'event',
  },
  {
    title: '5. 写真を見る・追加する',
    body: '写真ページからイベントごとの写真を確認できます。写真はログインした人だけが見られます。',
    screen: 'photos',
  },
  {
    title: '6. 質問・返信を確認する',
    body: 'ご意見・ご質問で運営とやりとりできます。返信や公開QAがあるとホームに通知が出ます。',
    screen: 'feedback',
  },
]

export default function Guide() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6 print:max-w-none">
      <header className="mb-5 text-center">
        <img src={logo} alt="おやじ倶楽部" className="mx-auto mb-3 w-28 rounded-lg print:w-20" />
        <p className="text-sm font-bold text-brand-red">さぎぬま幼稚園 おやじ倶楽部</p>
        <h1 className="mt-1 text-2xl font-extrabold">かんたん使い方ガイド</h1>
        <p className="mt-2 text-sm text-gray-600">登録からイベント参加、写真、ご意見ご質問までの流れです。</p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 print:hidden">
        <Link to="/signup"><Button variant="secondary" className="py-3 text-base">新規登録へ</Button></Link>
        <Button type="button" variant="ghost" className="py-3 text-base" onClick={() => window.print()}>印刷する</Button>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.title} className="break-inside-avoid p-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_180px] sm:items-center">
              <div>
                <h2 className="text-lg font-extrabold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-700">{step.body}</p>
              </div>
              <GuideImage kind={step.screen} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-5 bg-red-50 p-4">
        <p className="text-sm font-bold text-gray-800">困ったとき</p>
        <p className="mt-1 text-sm leading-6 text-gray-700">
          ログインできない、家族招待コードが分からない、登録内容を直したい場合は、お世話係に連絡してください。
        </p>
      </Card>

      <p className="mt-6 text-center text-sm text-gray-500 print:hidden">
        <Link to="/login" className="font-bold text-brand-red underline">ログイン画面へ戻る</Link>
      </p>
    </div>
  )
}

function GuideImage({ kind }: { kind: string }) {
  const data = mockData(kind)
  return (
    <div className="mx-auto w-full max-w-[190px] rounded-[28px] border-4 border-gray-900 bg-gray-900 p-2 shadow-sm" aria-label={`${data.title}の画面例`}>
      <div className="overflow-hidden rounded-[20px] bg-white">
        <div className="bg-brand-red px-3 py-2 text-center text-xs font-extrabold text-white">{data.title}</div>
        <div className="space-y-2 p-3">
          {data.lines.map((line, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 text-xs font-bold ${line.strong ? 'bg-brand-yellow text-black' : line.red ? 'bg-red-50 text-brand-red' : 'bg-gray-100 text-gray-600'}`}>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function mockData(kind: string) {
  const screens: Record<string, { title: string; lines: { text: string; strong?: boolean; red?: boolean }[] }> = {
    signup: {
      title: '新規登録',
      lines: [
        { text: '新規アカウント登録', red: true },
        { text: '家族招待コードで登録', strong: true },
        { text: '登録済みの方はログイン' },
      ],
    },
    form: {
      title: '入力',
      lines: [
        { text: '園コード' },
        { text: '氏名' },
        { text: 'パスワード', red: true },
        { text: '登録する', strong: true },
      ],
    },
    mypage: {
      title: 'マイページ',
      lines: [
        { text: '世帯・家族招待', strong: true },
        { text: '子ども・クラス', red: true },
        { text: 'アレルギー' },
      ],
    },
    event: {
      title: 'イベント',
      lines: [
        { text: '参加する家族を選ぶ' },
        { text: '変更を保存', strong: true },
        { text: '参加しない', red: true },
      ],
    },
    photos: {
      title: '写真',
      lines: [
        { text: '年度ごとのイベント写真', red: true },
        { text: '写真を見る' },
        { text: '写真を追加', strong: true },
      ],
    },
    feedback: {
      title: 'ご意見',
      lines: [
        { text: '投稿する' },
        { text: 'やりとり', red: true },
        { text: '公開QA', strong: true },
      ],
    },
  }
  return screens[kind] ?? screens.signup
}
