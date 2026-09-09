import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Card } from '../components/ui'
import logo from '../assets/logo.jpg'

type ScreenKind = 'signup' | 'form' | 'mypage' | 'event' | 'photos' | 'feedback'

const steps: { title: string; body: string; screen: ScreenKind }[] = [
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
  const { session, needsRegistration, loading } = useAuth()
  const homePath = needsRegistration ? '/register' : '/home'

  return (
    <div className="mx-auto max-w-xl px-4 py-6 print:max-w-none">
      <header className="mb-5 text-center">
        <img src={logo} alt="おやじ倶楽部" className="mx-auto mb-3 w-28 rounded-lg print:w-20" />
        <p className="text-sm font-bold text-brand-red">さぎぬま幼稚園 おやじ倶楽部</p>
        <h1 className="mt-1 text-2xl font-extrabold">かんたん使い方ガイド</h1>
        <p className="mt-2 text-sm text-gray-600">登録からイベント参加、写真、ご意見ご質問までの流れです。</p>
      </header>

      <div className="mb-5 space-y-3 print:hidden">
        {loading ? (
          <Button type="button" disabled className="py-3 text-base">確認中…</Button>
        ) : session ? (
          <Link to={homePath}>
            <Button className="py-3 text-base">ホームへ進む</Button>
          </Link>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Link to="/signin"><Button className="py-3 text-base">ログインへ</Button></Link>
            <Link to="/signup"><Button variant="secondary" className="py-3 text-base">新規登録へ</Button></Link>
          </div>
        )}
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
        {session ? (
          <Link to={homePath} className="font-bold text-brand-red underline">ホームへ進む</Link>
        ) : (
          <Link to="/signin" className="font-bold text-brand-red underline">ログイン画面へ進む</Link>
        )}
      </p>
    </div>
  )
}

function GuideImage({ kind }: { kind: ScreenKind }) {
  return (
    <div className="mx-auto w-full max-w-[210px]" aria-label="説明用の画面イメージ">
      <div className="rounded-[28px] border-4 border-gray-900 bg-gray-900 p-2 shadow-sm">
        <div className="overflow-hidden rounded-[20px] bg-gray-50">
          <div className="flex items-center gap-2 border-b border-red-100 bg-white px-3 py-2">
            <img src={logo} alt="" className="h-7 w-7 rounded-md object-cover" />
            <div className="min-w-0">
              <p className="truncate text-[9px] font-bold text-brand-red">さぎぬま幼稚園</p>
              <p className="truncate text-[10px] font-extrabold text-gray-900">おやじ倶楽部</p>
            </div>
          </div>
          <div className="min-h-[300px] space-y-2 p-3">{renderScreen(kind)}</div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] font-bold text-gray-400">個人情報を入れない画面イメージ</p>
    </div>
  )
}

