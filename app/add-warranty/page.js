'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AddWarranty() {
    const router = useRouter()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
            }
        }
        checkUser()
    }, [router])
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        expiry_date: '',
        category: 'Electronics',
    })
    const [receiptFile, setReceiptFile] = useState(null)
    const [productPhotoFile, setProductPhotoFile] = useState(null)
    const [status, setStatus] = useState('idle')
    const [message, setMessage] = useState('')

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleFileChange = (e) => {
        setReceiptFile(e.target.files[0] || null)
    }

    const uploadFile = async (file) => {
        if (!file) return null

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
        setStatus('loading')
        setMessage('')

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('You must be logged in to add a warranty')

            const receiptUrl = await uploadFile(receiptFile)
            const productImageUrl = await uploadFile(productPhotoFile)

            const insertData = {
                ...formData,
                user_id: user.id
            }
            if (receiptUrl) insertData.receipt_url = receiptUrl
            if (productImageUrl) insertData.product_image_url = productImageUrl

            const { error } = await supabase
                .from('warranties')
                .insert([insertData])

            if (error) throw error

            setStatus('success')
            setMessage('Warranty added successfully!')
            setFormData({
                name: '',
                brand: '',
                expiry_date: '',
                category: 'Electronics',
            })
            setReceiptFile(null)
            setProductPhotoFile(null)

            // Redirect to dashboard after 1.5 seconds
            setTimeout(() => {
                router.push('/')
            }, 1500)

        } catch (error) {
            setStatus('error')
            setMessage(error.message || 'Failed to add warranty')
        }
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
                        Add Warranty
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
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-neutral-500 text-gray-900 dark:text-white"
                            />
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
                            <label
                                htmlFor="receipt"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-neutral-700 border-2 border-dashed border-gray-300 dark:border-neutral-500 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 hover:bg-gray-100 dark:hover:bg-neutral-600/50 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-400 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                </svg>
                                <span className="text-sm text-gray-500 dark:text-neutral-400">
                                    {receiptFile ? receiptFile.name : 'Click to upload receipt image'}
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
                            <label
                                htmlFor="product_photo"
                                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 dark:bg-neutral-700 border-2 border-dashed border-gray-300 dark:border-neutral-500 rounded-lg cursor-pointer hover:border-purple-500 dark:hover:border-purple-500 hover:bg-gray-100 dark:hover:bg-neutral-600/50 transition-all"
                            >
                                <svg className="w-5 h-5 text-gray-400 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <span className="text-sm text-gray-500 dark:text-neutral-400">
                                    {productPhotoFile ? productPhotoFile.name : 'Click to upload product photo'}
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
                                    Saving...
                                </span>
                            ) : (
                                'Save Warranty'
                            )}
                        </button>
                    </form>
                </div>

                {/* Status Messages */}
                {status === 'success' && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-down flex items-center gap-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        {message}
                    </div>
                )}

                {status === 'error' && (
                    <div className="bg-red-50 dark:bg-red-500/10 border-t border-red-200 dark:border-red-500 p-4">
                        <p className="text-red-500 dark:text-red-400 text-sm text-center font-medium">
                            {message}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
