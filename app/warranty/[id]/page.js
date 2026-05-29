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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Notebook / Product Log states
    const [notes, setNotes] = useState([])
    const [newNoteTitle, setNewNoteTitle] = useState('')
    const [newNoteContent, setNewNoteContent] = useState('')
    const [savingNote, setSavingNote] = useState(false)

    // Description edit states
    const [isEditingDesc, setIsEditingDesc] = useState(false)
    const [descInput, setDescInput] = useState('')
    const [savingDesc, setSavingDesc] = useState(false)

    useEffect(() => {
        if (id) {
            fetchWarranty()
            fetchNotes()
        }
    }, [id])

    const fetchNotes = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('notebook_simulations')
                .select('*')
                .eq('user_id', user.id)
                .eq('warranty_id', id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setNotes(data || [])
        } catch (error) {
            console.error('Error fetching notes:', error.message)
        }
    }

    const handleSaveNote = async (e) => {
        e.preventDefault()
        if (!newNoteTitle.trim() || !newNoteContent.trim()) return

        setSavingNote(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                alert('You must be logged in to save a note.')
                return
            }

            const { data, error } = await supabase
                .from('notebook_simulations')
                .insert([{
                    title: newNoteTitle.trim(),
                    content: newNoteContent.trim(),
                    user_id: user.id,
                    warranty_id: id
                }])
                .select()
                .single()

            if (error) throw error

            if (data) {
                setNotes((prevNotes) => [data, ...prevNotes])
            }
            setNewNoteTitle('')
            setNewNoteContent('')
        } catch (error) {
            console.error('Error saving note:', error.message)
            alert('Error saving note: ' + error.message)
        } finally {
            setSavingNote(false)
        }
    }

    const handleDeleteNote = async (noteId) => {
        try {
            const { error } = await supabase
                .from('notebook_simulations')
                .delete()
                .eq('id', noteId)

            if (error) throw error

            setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId))
        } catch (error) {
            console.error('Error deleting note:', error.message)
        }
    }

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
            setDescInput(data?.description || '')
        } catch (error) {
            console.error('Error fetching warranty:', error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSaveDescription = async () => {
        setSavingDesc(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Unauthorized')

            const { error } = await supabase
                .from('warranties')
                .update({ description: descInput.trim() })
                .eq('id', id)
                .eq('user_id', user.id)

            if (error) throw error
            setWarranty((prev) => ({ ...prev, description: descInput.trim() }))
            setIsEditingDesc(false)
        } catch (error) {
            console.error('Error saving description:', error.message)
            alert('Failed to save description: ' + error.message)
        } finally {
            setSavingDesc(false)
        }
    }

    const handleDelete = async () => {
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
            setShowDeleteConfirm(false)
        }
    }

    const handleDownloadReceipt = async (e, url, productName) => {
        e.preventDefault()
        e.stopPropagation()
        try {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Network response was not ok')
            const blob = await res.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            const fileExtension = url.split('.').pop().split('?')[0] || 'jpg'
            const sanitizedName = productName.toLowerCase().replace(/[^a-z0-9]/g, '_')
            a.download = `${sanitizedName}_receipt.${fileExtension}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(blobUrl)
        } catch (err) {
            console.error('Error downloading receipt, falling back to open in new tab:', err)
            window.open(url, '_blank')
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
    const receiptUrl = warranty.receipt_url || warranty.product_receipt_image_url

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white pb-12 transition-colors duration-200">

            {/* ── Styled Delete Confirmation Modal ── */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Delete Product</h2>
                        <p className="text-sm text-gray-600 dark:text-neutral-400">
                            Are you sure you want to permanently delete <span className="font-semibold text-gray-900 dark:text-white">{warranty?.name}</span>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3 mt-2">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-neutral-600 bg-transparent text-gray-700 dark:text-neutral-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors shadow-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                    {/* Top Row Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Left Column (Wide) */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
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
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-red-500/25"
                                    >
                                        Delete Product
                                    </button>
                                </div>
                            </div>

                            {/* Dates Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Purchase Date */}
                                <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                                    <label className="block text-sm font-medium text-gray-500 dark:text-neutral-500 mb-1">Purchase Date</label>
                                    <p className="text-2xl font-mono font-medium text-gray-900 dark:text-white">
                                        {warranty.purchase_date ? new Date(warranty.purchase_date).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) : 'Not recorded'}
                                    </p>
                                </div>

                                {/* Expiration Date */}
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
                            </div>
                        </div>

                        {/* Right Column (Narrow) */}
                        <div className="lg:col-span-1 flex flex-col justify-between h-full gap-6">

                            {/* Description Card */}
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200 h-[180px] flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between mb-2 shrink-0">
                                    <label className="text-sm font-medium text-gray-500 dark:text-neutral-500">Description</label>
                                    {!isEditingDesc && (
                                        <button
                                            onClick={() => { setDescInput(warranty.description || ''); setIsEditingDesc(true) }}
                                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                            Edit
                                        </button>
                                    )}
                                </div>

                                {isEditingDesc ? (
                                    <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                                        <textarea
                                            rows={3}
                                            value={descInput}
                                            onChange={(e) => setDescInput(e.target.value)}
                                            placeholder="Add a description for this product..."
                                            className="flex-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2 text-white text-sm focus:outline-none focus:border-zinc-500 resize-none placeholder-zinc-600 transition-colors min-h-0"
                                        />
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={handleSaveDescription}
                                                disabled={savingDesc}
                                                className="flex-1 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                                            >
                                                {savingDesc ? 'Saving...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={() => setIsEditingDesc(false)}
                                                disabled={savingDesc}
                                                className="flex-1 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm leading-relaxed text-gray-900 dark:text-white overflow-y-auto pr-1 flex-1 min-h-0">
                                        {warranty.description
                                            ? warranty.description
                                            : <span className="text-gray-400 dark:text-neutral-500 italic">Click edit to add a product description...</span>
                                        }
                                    </p>
                                )}
                            </div>

                            {/* Proof of Purchase Card */}
                            <div className={`bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 shadow-md transition-colors duration-200 flex flex-col ${isPortrait ? 'p-3' : 'p-6'}`}>
                                <label className={`block font-medium text-gray-500 dark:text-neutral-500 ${isPortrait ? 'text-xs mb-2' : 'text-sm mb-3'}`}>Proof of Purchase</label>
                                {receiptUrl ? (
                                    <div className={`flex flex-col items-center justify-center w-full border-2 border-dashed border-blue-500/30 rounded-xl bg-blue-50/50 dark:bg-blue-500/5 ${isPortrait ? 'p-2' : 'p-5'}`}>
                                        <svg className={`text-blue-500 dark:text-blue-400 shrink-0 animate-fade-in ${isPortrait ? 'w-6 h-6 mb-1' : 'w-8 h-8 mb-2'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                        </svg>
                                        <span className={`text-zinc-500 dark:text-neutral-400 font-medium text-center ${isPortrait ? 'text-[10px] mb-2' : 'text-xs mb-4'}`}>Receipt Attached</span>
                                        <div className={`flex flex-col w-full max-w-[200px] ${isPortrait ? 'gap-1.5' : 'gap-2'}`}>
                                            <a
                                                href={`${receiptUrl}?t=${Date.now()}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all shadow-md text-center flex items-center justify-center active:scale-95 ${isPortrait ? 'py-1.5 px-2 text-[11px] gap-1' : 'py-2 text-xs gap-1.5'}`}
                                            >
                                                <svg className={isPortrait ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                {isPortrait ? 'Open' : 'Open Receipt'}
                                            </a>
                                            <button
                                                onClick={(e) => handleDownloadReceipt(e, receiptUrl, warranty.name)}
                                                className={`w-full bg-neutral-900/80 hover:bg-neutral-800 text-white hover:text-blue-400 rounded-lg font-semibold transition-all border border-neutral-700/50 backdrop-blur-sm shadow-md flex items-center justify-center active:scale-95 ${isPortrait ? 'py-1.5 px-2 text-[11px] gap-1' : 'py-2 text-xs gap-1.5'}`}
                                            >
                                                <svg className={isPortrait ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                                                </svg>
                                                {isPortrait ? 'Download' : 'Download Receipt'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center text-center text-gray-400 dark:text-neutral-500 text-sm italic py-4 border-2 border-dashed border-gray-200 dark:border-neutral-700 rounded-xl bg-gray-50/50 dark:bg-neutral-800/50">
                                        No receipt attached
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                    {/* Product Log Section */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-gray-100 dark:border-neutral-700 pb-3 gap-2">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Product Log & Notes</h3>
                                <p className="text-gray-500 dark:text-neutral-400 text-xs mt-0.5">Keep track of repairs, warranty claims, or invoices for this product.</p>
                            </div>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 w-fit">
                                {notes.length} {notes.length === 1 ? 'Log' : 'Logs'}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Form Column */}
                            <div className="lg:col-span-1 lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800 lg:pr-6 flex flex-col h-full">
                                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">Add Entry</h4>
                                <form onSubmit={handleSaveNote} className="flex flex-col flex-1 gap-3">
                                    {/* Inputs wrapper */}
                                    <div className="flex flex-col gap-3 flex-1">
                                        <div>
                                            <label className="block text-base font-semibold text-zinc-700 dark:text-white mb-1">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="E.g., Battery replaced"
                                                value={newNoteTitle}
                                                onChange={(e) => setNewNoteTitle(e.target.value)}
                                                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col">
                                            <label className="block text-base font-semibold text-zinc-700 dark:text-white mb-1">
                                                Details / Description
                                            </label>
                                            <textarea
                                                required
                                                placeholder="E.g., Replaced under warranty at support center."
                                                value={newNoteContent}
                                                onChange={(e) => setNewNoteContent(e.target.value)}
                                                className="w-full flex-1 min-h-[80px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 resize-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={savingNote}
                                        className="w-full h-12 shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md hover:shadow-blue-500/25"
                                    >
                                        {savingNote ? (
                                            <div className="flex items-center gap-1.5">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                                <span>Saving...</span>
                                            </div>
                                        ) : (
                                            'Save Note'
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Logs List Column */}
                            <div className="lg:col-span-2 flex flex-col justify-start">
                                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">History Log</h4>
                                {notes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 bg-gray-50 dark:bg-neutral-900/30 rounded-xl border border-gray-100 dark:border-neutral-800/50 text-center h-full min-h-[150px]">
                                        <svg className="w-10 h-10 text-gray-400 dark:text-neutral-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <p className="text-gray-500 dark:text-neutral-500 text-xs">No notes recorded yet for this product.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[320px] overflow-y-auto pr-1">
                                        {notes.map((note) => (
                                            <div
                                                key={note.id}
                                                className="bg-gray-50 dark:bg-neutral-950/40 rounded-xl border border-gray-200 dark:border-neutral-800/80 shadow-sm group/note transition-all hover:border-gray-300 dark:hover:border-neutral-700 p-5 flex flex-col justify-between min-h-[160px]"
                                            >
                                                {/* Text container — takes all available space */}
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start gap-3 mb-1.5">
                                                        <h5 className="text-sm font-bold text-white break-words flex-1 leading-snug">
                                                            {note.title}
                                                        </h5>
                                                        <button
                                                            onClick={() => handleDeleteNote(note.id)}
                                                            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 opacity-0 group-hover/note:opacity-100 focus:opacity-100"
                                                            title="Delete note"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <p className="text-white text-xs whitespace-pre-wrap break-words leading-relaxed max-h-[60px] overflow-y-auto">
                                                        {note.content}
                                                    </p>
                                                </div>

                                                {/* Timestamp — sits at bottom, card padding creates the gap */}
                                                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-neutral-500 font-mono pt-3 mt-3 border-t border-gray-200 dark:border-neutral-800">
                                                    <span>Recorded</span>
                                                    <span>
                                                        {new Date(note.created_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Service Centers */}
                    <div className="bg-white dark:bg-neutral-800 rounded-2xl border border-gray-400 dark:border-gray-700 p-6 shadow-md transition-colors duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Service & Claims</h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">
                            Find authorized service centers or contact official support for <span className="font-semibold text-gray-700 dark:text-neutral-200">{warranty.brand && warranty.brand.trim() !== '' ? warranty.brand : warranty.name}</span>.
                        </p>
                        {(() => {
                            const isHomeService = ['appliances', 'furniture'].includes(warranty.category?.toLowerCase())
                            const searchKeyword = warranty.brand ? warranty.brand : warranty.name
                            const troubleshootingUrl = isHomeService
                                ? `https://www.google.com/search?q=${encodeURIComponent(`${searchKeyword} ${warranty.name} common troubleshooting guide fixes`)}`
                                : `https://www.google.com/search?q=${encodeURIComponent(`${searchKeyword} ${warranty.name} official user manual pdf download`)}`
                            return (
                                <div className="flex flex-col sm:flex-row flex-wrap gap-3">
                                    {/* Book Home Technician — only for Appliances & Furniture */}
                                    {isHomeService && (
                                        <a
                                            href={`https://www.google.com/search?q=${encodeURIComponent(`${searchKeyword} book official home service technician online India`)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-md hover:shadow-purple-500/30 transition-all active:scale-[0.97]"
                                        >
                                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                            </svg>
                                            Book Home Technician
                                        </a>
                                    )}
                                    {/* Find Nearest Center */}
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${searchKeyword} authorized service center near me`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md hover:shadow-blue-500/30 transition-all active:scale-[0.97]"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Find Nearest Center
                                    </a>
                                    {/* Call Official Support */}
                                    <a
                                        href={`https://www.google.com/search?q=${encodeURIComponent(`${searchKeyword} official customer care toll free number India`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-neutral-700 hover:bg-neutral-600 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.97]"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                        Call Official Support
                                    </a>
                                    {/* Troubleshooting & Manuals */}
                                    <a
                                        href={troubleshootingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-md hover:shadow-amber-500/30 transition-all active:scale-[0.97]"
                                    >
                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        Troubleshooting &amp; Manuals
                                    </a>
                                </div>
                            )
                        })()}

                        {/* ── Dynamic Checklist ── */}
                        {(() => {
                            const isHomeService = ['appliances', 'furniture'].includes(warranty.category?.toLowerCase())
                            const isElectronics = warranty.category?.toLowerCase() === 'electronics'
                            const isVehicle = warranty.category?.toLowerCase() === 'vehicles'
                            const accentBorder = isHomeService
                                ? 'border-teal-400/40 dark:border-teal-500/30'
                                : 'border-blue-400/40 dark:border-blue-500/30'
                            const accentBg = isHomeService
                                ? 'bg-teal-50/60 dark:bg-teal-900/10'
                                : 'bg-blue-50/60 dark:bg-blue-900/10'
                            const accentHeader = isHomeService
                                ? 'text-teal-700 dark:text-teal-400'
                                : 'text-blue-700 dark:text-blue-400'

                            const items = isHomeService
                                ? [
                                    {
                                        key: 'invoice',
                                        icon: '📄',
                                        text: <>Keep original <span className="font-semibold">{warranty.brand}</span> Invoice handy</>,
                                    },
                                    {
                                        key: 'id',
                                        icon: '🪪',
                                        text: <>Keep a valid Government ID ready <span className="text-gray-500 dark:text-neutral-400 text-xs">(Aadhaar / PAN)</span> for technician verification</>,
                                    },
                                    {
                                        key: 'space',
                                        icon: '🧹',
                                        text: <>Clear the physical space around your <span className="font-semibold">{warranty.name}</span> so the technician has easy access</>,
                                    },
                                ]
                                : [
                                    {
                                        key: 'invoice',
                                        icon: '📄',
                                        text: <>Keep original <span className="font-semibold">{warranty.brand}</span> Invoice handy</>,
                                    },
                                    {
                                        key: 'id',
                                        icon: '🪪',
                                        text: <>Keep a valid Government ID ready <span className="text-gray-500 dark:text-neutral-400 text-xs">(Aadhaar / PAN)</span></>,
                                    },
                                    {
                                        key: 'accessories',
                                        icon: isVehicle ? '🔑' : '🔌',
                                        text: isVehicle
                                            ? <>Remember to carry all physical vehicle keys, original registration certificate <span className="text-gray-500 dark:text-neutral-400 text-xs">(RC)</span>, and insurance documents</>
                                            : <>Remember to pack the main unit along with all original stock accessories <span className="text-gray-500 dark:text-neutral-400 text-xs">(chargers, cables)</span></>,
                                    },
                                    ...(isElectronics
                                        ? [{
                                            key: 'backup',
                                            icon: '🛡️',
                                            text: <>Backup critical personal data before handing over the device</>
                                        }]
                                        : []),
                                ]

                            return (
                                <div className={`mt-5 rounded-xl border p-4 ${accentBorder} ${accentBg}`}>
                                    <p className={`text-sm font-bold uppercase tracking-wider mb-3 ${accentHeader}`}>
                                        📋 {isHomeService ? 'At-Home Preparation Checklist' : 'Before You Go Checklist'}
                                    </p>
                                    <ul className="flex flex-col gap-2">
                                        {items.map((item) => (
                                            <li key={item.key} className="flex items-start gap-2 text-sm text-gray-700 dark:text-neutral-300 leading-snug">
                                                <span className="shrink-0 text-base select-none mt-0.5">{item.icon}</span>
                                                <span>
                                                    {item.text}
                                                    {item.key === 'invoice' && receiptUrl && (
                                                        <a
                                                            href={receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30 transition-colors"
                                                        >
                                                            👁️ View Uploaded Bill
                                                        </a>
                                                    )}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })()}

                        {/* ── Consumer Tip Box ── */}
                        {(() => {
                            const isHomeService = ['appliances', 'furniture'].includes(warranty.category?.toLowerCase())
                            const isVehicle = warranty.category?.toLowerCase() === 'vehicles'

                            const tips = isHomeService
                                ? [
                                    "No Inspection Fees: Authorized technicians cannot charge a visiting/inspection fee if your item is under an active manufacturing warranty.",
                                    "Check ID: Always verify the technician's official company ID card before letting them enter your home.",
                                ]
                                : isVehicle
                                ? [
                                    "Demand a Job Card: Never leave your vehicle without an official printed Job Card detailing the reported problems and current fuel/kilometer readings.",
                                    "Remove Belongings: Remember to remove your personal belongings from the boot, glovebox, or side-pockets before handing over keys.",
                                ]
                                : [
                                    "Demand a Job Sheet: Never leave your device at a center without an official printed acknowledgment receipt detailing your device's exact physical condition.",
                                    "Remove Storage: Remember to eject your SIM cards, SD cards, and log out of sensitive accounts before handing over your device.",
                                ]

                            return (
                                <div className="mt-4 rounded-xl border border-amber-400/40 dark:border-amber-500/25 bg-amber-500/10 dark:bg-amber-950/30 p-4">
                                    <p className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-3">
                                        💡 Warranty Vault Tip
                                    </p>
                                    <ul className="flex flex-col gap-2.5">
                                        {tips.map((tip, i) => {
                                            const [label, ...rest] = tip.split(':')
                                            const body = rest.join(':').trim()
                                            return (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-neutral-300 leading-snug">
                                                    <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 opacity-70" />
                                                    <span>
                                                        <span className="font-semibold text-amber-700 dark:text-amber-300">{label}:</span>
                                                        {' '}{body}
                                                    </span>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                </div>
                            )
                        })()}
                    </div>

                </div>
            </div>
        </div>
    )
}
