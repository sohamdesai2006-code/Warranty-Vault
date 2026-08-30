'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export function ThemeProvider() {
    useEffect(() => {
        const applyUserTheme = (user) => {
            if (!user) {
                const storedTheme = localStorage.getItem('theme')
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
                return
            }

            const userTheme = user.user_metadata?.theme || localStorage.getItem(`wv_theme_${user.id}`)
            if (userTheme === 'dark') {
                document.documentElement.classList.add('dark')
                localStorage.setItem('theme', 'dark')
                localStorage.setItem(`wv_theme_${user.id}`, 'dark')
            } else if (userTheme === 'light') {
                document.documentElement.classList.remove('dark')
                localStorage.setItem('theme', 'light')
                localStorage.setItem(`wv_theme_${user.id}`, 'light')
            } else {
                const storedTheme = localStorage.getItem('theme')
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                const isDark = storedTheme === 'dark' || (!storedTheme && systemPrefersDark)
                if (isDark) {
                    document.documentElement.classList.add('dark')
                } else {
                    document.documentElement.classList.remove('dark')
                }
            }
        }

        // Apply immediately
        supabase.auth.getUser().then(({ data: { user } }) => {
            applyUserTheme(user)
        })

        // Listen for auth state changes (e.g. switching accounts)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            applyUserTheme(session?.user || null)
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return null
}
