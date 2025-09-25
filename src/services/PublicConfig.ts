export type PublicConfig = {
  API_URL: string
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
  SENTRY_DSN: string
  SENTRY_ENVIRONMENT: string
  SENTRY_RELEASE: string
  SPONSOR_CARD_ENABLED: boolean
  MAX_UPLOAD_BYTES: number
  ALLOW_LARGE_UPLOADS: boolean
  ENABLE_UNSIGNED_UPLOADS: boolean
  DISABLE_CLIENT_RESIZE: boolean
  CLOUDINARY_CLOUD_NAME: string
  CLOUDINARY_UNSIGNED_PRESET: string
  CLOUDINARY_UPLOAD_FOLDER: string
}

let cachedConfig: PublicConfig | null = null

export async function getPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig
  const res = await fetch('/.netlify/functions/public-config')
  if (!res.ok) throw new Error(`Failed to load public config: ${res.status}`)
  cachedConfig = await res.json()
  return cachedConfig as PublicConfig
}

export function setPublicConfigForTest(cfg: PublicConfig) {
  cachedConfig = cfg
}
