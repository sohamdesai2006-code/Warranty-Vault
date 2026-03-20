'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function Login() {
    const router = useRouter()
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                router.push('/')
            }
        }
        checkUser()
    }, [router])

    const handleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) console.error('Login error:', error.message)
    }

    return (
        <div className="h-screen bg-white dark:bg-neutral-900 flex flex-col items-center justify-center p-6 overflow-hidden transition-colors duration-200">
            <div className="max-w-4xl w-full text-center px-4">
                {/* Branding Icon */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-10 flex justify-center"
                >
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl shadow-xl flex items-center justify-center text-white transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                        </svg>
                    </div>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent italic"
                >
                    Don't let your warranty expire in silence.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-xl md:text-2xl text-gray-500 dark:text-neutral-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed"
                >
                    We give your receipts a voice. Get alerted before your protection runs out.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex flex-col items-center"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLogin}
                        className="group relative flex items-center justify-center gap-4 bg-white dark:bg-neutral-800 text-gray-900 dark:text-white font-bold py-5 px-10 rounded-2xl border-2 border-gray-400 dark:border-gray-700 hover:border-gray-600 dark:hover:border-gray-500 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className="w-6 h-6 group-hover:rotate-12 transition-transform"
                        />
                        <span className="text-xl">Continue with Google</span>

                        {/* Subtle Glow Effect on Hover */}
                        <div className="absolute inset-0 rounded-2xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </motion.button>

                    <p className="mt-3 text-sm text-gray-500 dark:text-neutral-500 font-medium tracking-wide">
                        By continuing, you agree to our <span onClick={() => setShowModal(true)} className="text-blue-600 dark:text-blue-400 cursor-pointer hover:underline">Terms of Service</span>.
                    </p>
                </motion.div>
            </div>

            {/* Terms of Service Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/20 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-neutral-800 w-full max-w-md rounded-3xl shadow-2xl p-8 transform animate-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Terms of Service</h2>

                        <ul className="space-y-4 mb-8 text-left">
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                                <p className="text-gray-600 dark:text-neutral-400 font-medium">Your data remains private and is only used to display and track your warranties.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                                <p className="text-gray-600 dark:text-neutral-400 font-medium">Receipts are stored securely in your private vault and accessible only by you.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-600 shrink-0"></div>
                                <p className="text-gray-600 dark:text-neutral-400 font-medium">We provide automated expiry alerts to ensure you never miss a claim deadline.</p>
                            </li>
                        </ul>

                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-all active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