function renderScreen(kind: ScreenKind) {
  switch (kind) {
    case 'signup':
      return (
        <>
          <MiniTitle eyebrow="登録方法" title="新規登録" />
          <MiniNotice>最初に登録方法を選んでください</MiniNotice>
          <MiniCard accent>
            <p className="text-[11px] font-extrabold text-brand-red">新規アカウント登録</p>
            <p className="mt-1 text-[9px] leading-4 text-gray-600">はじめて利用する方はこちら</p>
          </MiniCard>
          <MiniCard yellow>
            <p className="text-[11px] font-extrabold">家族招待コードで登録する</p>
            <p className="mt-1 text-[9px] leading-4 text-gray-700">同じ世帯の家族はこちら</p>
          </MiniCard>
          <p className="text-center text-[9px] font-bold text-brand-red underline">登録済みの方はログイン</p>
        </>
      )
    case 'form':
      return (
        <>
          <MiniTitle eyebrow="新規アカウント" title="必要な内容を入力" />
          <MiniField label="園コード" value="入力してください" />
          <MiniField label="世帯名" value="山田家" />
          <MiniField label="氏名" value="山田 太郎" />
          <MiniField label="パスワード" value="••••••••" />
          <MiniButton>登録する</MiniButton>
        </>
      )
    case 'mypage':
      return (
        <>
          <MiniTitle eyebrow="設定" title="マイページ" />
          <MiniCard>
            <p className="text-[10px] font-extrabold">自分の情報</p>
            <p className="mt-1 text-[9px] text-gray-600">パパのみ入会できます。入会しなくても利用できます。</p>
          </MiniCard>
          <div className="grid grid-cols-2 gap-2">
            <MiniTile label="世帯・家族招待" />
            <MiniTile label="子ども・クラス" />
            <MiniTile label="アレルギー" />
            <MiniTile label="参加予定" />
          </div>
          <MiniCard yellow>
            <p className="text-[10px] font-extrabold">家族招待コード</p>
            <p className="mt-1 text-[9px] text-gray-700">コードとサイトリンクをコピー</p>
          </MiniCard>
        </>
      )
    case 'event':
      return (
        <>
          <MiniTitle eyebrow="2026年度イベント" title="親子レクリエーション" />
          <MiniCard className="overflow-hidden p-0">
            <div className="flex aspect-[4/3] items-center justify-center bg-red-50 text-center text-[10px] font-extrabold text-brand-red">
              チラシ画像
              <br />
              全体表示
            </div>
          </MiniCard>
          <MiniCard>
            <p className="text-[10px] font-extrabold">参加確認</p>
            <MiniCheck label="父" />
            <MiniCheck label="子ども" />
            <div className="mt-2 grid grid-cols-2 gap-1">
              <MiniButton small>参加する</MiniButton>
              <MiniButton small secondary>参加しない</MiniButton>
            </div>
          </MiniCard>
        </>
      )
    case 'photos':
      return (
        <>
          <MiniTitle eyebrow="写真" title="2026年度のイベント写真" />
          <MiniCard accent>
            <p className="text-[9px] font-bold text-brand-red">2026年度イベント</p>
            <p className="mt-1 text-[11px] font-extrabold">親子レクリエーション</p>
            <div className="mt-2 grid grid-cols-3 gap-1">
              <MiniPhoto />
              <MiniPhoto />
              <MiniPhoto />
            </div>
          </MiniCard>
          <MiniButton>写真を見る</MiniButton>
          <MiniCard>
            <p className="text-[10px] font-extrabold">写真を追加</p>
            <p className="mt-1 text-[9px] text-gray-600">画像だけアップロードできます</p>
          </MiniCard>
        </>
      )
    case 'feedback':
      return (
        <>
          <MiniTitle eyebrow="連絡" title="ご意見・ご質問" />
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm">
            <MiniTab active>投稿</MiniTab>
            <MiniTab>やりとり</MiniTab>
            <MiniTab>公開QA</MiniTab>
          </div>
          <MiniCard>
            <p className="text-[10px] font-extrabold">運営から返信あり</p>
            <p className="mt-1 text-[9px] leading-4 text-gray-600">メールのように続けてやりとりできます。</p>
          </MiniCard>
          <MiniCard yellow>
            <p className="text-[10px] font-extrabold">公開QAに表示</p>
            <p className="mt-1 text-[9px] text-gray-700">みんなに共有する回答を確認</p>
          </MiniCard>
        </>
      )
    default:
      return null
  }
}

function MiniTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[9px] font-bold text-brand-red">{eyebrow}</p>
      <h3 className="text-[15px] font-extrabold leading-tight text-gray-900">{title}</h3>
    </div>
  )
}

function MiniNotice({ children }: { children: ReactNode }) {
  return <div className="rounded-xl bg-red-50 px-3 py-2 text-[9px] font-bold leading-4 text-brand-red">{children}</div>
}

function MiniCard({ children, accent = false, yellow = false, className = '' }: { children: ReactNode; accent?: boolean; yellow?: boolean; className?: string }) {
  return (
    <div className={`rounded-xl border p-2 shadow-sm ${accent ? 'border-red-100 bg-white' : yellow ? 'border-yellow-200 bg-brand-yellow' : 'border-gray-100 bg-white'} ${className}`}>
      {children}
    </div>
  )
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-2 shadow-sm">
      <p className="text-[8px] font-bold text-gray-500">{label}</p>
      <p className="mt-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-700">{value}</p>
    </div>
  )
}

function MiniButton({ children, small = false, secondary = false }: { children: ReactNode; small?: boolean; secondary?: boolean }) {
  return (
    <div className={`rounded-lg text-center font-extrabold ${small ? 'px-1 py-2 text-[8px]' : 'px-3 py-2 text-[10px]'} ${secondary ? 'border border-gray-200 bg-white text-gray-700' : 'bg-brand-red text-white'}`}>
      {children}
    </div>
  )
}

function MiniTile({ label }: { label: string }) {
  return <div className="rounded-xl bg-white px-2 py-3 text-center text-[9px] font-extrabold leading-4 shadow-sm">{label}</div>
}

function MiniCheck({ label }: { label: string }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-2 py-1">
      <span className="h-3 w-3 rounded border border-brand-red bg-brand-red" />
      <span className="text-[9px] font-bold text-gray-700">{label}</span>
    </div>
  )
}

function MiniPhoto() {
  return <div className="aspect-square rounded-md bg-gradient-to-br from-yellow-100 via-white to-red-100" />
}

function MiniTab({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return <div className={`rounded-lg px-1 py-2 text-center text-[8px] font-extrabold ${active ? 'bg-brand-red text-white' : 'text-gray-500'}`}>{children}</div>
}
