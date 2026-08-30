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
        <div className="relative h-screen bg-neutral-900 text-white flex flex-col items-center justify-between pt-2 pb-6 px-4 md:px-6 overflow-hidden select-none">
            {/* Subtle Ambient Background Glows */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-gradient-to-tr from-purple-600/15 via-blue-600/10 to-transparent rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-4xl w-full text-center px-4 flex flex-col items-center flex-1 justify-center">
                {/* Branding Stack */}
                <div className="mb-5 flex flex-col items-center gap-2">
                    <motion.img
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ 
                            opacity: 1, 
                            y: [0, -8, 0] 
                        }}
                        transition={{ 
                            opacity: { duration: 0.6 },
                            y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                        src="/logo.png"
                        alt="Warranty Vault Logo"
                        className="h-44 sm:h-52 w-auto object-contain select-none pointer-events-none drop-shadow-[0_10px_25px_rgba(0,0,0,0.5)] transform-gpu"
                        draggable="false"
                    />
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-center"
                    >
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-widest bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]">
                            Warranty Vault
                        </h2>
                        <p className="text-xs font-semibold text-gray-400 tracking-widest mt-0.5">
                            Secure | Protection
                        </p>
                    </motion.div>
                </div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-2 tracking-tight leading-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent italic"
                >
                    Don't let your warranty expire in silence.
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-sm sm:text-base md:text-lg text-gray-300 mb-6 max-w-2xl mx-auto font-medium leading-relaxed"
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
                        className="group relative flex items-center justify-center gap-3 bg-neutral-800 text-white font-bold py-3.5 px-8 rounded-xl border-2 border-gray-700 hover:border-gray-500 transition-all shadow-md active:scale-95"
                    >
                        <img
                            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                            alt="Google"
                            className="w-5 h-5 group-hover:rotate-12 transition-transform"
                        />
                        <span className="text-lg">Continue with Google</span>

                        {/* Subtle Glow Effect on Hover */}
                        <div className="absolute inset-0 rounded-xl bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    </motion.button>

                    <p className="mt-3 text-sm text-gray-400 font-medium tracking-wide">
                        By continuing, you agree to our <span onClick={() => setShowModal(true)} className="text-blue-400 cursor-pointer hover:underline">Terms of Service</span>.
                    </p>
                </motion.div>
            </div>

            {/* Terms of Service Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-black/40 animate-in fade-in duration-300">
                    <div className="bg-neutral-800 text-white w-full max-w-md rounded-3xl shadow-2xl p-8 border border-neutral-700 transform animate-in slide-in-from-bottom-4 duration-300">
                        <h2 className="text-2xl font-bold text-white mb-6">Terms of Service</h2>

                        <ul className="space-y-4 mb-8 text-left">
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                <p className="text-neutral-300 font-medium">Your data remains private and is only used to display and track your warranties.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                <p className="text-neutral-300 font-medium">Receipts are stored securely in your private vault and accessible only by you.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                <p className="text-neutral-300 font-medium">You retain complete control to add, update, or permanently delete your data at any time.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                <p className="text-neutral-300 font-medium">We do not guarantee the validity of a manufacturer's warranty claim based on the records stored here.</p>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                <p className="text-neutral-300 font-medium">You agree to upload only authentic document files related to your actual product warranties.</p>
                            </li>
                        </ul>

                        <button
                            onClick={() => setShowModal(false)}
                            className="w-full bg-white text-gray-900 font-bold py-3 px-6 rounded-xl hover:opacity-90 transition-all active:scale-95"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
