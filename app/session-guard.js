'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SessionGuard() {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        // Skip check on public pages (login and auth callback)
        if (pathname === '/login' || pathname.startsWith('/auth')) return

        const checkSessionExpiry = async () => {
            const sessionStart = localStorage.getItem('session_start_time')
            if (!sessionStart) return  // No timestamp means first-ever visit or already cleared

            const durationDays = parseInt(localStorage.getItem('sessionDuration') || '7', 10)
            const durationMs = durationDays * 24 * 60 * 60 * 1000
            const elapsed = Date.now() - parseInt(sessionStart, 10)

            if (elapsed > durationMs) {
                // Session has expired — clear local state, sign out, redirect
                localStorage.removeItem('session_start_time')
                await supabase.auth.signOut()
                router.push('/login')
            }
        }

        checkSessionExpiry()
    }, [pathname, router])

    return null  // Renders nothing — purely logic
}
