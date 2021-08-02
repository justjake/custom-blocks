function env(envVar: string) {
  return new EnvConfigValue(envVar)
}

class EnvConfigValue {
  constructor(private envVar: string) {}

  get(): string | undefined {
    return process.env[this.envVar]
  }

  string(): string {
    const result = this.get()
    if (result === undefined) {
throw new Error(`Missing env var: ${this.envVar}`)
    }
    return result
    
  }
}

export const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL').string()
export const SUPABASE_ANON_KEY = env('NEXT_PUBLIC_SUPABASE_ANON_KEY').string()
export const SUPABASE_SERVICE_KEY = env('SUPABASE_SECRET_SERVICE_KEY')
export const DATABASE_URL = env('DATABASE_URL')
export const NOTION_OAUTH_CLIENT_ID = env('NOTION_OAUTH_CLIENT_ID')
export const NOTION_OAUTH_CLIENT_SECRET = env('NOTION_OAUTH_CLIENT_SECRET')
