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
    const [sessionDuration, setSessionDuration] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sessionDuration') || '7'
        }
        return '7'
    })
    const [vaultLockEnabled, setVaultLockEnabled] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('vaultLockEnabled') === 'true'
        }
        return false
    })
    const [autoArchiveExpired, setAutoArchiveExpired] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('autoArchiveExpired') === 'true'
        }
        return false
    })
    const [showPinSetup, setShowPinSetup] = useState(false)
    const [pinSetupStep, setPinSetupStep] = useState('enter') // 'enter' | 'confirm'
    const [pinSetupInput, setPinSetupInput] = useState('')
    const [pinSetupConfirm, setPinSetupConfirm] = useState('')
    const [pinSetupError, setPinSetupError] = useState('')

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

    // SHA-256 PIN hashing via Web Crypto API
    const hashPin = async (pin) => {
        const encoder = new TextEncoder()
        const data = encoder.encode(pin + 'wv_salt_2024')
        const hashBuffer = await crypto.subtle.digest('SHA-256', data)
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0')).join('')
    }

    const handleVaultLockToggle = async () => {
        if (!vaultLockEnabled) {
            // Turning ON — check if PIN already exists
            const existingPin = localStorage.getItem('vaultPinHash')
            if (existingPin) {
                setVaultLockEnabled(true)
                localStorage.setItem('vaultLockEnabled', 'true')
            } else {
                // Need to set up a new PIN first
                setPinSetupStep('enter')
                setPinSetupInput('')
                setPinSetupConfirm('')
                setPinSetupError('')
                setShowPinSetup(true)
            }
        } else {
            // Turning OFF — disable and clear stored PIN
            setVaultLockEnabled(false)
            localStorage.setItem('vaultLockEnabled', 'false')
            localStorage.removeItem('vaultPinHash')
        }
    }

    const handleAutoArchiveToggle = () => {
        const newValue = !autoArchiveExpired
        setAutoArchiveExpired(newValue)
        localStorage.setItem('autoArchiveExpired', String(newValue))
    }

    const handlePinSetupNext = async () => {
        if (!/^\d{4}$/.test(pinSetupInput)) {
            setPinSetupError('Please enter exactly 4 digits.')
            return
        }
        if (pinSetupStep === 'enter') {
            setPinSetupStep('confirm')
            setPinSetupError('')
            return
        }
        // Confirm step
        if (pinSetupInput !== pinSetupConfirm) {
            setPinSetupError('PINs do not match. Please try again.')
            setPinSetupStep('enter')
            setPinSetupInput('')
            setPinSetupConfirm('')
            return
        }
        const hash = await hashPin(pinSetupInput)
        localStorage.setItem('vaultPinHash', hash)
        localStorage.setItem('vaultLockEnabled', 'true')
        setVaultLockEnabled(true)
        setShowPinSetup(false)
        setPinSetupInput('')
        setPinSetupConfirm('')
        setPinSetupStep('enter')
        setPinSetupError('')
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
        <>
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
                    <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-400 dark:border-neutral-500 pb-2">Profile Information</h2>
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
                    <h2 className="text-xl font-bold mb-4 border-b-2 border-gray-400 dark:border-neutral-500 pb-2">Preferences</h2>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-neutral-700 last:border-0 pb-3">
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
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-neutral-700 last:border-0 pb-3">
                            <div>
                                <p className="font-medium">Session Duration</p>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Keep me logged in for...</p>
                            </div>
                            <select
                                value={sessionDuration}
                                onChange={(e) => {
                                    setSessionDuration(e.target.value)
                                    localStorage.setItem('sessionDuration', e.target.value)
                                }}
                                className="h-9 px-3 pr-8 rounded-lg border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-gray-800 dark:text-neutral-100 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors cursor-pointer"
                            >
                                <option value="1">1 day</option>
                                <option value="7">7 days</option>
                                <option value="30">30 days</option>
                            </select>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-neutral-700 last:border-0 pb-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-medium">Auto-Lock on Tab Switch</p>
                                    <div className="relative group flex items-center">
                                        <button 
                                            type="button"
                                            className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors focus:outline-none"
                                            aria-label="More information"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M12 16v-4" />
                                                <path d="M12 8h.01" />
                                            </svg>
                                        </button>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-neutral-800 text-white text-xs rounded-xl shadow-xl border border-gray-800 dark:border-neutral-700 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left leading-relaxed font-normal">
                                            This security PIN works only on the device and browser where it was created. If you forget your PIN and choose to log out, the local security PIN will be deleted and this feature will be turned off automatically.
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 dark:bg-neutral-800 rotate-45 border-r border-b border-gray-800 dark:border-neutral-700"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Lock vault when clicking away</p>
                            </div>
                            <button
                                onClick={handleVaultLockToggle}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${vaultLockEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-neutral-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${vaultLockEnabled ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-neutral-700 last:border-0 pb-3">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="font-medium">Auto-archive expired warranties</p>
                                    <div className="relative group flex items-center">
                                        <button 
                                            type="button"
                                            className="text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors focus:outline-none"
                                            aria-label="More information"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M12 16v-4" />
                                                <path d="M12 8h.01" />
                                            </svg>
                                        </button>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-900 dark:bg-neutral-800 text-white text-xs rounded-xl shadow-xl border border-gray-800 dark:border-neutral-700 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left leading-relaxed font-normal">
                                            When enabled, expired products will be automatically moved from your main dashboard view into a separate Archive tab so your main list stays uncluttered.
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-gray-900 dark:bg-neutral-800 rotate-45 border-r border-b border-gray-800 dark:border-neutral-700"></div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-neutral-400">Archive expired items automatically</p>
                            </div>
                            <button
                                onClick={handleAutoArchiveToggle}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${autoArchiveExpired ? 'bg-blue-600' : 'bg-gray-300 dark:bg-neutral-600'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${autoArchiveExpired ? 'translate-x-6' : ''}`}></div>
                            </button>
                        </div>
                        {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-neutral-700 last:border-0 pb-3">
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
                        )}
                        {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
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
                        )}

                        {/* Option 7: Chatbot Preview Card */}
                        <div className="mt-2 p-5 rounded-xl bg-gradient-to-br from-violet-300/60 via-purple-200/50 to-pink-200/60 dark:from-violet-900/50 dark:via-purple-900/30 dark:to-pink-900/40 border border-violet-300/60 dark:border-violet-500/20 backdrop-blur-sm shadow-sm shadow-violet-500/10 opacity-80 select-none transition-colors duration-200">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex items-center justify-center w-9 h-9">
                                        <span className="absolute inline-flex h-9 w-9 rounded-full bg-white/50 dark:bg-slate-300/25 animate-ping"></span>
                                        <svg className="relative w-6 h-6 text-slate-400 dark:text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                            <path d="M12 8V4H8" />
                                            <rect width="16" height="12" x="4" y="8" rx="2" />
                                            <path d="M2 14h2" />
                                            <path d="M20 14h2" />
                                            <path d="M15 13v2" />
                                            <path d="M9 13v2" />
                                        </svg>
                                    </div>
                                    <span className="font-bold text-gray-800 dark:text-neutral-200 text-sm sm:text-base">AI Warranty Assistant</span>
                                    <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-purple-50 text-purple-700 border border-white/20 dark:bg-purple-900/40 dark:text-purple-300 dark:border-white/20 rounded-md">
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                Unlock the power of your own personal AI assistant. Soon you'll be able to chat with your vault to instantly look up warranty policies, ask about upcoming expiration dates, and get smart alerts using plain text.
                            </p>
                            <div className="lock-footer flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 dark:text-neutral-500 border-t border-gray-100 dark:border-neutral-800/60 pt-2.5 cursor-default">
                                <svg className="lock-icon w-3.5 h-3.5 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <span>Feature locked — coming soon to your vault.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-white dark:bg-neutral-800 rounded-2xl border-2 border-red-300 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                    <h2 className="text-xl font-bold mb-4 text-red-500 border-b-2 border-red-300 dark:border-red-700/60 pb-2">Danger Zone</h2>
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
                        <div className="flex items-center justify-between pt-4 border-t border-gray-300 dark:border-neutral-700">
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

        {/* PIN Setup Modal */}
        {showPinSetup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 p-8 w-full max-w-sm mx-4 flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Set Vault PIN</h3>
                            <p className="text-xs text-gray-500 dark:text-neutral-400">
                                {pinSetupStep === 'enter' ? 'Choose a 4-digit PIN' : 'Confirm your PIN'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-neutral-300">
                            {pinSetupStep === 'enter' ? 'Enter PIN' : 'Confirm PIN'}
                        </label>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="••••"
                            value={pinSetupStep === 'enter' ? pinSetupInput : pinSetupConfirm}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                                pinSetupStep === 'enter' ? setPinSetupInput(val) : setPinSetupConfirm(val)
                                setPinSetupError('')
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') handlePinSetupNext() }}
                            autoFocus
                            className="h-11 px-4 rounded-xl border border-gray-300 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-800 text-gray-900 dark:text-white text-center tracking-[0.5em] text-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                        />
                        {pinSetupError && (
                            <p className="text-red-500 text-xs font-medium">{pinSetupError}</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => { setShowPinSetup(false); setPinSetupInput(''); setPinSetupConfirm(''); setPinSetupStep('enter'); setPinSetupError('') }}
                            className="flex-1 h-10 rounded-xl border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handlePinSetupNext}
                            className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold transition-colors active:scale-95"
                        >
                            {pinSetupStep === 'enter' ? 'Next →' : 'Enable Lock'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    )
}
