import { createBrowserClient } from '@supabase/ssr'

// Fall back to harmless placeholders when Supabase isn't configured, so static
// prerendering (and the open ECG section) never throws on undefined credentials.
// Components still gate real auth behaviour on SUPABASE_CONFIGURED.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY,
  )
}
