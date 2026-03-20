'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
    const router = useRouter()

    useEffect(() => {
        // Check if session exists or listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || session) {
                router.push('/')
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-neutral-400">Completing sign in...</p>
            </div>
        </div>
    )
}
