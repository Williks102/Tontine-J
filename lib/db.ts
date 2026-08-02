import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquant. Configurez la chaîne de connexion Postgres (Neon) dans votre .env."
  )
}

// Neon (et la plupart des Postgres hébergés) exigent TLS ; un Postgres local
// de développement n'en a généralement pas besoin.
const isLocalHost = /localhost|127\.0\.0\.1/.test(connectionString)

export const pool = new Pool({
  connectionString,
  ssl: isLocalHost ? undefined : { rejectUnauthorized: false },
})

pool.on('error', (err) => {
  console.error('Erreur inattendue sur une connexion Postgres inactive:', err)
})

// Exécute une requête paramétrée et renvoie les lignes.
export const query = async (text: string, params: any[] = []): Promise<any[]> => {
  const result = await pool.query(text, params)
  return result.rows
}

// Transforme les clés snake_case en camelCase de façon récursive
export const camelizeKeys = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(camelizeKeys)
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
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
