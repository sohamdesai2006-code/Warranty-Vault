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
    const [notifications, setNotifications] = useState(true)
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
        setSendingEmail(true)
        try {
            const response = await fetch('/api/send-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productName: 'Test Product (Settings)' }),
            })
            const data = await response.json()
            if (response.ok) {
                alert('Email Sent! Check your inbox.')
            } else {
                throw new Error(data.error || 'Failed to send email')
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
            <div className="p-4 md:p-6 max-w-4xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to Dashboard
                </Link>
                <h1 className="text-3xl font-bold mb-8">Settings</h1>
            </div>

            <div className="max-w-4xl mx-auto px-4 md:px-6 flex flex-col gap-6">

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
                            <label className="flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={notifications}
                                    onChange={() => setNotifications(!notifications)}
                                    className="w-5 h-5 rounded border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-700 text-blue-600 focus:ring-blue-500"
                                />
                            </label>
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
