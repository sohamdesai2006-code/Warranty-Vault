'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function Settings() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [darkMode, setDarkMode] = useState(false)
    const [notifications, setNotifications] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('emailNotifications')
            return stored !== null ? stored === 'true' : true
        }
        return true
    })
    const [sendingEmail, setSendingEmail] = useState(false)

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (loading) {
                router.push('/login')
            }
        }, 5000)

        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }
                setUser(user)
            } catch (error) {
                console.error('Auth check error:', error)
                router.push('/login')
            } finally {
                setLoading(false)
                clearTimeout(timeoutId)
            }
        }

        checkUser()

        // Initialize dark mode state from DOM
        if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
            setDarkMode(true)
        }

        return () => clearTimeout(timeoutId)
    }, [router])

    const toggleDarkMode = () => {
        const newMode = !darkMode
        setDarkMode(newMode)
        if (newMode) {
            document.documentElement.classList.add('dark')
            localStorage.setItem('theme', 'dark')
        } else {
            document.documentElement.classList.remove('dark')
            localStorage.setItem('theme', 'light')
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const handleDeleteAccount = async () => {
        if (confirm('Are you certain? This action is permanent and cannot be undone.')) {
            try {
                const { error } = await supabase.rpc('delete_user_account')
                if (error) throw error

                await supabase.auth.signOut()
                router.push('/')
            } catch (error) {
                console.error('Error deleting account:', error.message)
                alert('Failed to delete account: ' + error.message)
            }
        }
    }

    const handleTestEmail = async () => {
        if (!notifications) {
            alert('Cannot send test email while notifications are disabled.')
            return
        }
        setSendingEmail(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                alert('You must be logged in to send notifications.')
                return
            }

            const response = await fetch('/api/cron-scanner', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer development_secret_key_123',
                },
            })
            const data = await response.json()
            if (response.ok) {
                if (data.emailsSent === 0) {
                    alert('No warranties are expiring in the next 7 days!')
                } else {
                    alert(`✅ ${data.message}`)
                }
            } else {
                throw new Error(data.error || 'Failed to send emails')
            }
        } catch (error) {
            console.error('Error sending email:', error)
            alert('Error sending email: ' + error.message)
        } finally {
            setSendingEmail(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white pb-12 transition-colors duration-200">
            {/* Nav */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6 pb-2">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold">Settings</h1>
            </div>

            <div className="max-w-4xl mx-auto px-4 md:px-6 flex flex-col gap-6 mt-2">

                {/* Profile Info */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-neutral-700 pb-2">Profile Information</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-500 text-white flex items-center justify-center text-2xl font-bold shadow-md">
                            {user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <div>
                            <p className="text-lg font-semibold">{user?.user_metadata?.full_name || 'User'}</p>
                            <p className="text-gray-500 dark:text-neutral-400">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Account Preferences */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-200 dark:border-neutral-700 pb-2">Preferences</h2>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Dark Mode</p>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Use dark theme</p>
                            </div>
                            <button
                                onClick={toggleDarkMode}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-neutral-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${darkMode ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Email Notifications</p>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Receive warranty expiration alerts</p>
                            </div>
                            <button
                                onClick={() => {
                                    const newValue = !notifications
                                    setNotifications(newValue)
                                    localStorage.setItem('emailNotifications', newValue)
                                }}
                                title={notifications ? 'Notifications On' : 'Notifications Off'}
                                className={`
                                    relative w-10 h-10 rounded-full flex items-center justify-center
                                    transition-all duration-200 ease-in-out
                                    shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.07)]
                                    active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2
                                    ${notifications
                                        ? 'bg-amber-100 border border-amber-300 dark:bg-amber-500/20 dark:border-amber-400/40 focus:ring-amber-400/50 focus:ring-offset-white dark:focus:ring-offset-neutral-800'
                                        : 'bg-gray-200 border border-gray-300 dark:bg-neutral-800 dark:border-neutral-700 focus:ring-gray-400 focus:ring-offset-white dark:focus:ring-offset-neutral-800'
                                    }
                                `}
                            >
                                {/* Bell SVG icon */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    className={`w-5 h-5 transition-colors duration-200 ${notifications ? 'text-amber-500 dark:text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : 'text-gray-500 dark:text-neutral-500'}`}
                                >
                                    <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
                                    <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd" />
                                </svg>
                                {/* Active glow ring */}
                                {notifications && (
                                    <span className="absolute inset-0 rounded-full ring-1 ring-amber-400/30 animate-pulse pointer-events-none" />
                                )}
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-neutral-700/50">
                            <div>
                                <p className="font-medium">Test Distribution</p>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Verify email system is operational</p>
                            </div>
                            <button
                                onClick={handleTestEmail}
                                disabled={sendingEmail}
                                className={`px-4 py-2 rounded-md font-medium transition-all shadow-sm ${sendingEmail ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90'}`}
                            >
                                {sendingEmail ? 'Sending...' : 'Test Email'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border-2 border-red-300 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                    <h2 className="text-xl font-bold mb-4 text-red-500 border-b border-red-100 dark:border-red-900/30 pb-2">Danger Zone</h2>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Sign Out</p>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Log out of your account on this device</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-600 text-white dark:bg-transparent dark:border dark:border-red-500 dark:text-red-500 rounded-md font-medium transition-all hover:opacity-90 shadow-sm"
                            >
                                Sign Out
                            </button>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-neutral-700/50">
                            <div>
                                <p className="font-medium text-red-500 dark:text-red-400">Delete Account</p>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Permanently delete your account and data</p>
                            </div>
                            <button
                                onClick={handleDeleteAccount}
                                className="px-4 py-2 bg-red-600 text-white dark:bg-transparent dark:border dark:border-red-500 dark:text-red-500 rounded-md font-medium transition-all hover:opacity-90 shadow-sm"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
