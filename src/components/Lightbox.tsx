import { useEffect, useRef, useState } from 'react'

interface Slide {
  url: string
  caption?: string
  canDelete?: boolean
}

export function Lightbox({
  slides, index, onClose, onIndex, onDownload, onDelete,
}: {
  slides: Slide[]
  index: number
  onClose: () => void
  onIndex: (i: number) => void
  onDownload?: (i: number) => void
  onDelete?: (i: number) => void
}) {
  const startX = useRef<number | null>(null)
  const [dx, setDx] = useState(0)

  const go = (d: number) => {
    const n = index + d
    if (n >= 0 && n < slides.length) onIndex(n)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length])

  const cur = slides[index]
  if (!cur) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95" role="dialog">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="text-sm">{index + 1} / {slides.length}</span>
        <button onClick={onClose} className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">閉じる</button>
      </div>

      <div
        className="flex flex-1 items-center justify-center overflow-hidden"
        onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
        onTouchMove={(e) => startX.current !== null && setDx(e.touches[0].clientX - startX.current)}
        onTouchEnd={() => {
          if (dx > 60) go(-1)
          else if (dx < -60) go(1)
          startX.current = null
          setDx(0)
        }}
      >
        <button onClick={() => go(-1)} disabled={index === 0} className="hidden shrink-0 px-3 text-3xl text-white/70 disabled:opacity-20 sm:block">‹</button>
        <img
          src={cur.url}
          alt=""
          className="max-h-full max-w-full select-none object-contain"
          style={{ transform: `translateX(${dx}px)` }}
          draggable={false}
        />
        <button onClick={() => go(1)} disabled={index === slides.length - 1} className="hidden shrink-0 px-3 text-3xl text-white/70 disabled:opacity-20 sm:block">›</button>
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-4 nav-safe">
        {cur.caption && <span className="mr-auto text-sm text-white/70">{cur.caption}</span>}
        {onDownload && (
          <button onClick={() => onDownload(index)} className="rounded-xl bg-brand-yellow px-5 py-2.5 font-bold text-black">保存</button>
        )}
        {onDelete && cur.canDelete && (
          <button onClick={() => onDelete(index)} className="rounded-xl bg-white/15 px-5 py-2.5 font-bold text-white">削除</button>
        )}
      </div>
    </div>
  )
}
