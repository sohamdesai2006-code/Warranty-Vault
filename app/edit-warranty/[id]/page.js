'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function EditWarranty() {
    const router = useRouter()
    const params = useParams()
    const { id } = params

    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        purchase_date: '',
        expiry_date: '',
        category: 'Electronics',
    })
    const [existingReceiptUrl, setExistingReceiptUrl] = useState(null)
    const [existingProductImageUrl, setExistingProductImageUrl] = useState(null)
    const [receiptFile, setReceiptFile] = useState(null)
    const [productPhotoFile, setProductPhotoFile] = useState(null)
    const [status, setStatus] = useState('idle')
    const [message, setMessage] = useState('')
    const [dateError, setDateError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchWarranty()
    }, [id])

    const fetchWarranty = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            const { data, error } = await supabase
                .from('warranties')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single()

            if (error) throw error

            setFormData({
                name: data.name || '',
                brand: data.brand || '',
                purchase_date: data.purchase_date || '',
                expiry_date: data.expiry_date || '',
                category: data.category || 'Electronics',
            })
            setExistingReceiptUrl(data.receipt_url || null)
            setExistingProductImageUrl(data.product_image_url || null)
        } catch (error) {
            console.error('Error fetching warranty:', error.message)
            setStatus('error')
            setMessage('Could not load warranty data.')
        } finally {
            setLoading(false)
        }
    }

    const [todayString, setTodayString] = useState('')

    useEffect(() => {
        setTodayString(new Date().toISOString().split('T')[0])
    }, [])

    const getPurchaseMaxDate = () => {
        if (formData.expiry_date && formData.expiry_date < todayString) return formData.expiry_date
        return todayString
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        const updated = { ...formData, [name]: value }

        // Cross-field date validation
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

    const handleFileChange = (e) => {
        setReceiptFile(e.target.files[0] || null)
    }

    const uploadFile = async (file, fallback) => {
        if (!file) return fallback

        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName)

        return urlData.publicUrl
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (dateError) return
        // Extra guard: block future purchase dates
        if (formData.purchase_date && formData.purchase_date > todayString) {
            setDateError('Purchase date cannot be in the future.')
            return
        }
        setStatus('loading')
        setMessage('')

        try {
            const receiptUrl = await uploadFile(receiptFile, existingReceiptUrl)
            const productImageUrl = await uploadFile(productPhotoFile, existingProductImageUrl)

            const updateData = { ...formData }
            if (receiptUrl) updateData.receipt_url = receiptUrl
            if (productImageUrl) updateData.product_image_url = productImageUrl

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            const { error } = await supabase
                .from('warranties')
                .update(updateData)
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error

            setStatus('success')
            setMessage('Warranty updated successfully!')

            setTimeout(() => {
                router.push('/')
            }, 1500)
        } catch (error) {
            setStatus('error')
            setMessage(error.message || 'Failed to update warranty')
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
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white flex items-center justify-center p-4 transition-colors duration-200">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 rounded-2xl shadow-md dark:shadow-xl overflow-hidden border border-gray-400 dark:border-gray-700 transition-colors duration-200">
                <div className="p-8">
                    <Link href="/" className="text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white text-sm mb-4 inline-flex items-center gap-1 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                        Back to Dashboard
                    </Link>

                    <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-500 bg-clip-text text-transparent transition-colors duration-200">
                        Edit Warranty
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                Product Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-500 text-gray-900 dark:text-white"
                                placeholder="e.g. MacBook Pro"
                            />
                        </div>

                        <div>
                            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                Brand
                            </label>
                            <input
                                type="text"
                                id="brand"
                                name="brand"
                                value={formData.brand}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-500 text-gray-900 dark:text-white"
                                placeholder="e.g. Apple"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                    Purchase Date
                                </label>
                                <input
                                    type="date"
                                    id="purchase_date"
                                    name="purchase_date"
                                    value={formData.purchase_date}
                                    max={getPurchaseMaxDate()}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white ${
                                        dateError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-neutral-600'
                                    }`}
                                />
                            </div>
                            <div>
                                <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                    Expiry Date
                                </label>
                                <input
                                    type="date"
                                    id="expiry_date"
                                    name="expiry_date"
                                    required
                                    value={formData.expiry_date}
                                    min={formData.purchase_date || undefined}
                                    onChange={handleChange}
                                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white ${
                                        dateError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-neutral-600'
                                    }`}
                                />
                            </div>
                            {dateError && (
                                <p className="sm:col-span-2 text-xs text-red-500 dark:text-red-400 flex items-center gap-1 -mt-1">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {dateError}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                Category
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white"
                            >
                                <option value="Electronics">Electronics</option>
                                <option value="Appliances">Appliances</option>
                                <option value="Vehicles">Vehicles</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                Receipt / Invoice
                            </label>
                            {existingReceiptUrl && !receiptFile && (
                                <div className="mb-2 flex items-center gap-2 text-sm">
                                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <a href={`${existingReceiptUrl}?t=${Date.now()}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate">
                                        Current receipt attached
                                    </a>
                                </div>
                            )}
                            <label
                                htmlFor="receipt"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-neutral-700 border-2 border-dashed border-gray-300 dark:border-neutral-500 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 hover:bg-gray-100 dark:hover:bg-neutral-600/50 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-400 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                </svg>
                                <span className="text-sm text-gray-500 dark:text-neutral-400">
                                    {receiptFile ? receiptFile.name : (existingReceiptUrl ? 'Upload new receipt to replace' : 'Click to upload receipt image')}
                                </span>
                            </label>
                            <input
                                type="file"
                                id="receipt"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-1">
                                Product Photo
                            </label>
                            {existingProductImageUrl && !productPhotoFile && (
                                <div className="mb-2 flex items-center gap-2 text-sm">
                                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <a href={`${existingProductImageUrl}?t=${Date.now()}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline truncate">
                                        Current photo attached
                                    </a>
                                </div>
                            )}
                            <label
                                htmlFor="product_photo"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-neutral-700 border-2 border-dashed border-gray-300 dark:border-neutral-500 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 hover:bg-gray-100 dark:hover:bg-neutral-600/50 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-400 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span className="text-sm text-gray-500 dark:text-neutral-400">
                                    {productPhotoFile ? productPhotoFile.name : (existingProductImageUrl ? 'Upload new photo to replace' : 'Click to upload product photo')}
                                </span>
                            </label>
                            <input
                                type="file"
                                id="product_photo"
                                accept="image/*"
                                onChange={(e) => setProductPhotoFile(e.target.files[0] || null)}
                                className="hidden"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className={`w-full py-3 px-4 rounded-lg font-semibold text-white shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] ${status === 'loading'
                                ? 'bg-gray-400 dark:bg-neutral-600 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
                                }`}
                        >
                            {status === 'loading' ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </span>
                            ) : (
                                'Update Warranty'
                            )}
                        </button>
                    </form>
                </div>

                {/* Toast notifications */}
                {status === 'success' && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        {message}
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500 p-4">
                        <p className="text-red-600 dark:text-red-400 text-sm text-center font-medium">
                            {message}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
