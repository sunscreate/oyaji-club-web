import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { Button, Card, Field, Input, PageTitle, Select } from '../../components/ui'
import type { MemberType } from '../../types'

const SIZES = ['S', 'M', 'L', 'XL']

export default function MyProfile() {
  const { profile, refresh } = useAuth()
  const [fullName, setFullName] = useState('')
  const [memberType, setMemberType] = useState<MemberType>('current')
  const [oyaji, setOyaji] = useState(false)
  const [size, setSize] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showTshirtNotice, setShowTshirtNotice] = useState(false)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setMemberType(profile.member_type)
      setOyaji(profile.oyaji_member)
      setSize(profile.tshirt_size ?? '')
    }
  }, [profile])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setSaved(false)
    const newlyJoinedOyaji = !profile?.oyaji_member && oyaji
    await supabase.from('profiles').update({
      full_name: fullName.trim(),
      member_type: memberType,
      oyaji_member: oyaji,
      tshirt_size: oyaji ? (size || null) : null,
    }).eq('id', profile!.id)
    await refresh()
    setBusy(false)
    setSaved(true)
    if (newlyJoinedOyaji) setShowTshirtNotice(true)
  }

  return (
    <div>
      <Link to="/mypage" className="text-sm text-gray-500">← マイページ</Link>
      <PageTitle>自分の情報</PageTitle>
      <Card>
        <form onSubmit={save} className="space-y-4">
          <Field label="氏名">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </Field>
          <Field label="ご家庭の種別">
            <Select value={memberType} onChange={(e) => setMemberType(e.target.value as MemberType)}>
              <option value="current">在園家庭</option>
              <option value="ob">OB家庭</option>
            </Select>
          </Field>

          <div className="rounded-xl bg-gray-50 p-3">
            <button type="button" onClick={() => setOyaji(!oyaji)} className="flex w-full items-center gap-3">
              <span className={`flex h-6 w-6 items-center justify-center rounded-md border-2 ${oyaji ? 'border-brand-red bg-brand-red text-white' : 'border-gray-300'}`}>{oyaji ? '✓' : ''}</span>
              <span className="font-bold">🦁 おやじ倶楽部に参加する</span>
            </button>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              おやじ倶楽部への参加はパパのみです。参加しなくても、イベント参加やサイトの利用はできます。
            </p>
            {oyaji && (
              <div className="mt-3">
                <Field label="Tシャツサイズ">
                  <Select value={size} onChange={(e) => setSize(e.target.value)}>
                    <option value="">選択してください</option>
                    {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </Field>
              </div>
            )}
          </div>

          <Button type="submit" disabled={busy}>{busy ? '…' : '保存する'}</Button>
          {saved && <p className="text-center text-sm font-bold text-green-600">保存しました</p>}
        </form>
      </Card>
      {showTshirtNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-xl">
            <p className="text-xl font-extrabold text-brand-red">加盟ありがとうございます</p>
            <p className="mt-3 text-gray-700">次回イベント時にTシャツをお渡しします。</p>
            <Button className="mt-5" onClick={() => setShowTshirtNotice(false)}>閉じる</Button>
          </div>
        </div>
      )}
    </div>
  )
}
