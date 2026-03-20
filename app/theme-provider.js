'use client'

import { useEffect } from 'react'

export function ThemeProvider() {
    useEffect(() => {
        // Check local storage or system preference
        const storedTheme = localStorage.getItem('theme')
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

        if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [])

    return null // This component doesn't render anything
}
