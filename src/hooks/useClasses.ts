import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ClassRow } from '../types'

export function useClasses() {
  const [classes, setClasses] = useState<ClassRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('classes')
        .select('*')
        .order('year', { ascending: false })
        .order('sort_order', { ascending: true })
      setClasses((data ?? []) as ClassRow[])
      setLoading(false)
    })()
  }, [])
  return { classes, loading }
}

export function classLabel(c?: ClassRow | null): string {
  if (!c) return ''
  return `${c.grade} ${c.name}`
}
