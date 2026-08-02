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

export type TxQuery = (text: string, params?: any[]) => Promise<any[]>

// Exécute plusieurs requêtes dans une transaction Postgres réelle (BEGIN /
// COMMIT / ROLLBACK) sur une connexion dédiée du pool, plutôt que la
// connexion aléatoire qu'utilise query() à chaque appel. Nécessaire pour
// les mouvements d'argent : un solde relu puis réécrit à travers plusieurs
// requêtes indépendantes est vulnérable à des écritures concurrentes qui
// s'écrasent l'une l'autre.
export const withTransaction = async <T>(fn: (tx: TxQuery) => Promise<T>): Promise<T> => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tx: TxQuery = async (text, params = []) => (await client.query(text, params)).rows
    const result = await fn(tx)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
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
