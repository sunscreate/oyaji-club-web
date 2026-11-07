import { useEffect, useState } from 'react'

interface BIPEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIOS(): boolean {
  const ua = navigator.userAgent
  const iphone = /iPad|iPhone|iPod/.test(ua)
  const ipad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 // iPadOS13+
  return iphone || ipad
}

/** スマホのホーム画面にアプリとして追加するボタン。
 *  Android(Chrome等)はワンタップでネイティブのインストールダイアログを表示。
 *  iOS(Safari)は仕様上プログラムから出せないため、手順を案内するモーダルを表示。
 *  すでにインストール済み(standalone)やインストール不可の環境では何も表示しない。 */
export default function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(isStandalone())
  const ios = isIOS()

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent) }
    const onInstalled = () => { setInstalled(true); setDeferred(null) }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) return null
  // Androidはプロンプトが使えるとき、iOSは常に(手順案内)。それ以外(PC等)は非表示。
  if (!deferred && !ios) return null

  async function onClick() {
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
      return
    }
    if (ios) setShowIosHelp(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-red px-5 py-4 text-base font-bold text-white shadow-sm active:scale-[0.98]"
      >
        📲 ホーム画面にアプリとして追加
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-extrabold">ホーム画面に追加（iPhone / iPad）</h3>
            <ol className="space-y-2 text-gray-700">
              <li>① 画面下の<span className="font-bold">共有ボタン</span>（□に↑のマーク）をタップ</li>
              <li>② メニューを少し下にスクロールし<span className="font-bold">「ホーム画面に追加」</span>をタップ</li>
              <li>③ 右上の<span className="font-bold">「追加」</span>をタップ</li>
            </ol>
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-gray-700">
              ※ <span className="font-bold">Safari</span>で開いている必要があります。他のアプリ内ブラウザやChromeの場合は、一度Safariでこのサイトを開き直してください。
            </p>
            <button
              type="button"
              onClick={() => setShowIosHelp(false)}
              className="mt-4 w-full rounded-2xl bg-gray-100 px-5 py-3 font-bold text-gray-700"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  )
}
