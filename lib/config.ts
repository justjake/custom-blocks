export const SUPABASE_URL = must('NEXT_PUBLIC_SUPABASE_URL')
export const SUPABASE_ANON_KEY = must('NEXT_PUBLIC_SUPABASE_ANON_KEY')
export const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SECRET_SERVICE_KEY']
export const DATABASE_URL = process.env['DATABASE_URL']

function must(name: string): string {
  const result = process.env[name]
  if (!result) {
    throw new Error(`Missing env var: ${name}`)
  }
  return result
}
