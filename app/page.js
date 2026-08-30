'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Hoisted Helper/Utility Functions to prevent TDZ issues during render initialization
const getDaysRemaining = (expiryDate) => {
  const today = new Date()
  const expiry = new Date(expiryDate)
  const diffTime = expiry - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const getBadgeColor = (days) => {
  if (days < 0) return 'bg-red-600 dark:bg-red-700 text-white'
  if (days <= 7) return 'bg-orange-600 text-white'
  if (days <= 30) return 'bg-amber-500 text-white'
  if (days <= 90) return 'bg-yellow-500 text-white'
  return 'bg-emerald-600 text-white'
}

const getBadgeText = (days) => {
  if (days < 0) return 'Expired'
  if (days === 0) return 'Expires Today'
  return `${days} Days Left`
}

const formatName = (name) => {
  if (!name) return ''
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default function Home() {
  const router = useRouter()
  const [warranties, setWarranties] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [autoArchiveExpired, setAutoArchiveExpired] = useState(false)
  const [currentView, setCurrentView] = useState('active') // 'active' | 'expired'

  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      const query = searchQuery.toLowerCase()
      const matchesSearch = !query ||
        (w.name && w.name.toLowerCase().includes(query)) ||
        (w.brand && w.brand.toLowerCase().includes(query))
      const matchesCategory = categoryFilter === 'All' || w.category === categoryFilter
      if (!matchesSearch || !matchesCategory) return false

      if (autoArchiveExpired) {
        const days = getDaysRemaining(w.expiry_date)
        const isExpired = days < 0
        if (currentView === 'active') {
          return !isExpired
        } else {
          return isExpired
        }
      }

      return true
    })
  }, [warranties, searchQuery, categoryFilter, autoArchiveExpired, currentView])

  useEffect(() => { 
    if (typeof window !== 'undefined') {
      setAutoArchiveExpired(localStorage.getItem('autoArchiveExpired') === 'true')
    }

    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      fetchWarranties(user)
    }

    checkUserAndFetch()

    // Check if a warranty was just added
    if (sessionStorage.getItem('warranty_added') === 'true') {
      sessionStorage.removeItem('warranty_added')
      setShowToast(true)
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        router.push('/login')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchWarranties = async (currentUser) => {
    try {
      const activeUser = currentUser || (await supabase.auth.getUser()).data.user
      if (!activeUser) {
        setWarranties([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('expiry_date', { ascending: true })

      if (error) throw error
      setWarranties(data || [])
    } catch (error) {
      console.error('Error fetching warranties:', error.message)
    } finally {
      setLoading(false)
    }
  }



  const handleTestEmail = async () => {
    const emailEnabled = localStorage.getItem('emailNotifications')
    if (emailEnabled !== null && emailEnabled === 'false') {
      alert('Cannot send test email while notifications are disabled.')
      return
    }
    setSendingEmail(true)
    try {
      // Get the user's current session token to authenticate the API call
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900 text-gray-900 dark:text-white p-4 sm:p-6 md:p-12 transition-colors duration-200">

      {/* ── Success Toast ── */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950 border border-green-400 dark:border-green-600 shadow-lg">
          <span className="text-sm font-semibold text-green-700 dark:text-green-300">Warranty added successfully!</span>
          <button
            onClick={() => setShowToast(false)}
            className="ml-2 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="relative max-w-6xl mx-auto">
        {/* Mobile-only Top Right Settings Icon */}
        {user && (
          <Link
            href="/settings"
            className="md:hidden absolute top-0 right-0 flex items-center justify-center p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg hover:from-blue-500 hover:to-purple-500 transition-all active:scale-95 z-40"
            aria-label="Settings"
          >
            <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </Link>
        )}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4">
          <div className="text-left">
            <img 
              src="/logo.png" 
              alt="Warranty Vault Logo" 
              className="h-20 sm:h-24 w-auto object-contain mr-auto md:mx-0 select-none pointer-events-none" 
              draggable="false"
            />
            <p className="text-gray-500 dark:text-neutral-400 mt-1 text-sm sm:text-base font-medium transition-all">
              {user?.user_metadata?.full_name
                ? `Welcome, ${formatName(user.user_metadata.full_name)}!`
                : 'Track and manage your product warranties'}
            </p>
          </div>

          <div className="flex items-center gap-3 md:self-end md:mb-1">
            {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
              <button
                onClick={() => handleTestEmail(warranties[0]?.name || 'Test Product')}
                disabled={sendingEmail}
                className={`flex items-center justify-center h-11 px-5 rounded-xl font-semibold shadow-md transition-all active:scale-95 text-sm ${sendingEmail
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
              >
                {sendingEmail ? 'Sending...' : 'Test Email'}
              </button>
            )}

            <Link
              href="/add-warranty"
              className="hidden md:flex items-center justify-center gap-2 h-11 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add New
            </Link>

            {user ? (
              <Link
                href="/settings"
                className="hidden md:flex items-center justify-center gap-2 h-11 px-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg transition-all transform hover:scale-[1.02] active:scale-95 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Settings
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center h-11 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all active:scale-95 text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>

        {/* Mobile FAB */}
        <Link
          href="/add-warranty"
          className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600 rounded-full shadow-lg shadow-purple-500/30 active:scale-90 transition-transform"
        >
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path>
          </svg>
        </Link>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : warranties.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-neutral-800/50 rounded-2xl border border-gray-400 dark:border-gray-700 shadow-md dark:shadow-none transition-colors duration-200">
            <div className="bg-gray-100 dark:bg-neutral-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No warranties yet</h3>
            <p className="text-gray-500 dark:text-neutral-400 max-w-sm mx-auto mb-6">
              Start tracking your product warranties by adding your first item.
            </p>
            <Link
              href="/add-warranty"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium hover:underline"
            >
              + Add your first warranty
            </Link>
          </div>
        ) : (
          <>
            {autoArchiveExpired && (
              <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-neutral-800/80 p-1.5 rounded-2xl w-fit shadow-inner transition-colors duration-200">
                <button
                  onClick={() => setCurrentView('active')}
                  className={`px-5 py-2 text-sm font-bold rounded-xl transition-all duration-200 ${
                    currentView === 'active'
                      ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setCurrentView('expired')}
                  className={`px-5 py-2 text-sm font-bold rounded-xl transition-all duration-200 ${
                    currentView === 'expired'
                      ? 'bg-white dark:bg-neutral-700 text-gray-900 dark:text-white shadow-md'
                      : 'text-gray-500 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Archive
                </button>
              </div>
            )}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
              <div className="relative flex-1">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-neutral-800 border border-gray-400 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-neutral-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                />
              </div>

              <div className="relative border-none p-0 sm:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-4 pr-10 py-3.5 bg-white dark:bg-neutral-800 border border-gray-400 dark:border-gray-700 rounded-xl text-base text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Categories</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Vehicles">Vehicles</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Others">Others</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-neutral-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </div>

            {filteredWarranties.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-neutral-800/50 rounded-2xl border border-gray-400 dark:border-gray-700 shadow-md dark:shadow-none">
                <svg className="w-12 h-12 text-gray-400 dark:text-neutral-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-neutral-300 mb-1">
                  {autoArchiveExpired 
                    ? (currentView === 'active' ? 'No active warranties found' : 'No archived warranties found')
                    : 'No warranties found'
                  }
                </h3>
                <p className="text-gray-500 dark:text-neutral-500 text-sm">
                  {searchQuery || categoryFilter !== 'All' 
                    ? 'No warranties match your search. Try a different term or category.'
                    : (autoArchiveExpired
                        ? (currentView === 'active' ? 'You have no active warranties at the moment.' : 'You have no archived/expired warranties yet.')
                        : 'No warranties found.'
                      )
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredWarranties.map((warranty) => {
                  const daysLeft = getDaysRemaining(warranty.expiry_date)

                  return (
                    <Link
                      href={`/warranty/${warranty.id}`}
                      key={warranty.id}
                      className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-400 dark:border-gray-700 shadow-md hover:shadow-xl hover:border-blue-500 dark:hover:border-neutral-600 transition-all group overflow-hidden flex flex-col hover:-translate-y-1"
                    >
                      {/* Image Top Half */}
                      <div className="relative h-40 bg-gray-100 dark:bg-neutral-900 overflow-hidden">
                        {warranty.product_image_url ? (
                          <img
                            src={`${warranty.product_image_url}?t=${Date.now()}`}
                            alt={warranty.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 dark:text-neutral-600">
                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                            </svg>
                            <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-neutral-500 font-medium">No Image</span>
                          </div>
                        )}
                        {/* Badge overlay */}
                        <div className="absolute top-2 left-2 flex gap-2">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-semibold shadow-sm ${getBadgeColor(daysLeft)}`}>
                            {getBadgeText(daysLeft)}
                          </span>
                        </div>
                      </div>

                      {/* Details Bottom Half */}
                      <div className="p-4 flex flex-col flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate pr-2" title={warranty.name}>
                            {warranty.name}
                          </h3>
                        </div>
                        <p className="text-gray-500 dark:text-neutral-400 text-xs font-medium mb-3">{warranty.brand}</p>

                        <div className="border-t border-gray-100 dark:border-neutral-700 pt-3 flex justify-between items-center text-xs mt-auto">
                          <span className="text-gray-400 dark:text-neutral-500">Expires</span>
                          <span className="font-mono text-gray-700 dark:text-neutral-300">
                            {new Date(warranty.expiry_date).toLocaleDateString(undefined, {
                              year: '2-digit',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}


      </div>
    </div>
  )
}


