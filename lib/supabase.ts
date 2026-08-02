import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Transforme les clés snake_case en camelCase de façon récursive
export const camelizeKeys = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(camelizeKeys)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, l) => l.toUpperCase()),
        camelizeKeys(v)
      ])
    )
  }
  return obj
}

// Liste blanche de champs jamais exposés au client (jamais password_hash)
const PUBLIC_USER_FIELDS = [
  'id', 'first_name', 'phone', 'email', 'selfie_url', 'balance',
  'referral_code', 'referred_by', 'role', 'is_banned'
] as const

export const toPublicUser = (user: any): any => {
  if (!user) return user
  const picked: Record<string, any> = {}
  for (const field of PUBLIC_USER_FIELDS) picked[field] = user[field]
  return camelizeKeys(picked)
}
