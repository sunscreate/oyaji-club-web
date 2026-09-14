import imageCompression from 'browser-image-compression'

export interface ProcessedImage {
  full: Blob
  thumb: Blob
  takenAt: string | null
}

export interface ProcessImageOptions {
  fullMaxWidthOrHeight?: number
  fullMaxSizeMB?: number
  fullQuality?: number
  thumbMaxWidthOrHeight?: number
  thumbQuality?: number
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
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.95 })
    return Array.isArray(out) ? out[0] : out
  } catch (e) {
    console.warn('HEIC 変換に失敗しました。元ファイルで続行します。', e)
    return file
  }
}

/** 本画像 と サムネ を生成する */
export async function processImage(file: File, options: ProcessImageOptions = {}): Promise<ProcessedImage> {
  const src = await toProcessable(file)
  const asFile = src instanceof File ? src : new File([src], file.name, { type: src.type || 'image/jpeg' })

  const full = await imageCompression(asFile, {
    maxWidthOrHeight: options.fullMaxWidthOrHeight ?? 2000,
    maxSizeMB: options.fullMaxSizeMB ?? 0.6,
    fileType: 'image/webp',
    initialQuality: options.fullQuality ?? 0.8,
    useWebWorker: true,
  })
  const thumb = await imageCompression(asFile, {
    maxWidthOrHeight: options.thumbMaxWidthOrHeight ?? 400,
    fileType: 'image/webp',
    initialQuality: options.thumbQuality ?? 0.7,
    useWebWorker: true,
  })

  const takenAt = file.lastModified ? new Date(file.lastModified).toISOString() : null
  return { full, thumb, takenAt }
}
