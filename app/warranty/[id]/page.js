'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function WarrantyDetail() {
    const params = useParams()
    const { id } = params
    const router = useRouter()
    const [warranty, setWarranty] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isPortrait, setIsPortrait] = useState(false)

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
            setWarranty(data)
        } catch (error) {
            console.error('Error fetching warranty:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to permanently delete this product? This action cannot be undone.')) return

        try {
            const filesToRemove = []
            if (warranty?.receipt_url) filesToRemove.push(warranty.receipt_url.split('/').pop())
            if (warranty?.product_image_url) filesToRemove.push(warranty.product_image_url.split('/').pop())

            if (filesToRemove.length > 0) {
                await supabase.storage.from('receipts').remove(filesToRemove)
            }

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            const { error } = await supabase
                .from('warranties')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error
            router.push('/')
        } catch (error) {
            console.error('Error deleting product:', error.message)
            alert('Failed to delete product')
        }
    }

    const getDaysRemaining = (expiryDate) => {
        const today = new Date()
        const expiry = new Date(expiryDate)
        const diffTime = expiry - today
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    const getStatusText = (days) => {
        if (days < 0) return 'Expired'
        if (days === 0) return 'Expires Today'
        return 'Active'
    }

    const getStatusColor = (days) => {
        if (days < 0) return 'text-red-500 dark:text-red-400'
        if (days <= 30) return 'text-orange-500 dark:text-orange-400'
        return 'text-green-500 dark:text-green-400'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (!warranty) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-4">
                <h2 className="text-2xl font-bold mb-4">Warranty not found</h2>
                <Link href="/" className="text-blue-500 hover:underline">Return to Dashboard</Link>
            </div>
        )
    }

    const daysLeft = getDaysRemaining(warranty.expiry_date)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white pb-12 transition-colors duration-200">
            {/* Nav */}
            <div className="p-4 md:p-6 max-w-6xl mx-auto">
                <Link href="/" className="inline-flex items-center gap-2 text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Back to Dashboard
                </Link>
            </div>

            {/* Smart Layout Container */}
            <div className={`
                max-w-6xl mx-auto px-4 md:px-6 
                flex flex-col 
                ${isPortrait ? 'md:grid md:grid-cols-2 md:items-start md:gap-12' : 'gap-8'}
            `}>

                {/* Image Section - Sticky & Balanced on Desktop if Portrait */}
                <div className={`
                    bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 shadow-xl relative group transition-colors duration-200
                    ${isPortrait
                        ? 'flex flex-col items-center justify-start md:h-fit md:sticky md:top-6 md:self-start'
                        : 'w-full h-[400px] flex items-center justify-center overflow-hidden'
                    }
                `}>
                    {warranty.product_image_url ? (
                        <img
                            src={`${warranty.product_image_url}?t=${Date.now()}`}
                            alt={warranty.name}
                            onLoad={(e) => {
                                const { naturalWidth, naturalHeight } = e.currentTarget
                                setIsPortrait(naturalHeight > naturalWidth)
                            }}
                            className={`
                                object-contain p-4
                                ${isPortrait ? 'w-full max-h-[40vh] md:w-auto md:max-h-[90vh] md:max-w-full' : 'w-full h-full'}
                            `}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-neutral-700">
                            <svg className="w-24 h-24 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span className="text-lg font-medium">No Image Available</span>
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className={`
                    flex flex-col gap-6 
                    ${isPortrait ? 'w-full' : 'w-full'}
                `}>

                    {/* Header Card */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 md:p-8 shadow-md transition-colors duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-neutral-700 text-gray-700 dark:text-neutral-300 border border-gray-200 dark:border-neutral-600">
                                {warranty.category || 'Uncategorized'}
                            </span>
                            <span className={`flex items-center gap-1.5 text-sm font-semibold ${getStatusColor(daysLeft)}`}>
                                <span className="w-2 h-2 rounded-full bg-current"></span>
                                {getStatusText(daysLeft)}
                            </span>
                        </div>

                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{warranty.name}</h1>
                        <p className="text-xl text-gray-500 dark:text-neutral-400 font-medium mb-6">{warranty.brand}</p>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href={`/edit-warranty/${warranty.id}`}
                                className="flex-1 sm:flex-none text-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/25"
                            >
                                Edit Product
                            </Link>
                            <button
                                onClick={handleDelete}
                                className="flex-1 sm:flex-none px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-red-500/25"
                            >
                                Delete Product
                            </button>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                            <label className="block text-sm font-medium text-gray-500 dark:text-neutral-500 mb-1">Expiration Date</label>
                            <p className="text-2xl font-mono font-medium text-gray-900 dark:text-white">
                                {new Date(warranty.expiry_date).toLocaleDateString(undefined, {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                            <p className={`text-sm mt-1 font-medium ${getStatusColor(daysLeft)}`}>
                                {daysLeft < 0 ? `${Math.abs(daysLeft)} days ago` : `${daysLeft} days remaining`}
                            </p>
                        </div>

                        <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                            <label className="block text-sm font-medium text-gray-500 dark:text-neutral-500 mb-2">Proof of Purchase</label>
                            {warranty.receipt_url ? (
                                <a
                                    href={`${warranty.receipt_url}?t=${Date.now()}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-3 w-full p-3 border-2 border-dashed border-blue-500/30 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/5 dark:hover:bg-blue-500/10 hover:border-blue-500/50 transition-all group"
                                >
                                    <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 group-hover:text-blue-600 dark:group-hover:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-300 text-sm">Open Receipt</span>
                                </a>
                            ) : (
                                <div className="text-center text-gray-400 dark:text-neutral-500 text-sm italic py-2">
                                    No receipt attached
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service Centers Placeholder */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Service Centers</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30">COMING SOON</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-neutral-900/50 rounded-xl p-6 text-center border border-gray-100 dark:border-neutral-800/50">
                            <p className="text-gray-500 dark:text-neutral-400 text-sm">Detailed map and contact info for nearby authorized service centers will appear here.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
