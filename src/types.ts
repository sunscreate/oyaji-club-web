export type MemberType = 'current' | 'ob'
export type RoleType = 'site_owner' | 'president' | 'staff' | 'member'
export type EventStatus = 'draft' | 'published' | 'finished'

export interface Profile {
  id: string
  full_name: string
  household_id: string | null
  member_type: MemberType
  oyaji_member: boolean
  tshirt_size: string | null
}

export interface Household {
  id: string
  name: string
}

export interface ClassRow {
  id: string
  year: number
  grade: string
  name: string
  sort_order: number
}

export interface Child {
  id: string
  household_id: string
  full_name: string
  class_id: string | null
  status: MemberType
  grad_year: number | null
}

export interface Allergy {
  id: string
  household_id: string
  target_name: string
  content: string
}

export interface EventRow {
  id: string
  title: string
  event_date: string
  start_time: string | null
  end_time: string | null
  place: string | null
  description: string | null
  image_path: string | null
  flyer_path: string | null
  media_kind: string | null
  target: 'current' | 'ob' | 'both'
  attendance_enabled: boolean
  fee_type: string
  fee_config: Record<string, unknown>
  belongings: string | null
  rain_info: string | null
  notes: string | null
  photos_enabled: boolean
  survey_enabled: boolean
  is_annual: boolean
  status: EventStatus
}

export interface Participation {
  id: string
  event_id: string
  household_id: string
  join_type: 'full' | 'partial'
  planned_time: string | null
  note: string | null
}

export interface RoleRow {
  id: string
  profile_id: string
  role: RoleType
  year: number | null
  start_date: string | null
  end_date: string | null
}
