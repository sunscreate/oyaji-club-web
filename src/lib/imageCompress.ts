import imageCompression from 'browser-image-compression'

export interface ProcessedImage {
  full: Blob
  thumb: Blob
  takenAt: string | null
}

function isHeic(file: File): boolean {
  const t = file.type.toLowerCase()
  const n = file.name.toLowerCase()
  return t === 'image/heic' || t === 'image/heif' || n.endsWith('.heic') || n.endsWith('.heif')
}

/** iPhone の HEIC を JPEG に変換（heic2any を遅延読込。失敗時は元ファイルを返す） */
async function toProcessable(file: File): Promise<Blob> {
  if (!isHeic(file)) return file
  try {
    const heic2any = (await import('heic2any')).default as (opts: {
      blob: Blob; toType?: string; quality?: number
    }) => Promise<Blob | Blob[]>
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    return Array.isArray(out) ? out[0] : out
  } catch (e) {
    console.warn('HEIC 変換に失敗しました。元ファイルで続行します。', e)
    return file
  }
}

/** 本画像(長辺2000px WebP) と サムネ(長辺400px WebP) を生成する */
export async function processImage(file: File): Promise<ProcessedImage> {
  const src = await toProcessable(file)
  const asFile = src instanceof File ? src : new File([src], file.name, { type: src.type || 'image/jpeg' })

  const full = await imageCompression(asFile, {
    maxWidthOrHeight: 2000,
    maxSizeMB: 0.6,
    fileType: 'image/webp',
    initialQuality: 0.8,
    useWebWorker: true,
  })
  const thumb = await imageCompression(asFile, {
    maxWidthOrHeight: 400,
    fileType: 'image/webp',
    initialQuality: 0.7,
    useWebWorker: true,
  })

  const takenAt = file.lastModified ? new Date(file.lastModified).toISOString() : null
  return { full, thumb, takenAt }
}
