"use client"

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (loginError) {
            setError(loginError.message)
            setIsLoading(false)
        } else {
            router.push('/')
            router.refresh()
        }
    }

    const handleSignup = async (e: React.MouseEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error: signupError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (signupError) {
            setError(signupError.message)
            setIsLoading(false)
        } else {
            setError("Check your email for the confirmation link.")
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-1 min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-advent-blue" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-advent-lightblue/10 blur-3xl -mr-48 -mt-48 rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-advent-green/5 blur-3xl -ml-32 -mb-32 rounded-full" />

            <div className="w-full max-w-md z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center bg-advent-blue text-white w-12 h-12 rounded-xl text-2xl font-black mb-4 shadow-lg shadow-advent-blue/20">
                        QI
                    </div>
                    <h1 className="text-3xl font-black text-advent-blue tracking-tight italic">AdventHealth</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Resident Project Tracker</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1" htmlFor="email">
                                Institutional Email
                            </label>
                            <input
                                className="w-full rounded-xl px-4 py-3 bg-slate-50 border border-slate-200 focus:border-advent-blue focus:ring-4 focus:ring-advent-blue/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                                name="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@adventhealth.com"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1" htmlFor="password">
                                Security Password
                            </label>
                            <input
                                className="w-full rounded-xl px-4 py-3 bg-slate-50 border border-slate-200 focus:border-advent-blue focus:ring-4 focus:ring-advent-blue/10 outline-none transition-all placeholder:text-slate-400 font-medium"
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-3 mt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-advent-blue text-white py-3 rounded-xl font-bold hover:bg-advent-dark-blue active:scale-[0.98] transition-all shadow-lg shadow-advent-blue/20 disabled:opacity-50"
                            >
                                {isLoading ? "Processing..." : "Sign In"}
                            </button>

                            <button
                                onClick={handleSignup}
                                disabled={isLoading}
                                className="w-full text-slate-400 py-2 text-xs font-bold hover:text-advent-blue transition-colors disabled:opacity-50"
                            >
                                Don't have an account? Create one
                            </button>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-center rounded-xl border border-red-100 text-xs font-bold">
                                {error}
                            </div>
                        )}
                    </form>
                </div>

                <div className="mt-8 p-6 bg-amber-50/50 rounded-2xl border border-amber-100 flex gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">
                            PHI Safety Warning
                        </h2>
                        <p className="text-[11px] text-amber-700/80 leading-relaxed font-medium">
                            DO NOT enter Protected Health Information (PHI) such as patient names, MRNs, or DOBs. This system is for aggregate QI tracking only.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
