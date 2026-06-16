"use client"

import { createClient } from '@/utils/supabase/client'
import { ReactNode, useEffect, useState } from 'react'
import Header from '@/components/Header'

const SUPABASE_CONFIGURED =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export default function AppShell({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any>(null)
    const [role, setRole] = useState<string>('Viewer')
    const [isLoading, setIsLoading] = useState(SUPABASE_CONFIGURED)

    useEffect(() => {
        // When Supabase isn't configured, the app runs without auth (the ECG
        // teaching section is open); skip all Supabase calls.
        if (!SUPABASE_CONFIGURED) return

        const supabase = createClient()

        async function checkAuth() {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()
                if (profile) setRole(profile.role)
            }
            setIsLoading(false)
        }
        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (!session?.user) {
                setRole('Viewer')
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>
    }

    return (
        <>
            {user && <Header userEmail={user.email} role={role} />}
            <main className="flex-1 flex flex-col">
                {children}
            </main>
        </>
    )
}
