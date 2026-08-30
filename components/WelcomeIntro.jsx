'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export default function WelcomeIntro({ userName = '', onComplete }) {
    const [scene, setScene] = useState(1) // 1: Fade, 2: Vault, 3: Unlock
    const [progress, setProgress] = useState(0) // 0 to 100% of current active scene
    const [isExiting, setIsExiting] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    
    const sceneRef = useRef(1)
    const completedRef = useRef(false)
    const pointerStartTimeRef = useRef(0)
    const exitTimeoutRef = useRef(null)
    const sceneDuration = 10000 // 10 seconds per scene

    useEffect(() => {
        sceneRef.current = scene
    }, [scene])

    const finishIntro = useCallback(() => {
        if (completedRef.current) return
        completedRef.current = true
        setIsExiting(true)
        exitTimeoutRef.current = setTimeout(() => {
            if (onComplete) onComplete()
        }, 500)
    }, [onComplete])

    // Cleanup exit timeout on unmount
    useEffect(() => {
        return () => {
            if (exitTimeoutRef.current) {
                clearTimeout(exitTimeoutRef.current)
            }
        }
    }, [])

    const handleNext = useCallback(() => {
        if (sceneRef.current < 3) {
            setScene((prev) => {
                const next = prev + 1
                sceneRef.current = next
                return next
            })
            setProgress(0)
        } else {
            finishIntro()
        }
    }, [finishIntro])

    const handlePrev = useCallback(() => {
        if (sceneRef.current > 1) {
            setScene((prev) => {
                const prevScene = prev - 1
                sceneRef.current = prevScene
                return prevScene
            })
            setProgress(0)
        } else {
            setProgress(0)
        }
    }, [])

    // Gesture Handlers: Distinct Tap vs Long-Press Pause (prevents accidental jumps after holding)
    const handlePointerDown = () => {
        pointerStartTimeRef.current = Date.now()
        setIsPaused(true)
    }

    const handleLeftPointerUp = (e) => {
        e.preventDefault()
        setIsPaused(false)
        const holdDuration = Date.now() - pointerStartTimeRef.current
        if (holdDuration < 250) {
            handlePrev()
        }
    }

    const handleRightPointerUp = (e) => {
        e.preventDefault()
        setIsPaused(false)
        const holdDuration = Date.now() - pointerStartTimeRef.current
        if (holdDuration < 250) {
            handleNext()
        }
    }

    const handlePointerCancel = () => {
        setIsPaused(false)
    }

    // Auto-pause when tab is hidden or minimized
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setIsPaused(true)
            } else {
                setIsPaused(false)
            }
        }
        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    // Rock-solid Story Timer (time-based without updater side effects)
    useEffect(() => {
        if (isPaused || isExiting) return

        // Calculate start time offset so pausing/resuming is 100% accurate
        const startTime = Date.now() - (progress / 100) * sceneDuration

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const currentProgress = (elapsed / sceneDuration) * 100

            if (currentProgress >= 100) {
                clearInterval(interval)
                handleNext()
            } else {
                setProgress(currentProgress)
            }
        }, 30)

        return () => clearInterval(interval)
    }, [scene, isPaused, isExiting, handleNext, sceneDuration, progress])

    // Keyboard support
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                finishIntro()
            } else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
                handleNext()
            } else if (e.key === 'ArrowLeft') {
                handlePrev()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleNext, handlePrev, finishIntro])

    return (
        <div 
            className={`fixed inset-0 z-[100] bg-black text-white flex flex-col items-center justify-between p-6 select-none overflow-hidden transition-all duration-500 ${
                isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
            }`}
        >
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

            {/* ── WhatsApp / Instagram Story Touch Tap Zones ── */}
            {/* Left 35% -> Previous (Tap) or Pause (Hold) */}
            <div 
                className="absolute inset-y-0 left-0 w-[35%] z-30 cursor-pointer touch-none"
                onPointerDown={handlePointerDown}
                onPointerUp={handleLeftPointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Previous scene or hold to pause"
            />
            {/* Right 65% -> Next (Tap) or Pause (Hold) */}
            <div 
                className="absolute inset-y-0 right-0 w-[65%] z-30 cursor-pointer touch-none"
                onPointerDown={handlePointerDown}
                onPointerUp={handleRightPointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                aria-label="Next scene or hold to pause"
            />

            {/* Top Navigation & Dynamic Story Progress Bars */}
            <div className="w-full max-w-md mx-auto flex items-center justify-between gap-4 z-40">
                {/* 3-Segment Story Progress Bar */}
                <div className="flex-1 flex items-center gap-1.5 h-1">
                    {[1, 2, 3].map((index) => {
                        let fillWidth = '0%'
                        if (index < scene) fillWidth = '100%'
                        else if (index === scene) fillWidth = `${progress}%`

                        return (
                            <div key={index} className="h-full flex-1 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-75 ease-linear"
                                    style={{ width: fillWidth }}
                                />
                            </div>
                        )
                    })}
                </div>

                {/* Skip Button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        finishIntro()
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-xs font-semibold text-white/90 hover:text-white transition-all active:scale-95 flex items-center gap-1 shrink-0 z-50 cursor-pointer"
                >
                    <span>Skip</span>
                    <span className="text-white/50 text-[11px]">✕</span>
                </button>
            </div>

            {/* Center Stage: The 3 Scenes */}
            <div className="relative flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto z-10 px-4 w-full pointer-events-none">
                
                {/* ── Scene 1: Faded Paper Receipts ── */}
                {scene === 1 && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
                        {/* Crumbled / Fading Receipt Graphic */}
                        <div className="relative w-28 h-36 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent border border-white/20 rounded-xl transform -rotate-3 backdrop-blur-sm shadow-xl animate-pulse" />
                            <div className="relative w-24 h-32 bg-gradient-to-b from-zinc-800/90 to-zinc-900/90 border border-dashed border-zinc-500/40 rounded-lg p-3 flex flex-col justify-between shadow-2xl">
                                <div className="space-y-1.5">
                                    <div className="w-12 h-1.5 bg-zinc-600 rounded-full" />
                                    <div className="w-16 h-1 bg-zinc-700 rounded-full" />
                                    <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                                </div>
                                <div className="space-y-1 border-t border-dashed border-zinc-700 pt-2">
                                    <div className="flex justify-between">
                                        <div className="w-8 h-1 bg-zinc-600 rounded" />
                                        <div className="w-4 h-1 bg-zinc-600 rounded" />
                                    </div>
                                    <div className="w-14 h-1.5 bg-red-400/70 rounded" />
                                </div>
                            </div>
                            {/* Floating embers */}
                            <span className="absolute -top-2 -right-2 w-2 h-2 rounded-full bg-amber-400/80 animate-ping" />
                            <span className="absolute bottom-2 -left-3 w-1.5 h-1.5 rounded-full bg-orange-400/60 animate-pulse" />
                        </div>

                        {/* Caption */}
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-snug">
                            Paper receipts fade...
                        </h2>
                        <p className="text-sm sm:text-base text-gray-400 font-medium max-w-xs">
                            Lost ink, misplaced slips, and missed warranty claims.
                        </p>
                    </div>
                )}

                {/* ── Scene 2: The Vault Forged ── */}
                {scene === 2 && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
                        {/* Glowing Logo inside Cyber Vault Rings */}
                        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                            {/* Rotating Cybernetic Rings */}
                            <div className="absolute inset-0 rounded-full border-2 border-dashed border-purple-500/40 animate-[spin_8s_linear_infinite]" />
                            <div className="absolute -inset-3 rounded-full border border-blue-500/30 animate-[spin_12s_linear_infinite_reverse]" />
                            <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-purple-600/30 to-blue-600/30 blur-md animate-pulse" />
                            
                            {/* Vault Logo */}
                            <img 
                                src="/logo.png" 
                                alt="Warranty Vault Logo" 
                                className="relative z-10 w-28 h-auto object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]"
                            />
                        </div>

                        {/* Caption */}
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-purple-300 to-pink-400 bg-clip-text text-transparent mb-2 leading-snug">
                            Your Vault secures them.
                        </h2>
                        <p className="text-sm sm:text-base text-gray-300 font-medium max-w-xs">
                            AI-scanned, cloud-encrypted and tracked forever.
                        </p>
                    </div>
                )}

                {/* ── Scene 3: The Unlock & Welcome ── */}
                {scene === 3 && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
                        {/* Unlocking Shockwave Ring */}
                        <div className="relative w-36 h-36 mb-8 flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping duration-1000" />
                            <div className="absolute -inset-4 rounded-full border-2 border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,0.5)] animate-pulse" />
                            
                            {/* Unlocked Shield Icon */}
                            <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                                <svg className="w-10 h-10 text-gray-950 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>

                        {/* Personalized Greeting Caption */}
                        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2 leading-snug">
                            {userName ? `Welcome, ${userName}!` : 'Welcome to Warranty Vault!'}
                        </h2>
                        <p className="text-sm sm:text-base text-emerald-400 font-medium max-w-xs flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Your vault is unlocked &amp; ready.</span>
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom Tip / Interaction Hint */}
            <div className="text-center z-40 pointer-events-none">
                <p className="text-xs text-white/50 font-normal flex items-center justify-center gap-2">
                    <span>Tap left for back</span>
                    <span>•</span>
                    <span>Hold to pause</span>
                    <span>•</span>
                    <span>Tap right for next</span>
                </p>
            </div>
        </div>
    )
}
