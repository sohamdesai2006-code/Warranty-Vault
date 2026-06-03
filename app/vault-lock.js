'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// SHA-256 hash using Web Crypto API (client-safe, no Node crypto)
async function hashPin(pin) {
    const encoder = new TextEncoder()
    const data = encoder.encode(pin + 'wv_salt_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
}

export default function VaultLock() {
    const router = useRouter()
    const pathname = usePathname()
    const [isLocked, setIsLocked] = useState(false)
    const [pinInput, setPinInput] = useState('')
    const [pinError, setPinError] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)

    // Lock the vault (only if feature is enabled and PIN exists)
    const lockVault = useCallback(() => {
        if (typeof window === 'undefined') return
        const enabled = localStorage.getItem('vaultLockEnabled') === 'true'
        const pinHash = localStorage.getItem('vaultPinHash')
        if (enabled && pinHash) {
            setIsLocked(true)
            setPinInput('')
            setPinError('')
        }
    }, [])

    // Attach / detach event listeners based on route
    useEffect(() => {
        const isPublic = pathname === '/login' || pathname.startsWith('/auth')
        if (isPublic) {
            setIsLocked(false)
            return
        }

        const onVisibility = () => { if (document.hidden) lockVault() }
        const onBlur = () => lockVault()

        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('blur', onBlur)

        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('blur', onBlur)
        }
    }, [lockVault, pathname])


    const handleVerify = async (pin) => {
        setIsVerifying(true)
        const hash = await hashPin(pin)
        const stored = localStorage.getItem('vaultPinHash')
        if (hash === stored) {
            setIsLocked(false)
            setPinInput('')
            setPinError('')
        } else {
            setPinError('Incorrect PIN. Try again.')
            setPinInput('')
        }
        setIsVerifying(false)
    }

    const pressNumpad = (digit) => {
        if (isVerifying) return
        setPinInput(prev => prev.length < 4 ? prev + digit : prev)
    }

    const handleForgotPin = async () => {
        localStorage.removeItem('vaultPinHash')
        localStorage.setItem('vaultLockEnabled', 'false')
        await supabase.auth.signOut()
        setIsLocked(false)
        router.push('/login')
    }

    if (!isLocked) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-2xl bg-black/70 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-neutral-800 p-8 w-full max-w-sm mx-4 flex flex-col items-center gap-5">

                {/* Lock icon */}
                <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shadow-inner">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                {/* Title */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vault Locked</h2>
                    <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Enter your PIN to continue</p>
                </div>

                {/* PIN dot indicators */}
                <div className="flex gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                            i < pinInput.length
                                ? 'bg-purple-600 border-purple-600 scale-110'
                                : 'border-gray-300 dark:border-neutral-600'
                        }`} />
                    ))}
                </div>

                {/* Error message */}
                {pinError && (
                    <p className="text-red-500 dark:text-red-400 text-sm font-medium -mb-1">{pinError}</p>
                )}

                {/* Numpad grid */}
                <div className="grid grid-cols-3 gap-2.5 w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                        <button
                            key={num}
                            onClick={() => pressNumpad(String(num))}
                            disabled={isVerifying}
                            className="h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold text-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 active:scale-95 transition-all disabled:opacity-40"
                        >
                            {num}
                        </button>
                    ))}
                    {/* Backspace */}
                    <button
                        onClick={() => { setPinInput(p => p.slice(0, -1)); setPinError('') }}
                        disabled={isVerifying}
                        className="h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-red-100 dark:hover:bg-red-900/20 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center text-xl"
                    >
                        ⌫
                    </button>
                    {/* 0 */}
                    <button
                        onClick={() => pressNumpad('0')}
                        disabled={isVerifying}
                        className="h-14 rounded-2xl bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-white font-semibold text-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 active:scale-95 transition-all disabled:opacity-40"
                    >
                        0
                    </button>
                    {/* Confirm */}
                    <button
                        onClick={() => pinInput.length === 4 && handleVerify(pinInput)}
                        disabled={pinInput.length !== 4 || isVerifying}
                        className="h-14 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 text-white font-bold active:scale-95 transition-all flex items-center justify-center text-xl"
                    >
                        {isVerifying ? (
                            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : '✓'}
                    </button>
                </div>

                {/* Forgot PIN */}
                <button
                    onClick={handleForgotPin}
                    className="text-xs text-gray-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 transition-colors mt-1 underline underline-offset-2"
                >
                    Forgot PIN? Log out
                </button>

            </div>
        </div>
    )
}
