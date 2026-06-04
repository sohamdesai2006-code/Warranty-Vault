'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AddWarranty() {
    const router = useRouter()
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)
    const [isCameraOpen, setIsCameraOpen] = useState(false)
    const wasCameraOpenRef = useRef(false)
    const isCameraOpenRef = useRef(false)
    const isMountedRef = useRef(true)

    isCameraOpenRef.current = isCameraOpen

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) router.push('/login')
        }
        checkUser()
        return () => stopCamera()
    }, [router])

    useEffect(() => {
        if (isCameraOpen && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current
            videoRef.current.play().catch((err) => console.error('Error playing video:', err))
        }
    }, [isCameraOpen])

    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        description: '',
        purchase_date: '',
        expiry_date: '',
        category: '',
    })
    const [receiptFile, setReceiptFile] = useState(null)
    const [productPhotoFile, setProductPhotoFile] = useState(null)
    const [status, setStatus] = useState('idle')
    const [message, setMessage] = useState('')
    const [dateError, setDateError] = useState('')
    const [isScanning, setIsScanning] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [scanSuccess, setScanSuccess] = useState(false)
    const [scanError, setScanError] = useState('')

    const todayString = new Date().toISOString().split('T')[0]

    const handleChange = (e) => {
        const { name, value } = e.target
        const updated = { ...formData, [name]: value }
        if (updated.purchase_date) {
            if (updated.purchase_date > todayString) {
                setDateError('Purchase date cannot be in the future.')
            } else if (updated.expiry_date && updated.purchase_date > updated.expiry_date) {
                setDateError('Purchase date cannot be later than expiration date.')
            } else {
                setDateError('')
            }
        } else {
            setDateError('')
        }
        setFormData(updated)
    }

    const scanReceipt = async (file) => {
        if (!file || !file.type.startsWith('image/')) return
        setIsScanning(true)
        setScanSuccess(false)
        setScanError('')
        try {
            const fd = new FormData()
            fd.append('receipt', file)
            const res = await fetch('/api/scan-receipt', { method: 'POST', body: fd })
            const data = await res.json()
            if (res.ok && data && !data.error) {
                setFormData((prev) => ({
                    ...prev,
                    name: data.productName || prev.name,
                    purchase_date: data.purchaseDate || prev.purchase_date,
                    expiry_date: data.expiryDate || prev.expiry_date,
                }))
                setScanSuccess(true)
            } else {
                const errMsg = data?.error || 'Failed to scan receipt.'
                setScanError(errMsg)
                console.error('AI scan failed (API limit/error):', errMsg)
            }
        } catch (err) {
            const errMsg = err.message || 'Network error occurred during scan.'
            setScanError(errMsg)
            console.error('AI scan failed:', err)
        } finally {
            setIsScanning(false)
        }
    }

    const handleFileSelect = async (file) => {
        if (!file) return
        const allowedTypes = ['image/jpeg', 'image/png']
        const fileType = file.type || ''
        const fileExtension = file.name ? file.name.split('.').pop().toLowerCase() : ''
        if (!allowedTypes.includes(fileType) && !['jpg', 'jpeg', 'png'].includes(fileExtension)) {
            alert('Invalid file format. Please upload a JPG or PNG receipt image.')
            return
        }
        setReceiptFile(file)
        setScanSuccess(false)
        await scanReceipt(file)
    }

    const handleFileInputChange = (e) => handleFileSelect(e.target.files[0] || null)

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false) }
    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0] || null
        if (file) handleFileSelect(file)
    }

    async function startCamera() {
        if (document.hidden || !isMountedRef.current) return
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', aspectRatio: { ideal: 3/4 } }
            })
            if (!isMountedRef.current || document.hidden) {
                stream.getTracks().forEach((t) => t.stop())
                return
            }
            streamRef.current = stream
            setIsCameraOpen(true)
        } catch (err) {
            if (!isMountedRef.current || document.hidden) return
            try {
                const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: { ideal: 3/4 } } })
                if (!isMountedRef.current || document.hidden) {
                    fallbackStream.getTracks().forEach((t) => t.stop())
                    return
                }
                streamRef.current = fallbackStream
                setIsCameraOpen(true)
            } catch (fallbackErr) {
                if (!isMountedRef.current || document.hidden) return
                try {
                    const fallbackStream2 = await navigator.mediaDevices.getUserMedia({ video: true })
                    if (!isMountedRef.current || document.hidden) {
                        fallbackStream2.getTracks().forEach((t) => t.stop())
                        return
                    }
                    streamRef.current = fallbackStream2
                    setIsCameraOpen(true)
                } catch (err3) {
                    alert('Could not access camera. Please check browser permissions.')
                }
            }
        }
    }

    function stopCamera() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop())
            streamRef.current = null
        }
        if (isMountedRef.current) {
            setIsCameraOpen(false)
        }
    }

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                if (isCameraOpenRef.current || streamRef.current) {
                    stopCamera()
                    wasCameraOpenRef.current = true
                }
            } else {
                if (wasCameraOpenRef.current) {
                    startCamera()
                    wasCameraOpenRef.current = false
                }
            }
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            stopCamera()
        }
    }, [])

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        if (video.videoWidth === 0) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)
        canvas.toBlob(async (blob) => {
            if (!blob) return
            const file = new File([blob], `camera-receipt-${Date.now()}.jpg`, { type: 'image/jpeg' })
            stopCamera()
            await handleFileSelect(file)
        }, 'image/jpeg', 0.92)
    }

    const uploadFile = async (file) => {
        if (!file) return null
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(fileName)
        return urlData.publicUrl
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (dateError) return
        if (formData.purchase_date && formData.purchase_date > todayString) {
            setDateError('Purchase date cannot be in the future.')
            return
        }
        setStatus('loading')
        setMessage('')
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('You must be logged in to add a warranty')
            const receiptUrl = await uploadFile(receiptFile)
            const productImageUrl = await uploadFile(productPhotoFile)
            const insertData = { ...formData, user_id: user.id }
            if (receiptUrl) insertData.receipt_url = receiptUrl
            if (productImageUrl) insertData.product_image_url = productImageUrl
            const { error } = await supabase.from('warranties').insert([insertData])
            if (error) throw error
            sessionStorage.setItem('warranty_added', 'true')
            router.push('/')
        } catch (error) {
            setStatus('error')
            setMessage(error.message || 'Failed to add warranty')
        }
    }

    const inputClass = "w-full px-3 py-2 bg-gray-50 dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 text-sm"

    return (
        <div className="min-h-screen lg:h-screen lg:max-h-screen overflow-y-auto lg:overflow-hidden flex flex-col pt-1.5 pb-3 px-4 md:px-6 bg-gray-50 dark:bg-black text-gray-900 dark:text-white transition-colors duration-200">
            <canvas ref={canvasRef} className="hidden" />

            {/* ── Center-Aligned Content Container ── */}
            <div className="w-full max-w-5xl mx-auto px-4 mt-1 flex-1 min-h-0 lg:overflow-hidden flex flex-col">
                {/* ── Header Row (Left-aligned with Left Card) ── */}
                <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between mb-2 w-full gap-2">
                    <div>
                        <Link href="/" className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white text-sm inline-flex items-center gap-1 transition-colors mb-0.5 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Dashboard
                        </Link>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent leading-tight">
                            Add New Warranty
                        </h1>
                    </div>
                    {scanSuccess && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg animate-fade-in">
                            <svg className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">AI auto-filled — review before saving.</p>
                        </div>
                    )}
                    {scanError && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg animate-fade-in animate-pulse">
                            <svg className="w-3.5 h-3.5 text-red-500 dark:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                                {scanError.toLowerCase().includes('quota') || scanError.toLowerCase().includes('limit') || scanError.toLowerCase().includes('429')
                                    ? 'API scan limit reached. Please fill form manually.'
                                    : `Scan failed: ${scanError}`}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── Main grid ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch flex-1 min-h-0 lg:overflow-hidden pb-4">

                {/* LEFT: form card */}
                <div className="bg-white dark:bg-[#121212] rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-6 flex flex-col justify-between lg:h-full min-h-0 shadow-sm dark:shadow-none transition-colors duration-200">
                    <form onSubmit={handleSubmit} className="flex flex-col lg:h-full justify-between min-h-0">
                        <div className="flex flex-col gap-3.5 flex-1">

                        {/* Product Name */}
                        <div>
                            <label htmlFor="name" className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Product Name <span className="text-red-400">*</span>
                            </label>
                            <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. MacBook Pro" className={inputClass} />
                        </div>

                        {/* Brand */}
                        <div>
                            <label htmlFor="brand" className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">Brand</label>
                            <input type="text" id="brand" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Apple" className={inputClass} />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">Description</label>
                            <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} placeholder="e.g. 3-year extended warranty for screen damage" className={`${inputClass} resize-none h-20`} />
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="purchase_date" className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                    Purchase Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date" id="purchase_date" name="purchase_date" required
                                    value={formData.purchase_date} onChange={handleChange}
                                    max={formData.expiry_date ? (formData.expiry_date < todayString ? formData.expiry_date : todayString) : todayString}
                                    className={`${inputClass} ${dateError ? 'border-red-400' : ''}`}
                                />
                            </div>
                            <div>
                                <label htmlFor="expiry_date" className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                    Expiry Date <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date" id="expiry_date" name="expiry_date" required
                                    value={formData.expiry_date} onChange={handleChange}
                                    min={formData.purchase_date || undefined}
                                    className={`${inputClass} ${dateError ? 'border-red-400' : ''}`}
                                />
                            </div>
                            {dateError && (
                                <p className="col-span-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1 -mt-0.5">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {dateError}
                                </p>
                            )}
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">
                                Category <span className="text-red-400">*</span>
                            </label>
                            <select id="category" name="category" value={formData.category} onChange={handleChange} required className={inputClass}>
                                <option value="" disabled>Select Category</option>
                                <option value="Electronics">Electronics</option>
                                <option value="Appliances">Appliances</option>
                                <option value="Vehicles">Vehicles</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>

                        {/* Product Photo */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-neutral-400 mb-1">Product Photo</label>
                            <label htmlFor="product_photo" className="flex items-center gap-2 w-full px-3 py-2 bg-gray-50 dark:bg-neutral-950 border border-dashed border-gray-300 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-purple-500 transition-all">
                                <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                                    {productPhotoFile ? productPhotoFile.name : 'Upload product photo (optional)'}
                                </span>
                            </label>
                            <input type="file" id="product_photo" accept="image/*" onChange={(e) => setProductPhotoFile(e.target.files[0] || null)} className="hidden" />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                            type="submit"
                            disabled={status === 'loading' || isScanning}
                            className={`py-3 px-6 w-full rounded-lg font-medium text-white text-sm shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] mt-2 shrink-0 ${
                                status === 'loading' || isScanning
                                    ? 'bg-gray-200 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
                            }`}
                        >
                            {status === 'loading' ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </span>
                            ) : 'Save Warranty'}
                        </button>

                        {status === 'error' && (
                            <p className="text-red-500 dark:text-red-400 text-xs text-center mt-1 shrink-0">{message}</p>
                        )}
                    </form>
                </div>

                {/* RIGHT: receipt capture */}
                <div className="flex flex-col gap-4 lg:h-full min-h-0">

                    {/* Block A: Camera */}
                    <div className={`flex-1 flex flex-col bg-white dark:bg-[#121212] rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 min-h-0 shadow-sm dark:shadow-none transition-colors duration-200 ${isCameraOpen ? 'max-w-md w-full mx-auto lg:h-full' : ''}`}>
                        <div className="flex items-center gap-2 mb-2 shrink-0">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Take a Photo</h3>
                                <p className="text-[11px] text-gray-500 dark:text-neutral-400">Use your device camera to scan the receipt</p>
                            </div>
                        </div>

                        {isCameraOpen ? (
                            <div className="flex flex-col gap-3 w-full flex-1 justify-center min-h-0">
                                <div className="relative rounded-xl overflow-hidden bg-black flex-1 min-h-[250px] sm:min-h-0 w-full max-w-md mx-auto">
                                    <video ref={videoRef} className="w-full h-full object-cover rounded-xl bg-black" autoPlay playsInline muted />
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-white/70 rounded-tl" />
                                        <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-white/70 rounded-tr" />
                                        <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-white/70 rounded-bl" />
                                        <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-white/70 rounded-br" />
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0 w-full max-w-md mx-auto">
                                    <button onClick={capturePhoto} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-lg active:scale-95">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" /></svg>
                                        Capture
                                    </button>
                                    <button onClick={stopCamera} className="px-4 py-2.5 bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-600 dark:text-neutral-300 text-xs font-medium rounded-lg transition-all active:scale-95">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={startCamera}
                                className="flex-1 min-h-[140px] sm:min-h-0 flex flex-col justify-center items-center w-full gap-2 border-2 border-dashed border-blue-200 dark:border-blue-500/30 rounded-xl bg-blue-50 dark:bg-blue-500/5 hover:bg-blue-100 dark:hover:bg-blue-500/10 hover:border-blue-400 transition-all group p-4"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Open Camera</p>
                                    <p className="text-[11px] text-gray-400 dark:text-neutral-500">Point at your receipt</p>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Block B: Upload */}
                    {!isCameraOpen && (
                        <div className="flex-1 flex flex-col bg-white dark:bg-[#121212] rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 min-h-0 shadow-sm dark:shadow-none transition-colors duration-200">
                            <div className="flex items-center gap-2 mb-2 shrink-0">
                                <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                                    <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Upload Receipt</h3>
                                    <p className="text-[11px] text-gray-500 dark:text-neutral-400">Drag &amp; drop or browse — AI auto-fills your form</p>
                                </div>
                            </div>

                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`flex-1 min-h-[140px] sm:min-h-0 flex flex-col justify-center items-center w-full gap-2 border-2 border-dashed rounded-xl transition-all p-4 ${
                                    isDragging
                                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 scale-[1.01]'
                                        : isScanning
                                        ? 'border-purple-400 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/5'
                                        : receiptFile
                                        ? 'border-emerald-400 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-500/5'
                                        : 'border-gray-200 dark:border-neutral-700 hover:border-purple-400 dark:hover:border-purple-500/50 hover:bg-gray-100/50 dark:hover:bg-neutral-800/30'
                                }`}
                            >
                                {isScanning ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-purple-50 dark:bg-purple-500/20 flex items-center justify-center">
                                            <svg className="animate-spin w-4 h-4 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 animate-pulse">AI is scanning...</p>
                                        </div>
                                    </>
                                ) : receiptFile ? (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[140px]">{receiptFile.name}</p>
                                            <button type="button" onClick={() => { setReceiptFile(null); setScanSuccess(false); setScanError('') }} className="text-[11px] text-gray-500 dark:text-neutral-400 hover:text-red-500 mt-0.5 transition-colors">
                                                Remove file
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                                            <svg className="w-4 h-4 text-gray-400 dark:text-neutral-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-neutral-400 font-medium">
                                            {isDragging ? 'Drop it here!' : 'Drag & drop receipt'}
                                        </p>
                                    </>
                                )}

                                {!isScanning && (
                                    <label htmlFor="receipt" className="px-3.5 py-1.5 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-xs font-semibold rounded-lg cursor-pointer transition-all">
                                        Browse File
                                    </label>
                                )}

                                <input type="file" id="receipt" accept="image/jpeg,image/png" onChange={handleFileInputChange} disabled={isScanning} className="hidden" />
                                <p className="text-[10px] text-gray-300 dark:text-neutral-600">JPG · PNG</p>
                            </div>
                        </div>
                    )}

                </div>
            </div>
            </div>
        </div>
    )
}
