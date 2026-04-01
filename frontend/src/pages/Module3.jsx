import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import {
  Globe,
  FileSearch,
  Library,
  Megaphone,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Tag,
  Target,
  Building2,
  AlertCircle,
  Clock,
  Link,
  Image as ImageIcon,
  ExternalLink,
  LayoutDashboard,
  BarChart2,
  Check,
  Search,
  X,
  ArrowUpDown,
  Timer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

// ─── Keyword group config ────────────────────────────────────────────────────

const KEYWORD_GROUPS = [
  {
    id: 'general',
    label: 'General Keywords',
    icon: Globe,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    badge: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'competitive',
    label: 'Competitive Keywords',
    icon: Target,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    badge: 'bg-orange-100 text-orange-700',
  },
  {
    id: 'brand',
    label: 'Brand Keywords',
    icon: Tag,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    badge: 'bg-green-100 text-green-700',
  },
]

const PLATFORMS = [
  { id: 'google', label: 'Google', Icon: Globe,   color: 'text-blue-500' },
  { id: 'meta',   label: 'Meta',   Icon: Library, color: 'text-indigo-500' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const isKingsAd = (headline = '', domain = '') => {
  const text = `${headline} ${domain}`.toLowerCase()
  return text.includes('kings') || text.includes('kingsschool') || text.includes('kingseducation')
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const AdvertiserChip = ({ headline, domain }) => {
  const kings = isKingsAd(headline, domain)
  return (
    <span
      title={domain}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        kings
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-gray-50 text-gray-600 border-gray-200'
      }`}
    >
      <Building2 size={11} strokeWidth={2} />
      {headline || domain}
    </span>
  )
}

const KeywordGroup = ({ group, rows }) => {
  const [open, setOpen] = useState(true)
  const Icon = group.icon

  if (!rows.length) return null

  return (
    <div className={`border ${group.border} rounded-xl overflow-hidden mb-4`}>
      {/* Group header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 ${group.bg} hover:brightness-95 transition`}
      >
        <div className="flex items-center gap-2.5">
          <Icon size={15} strokeWidth={1.8} className={group.color} />
          <span className="text-sm font-semibold text-gray-800">{group.label}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.badge}`}>
            {rows.length} keyword{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open
          ? <ChevronUp size={15} className="text-gray-400" />
          : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {/* Rows */}
      {open && (
        <div className="divide-y divide-gray-50">
          {rows.map((row) => (
            <div key={row.keyword} className="flex items-start gap-4 px-5 py-4">
              {/* Keyword */}
              <div className="w-56 flex-shrink-0">
                <p className="text-sm font-medium text-gray-800 leading-snug">{row.keyword}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock size={10} strokeWidth={2} />
                  {fmtDate(row.scraped_at)}
                </p>
              </div>

              {/* Advertisers */}
              <div className="flex-1 flex flex-wrap gap-2 pt-0.5">
                {row.advertisers && row.advertisers.length > 0 ? (
                  row.advertisers.map((ad, i) => (
                    <AdvertiserChip key={i} headline={ad.headline} domain={ad.domain} />
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">No sponsored ads detected</span>
                )}
              </div>

              {/* Ad count badge */}
              <div className="flex-shrink-0 pt-0.5">
                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${
                  row.advertisers?.length > 0
                    ? 'bg-red-50 text-red-600'
                    : 'bg-gray-50 text-gray-400'
                }`}>
                  {row.advertisers?.length || 0} ads
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Live Search Section ──────────────────────────────────────────────────────

const LiveSearch = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState(null)

  const fetchResults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: rows, error: sbError } = await supabase
        .from('google_ads_live')
        .select('*')
        .order('keyword_type', { ascending: true })
        .order('keyword', { ascending: true })
      if (sbError) throw sbError
      setData(rows || [])
    } catch (e) {
      setError('Could not load results.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResults() }, [fetchResults])

  const handleRefresh = async () => {
    setScraping(true)
    try {
      await fetch(`${BACKEND_URL}/api/scrape/google-ads`, { method: 'POST' })
      setTimeout(() => {
        fetchResults()
        setScraping(false)
      }, 8000)
    } catch {
      setScraping(false)
    }
  }

  // Split data into groups
  const grouped = KEYWORD_GROUPS.map(g => ({
    ...g,
    rows: data.filter(r => r.keyword_type === g.id),
  }))

  const lastUpdated = data.length
    ? data.reduce((latest, r) => {
        return !latest || new Date(r.scraped_at) > new Date(latest) ? r.scraped_at : latest
      }, null)
    : null

  const totalAds = data.reduce((sum, r) => sum + (r.advertisers?.length || 0), 0)

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            Who is advertising on Google in Dubai?
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastUpdated
              ? `Last refreshed: ${fmtDate(lastUpdated)} · ${totalAds} sponsored ads found`
              : 'Not yet scraped — click Refresh to run the first scan'}
            {' · '}
            <span className="text-blue-500">Auto-refreshes every Monday</span>
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleRefresh}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            <RefreshCw size={14} strokeWidth={2} className={scraping ? 'animate-spin' : ''} />
            {scraping ? 'Scraping…' : 'Refresh Now'}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-200 border border-green-400 inline-block" />
          Kings' Education ad detected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300 inline-block" />
          Competitor ad
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 inline-block" />
          Ad count per keyword
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-5">
          <AlertCircle size={15} strokeWidth={2} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
          <RefreshCw size={16} className="animate-spin" />
          Loading results…
        </div>
      )}

      {/* Scraping notice */}
      {scraping && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-600 mb-5">
          <RefreshCw size={15} strokeWidth={2} className="animate-spin" />
          Scraper running — opening Google for each keyword (3 loads each). This takes 5–10 minutes. Results will auto-update.
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <ScanSearch size={24} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">No data yet</p>
          <p className="text-xs text-gray-400">Click "Refresh Now" to run the first Google Ads scan.</p>
        </div>
      )}

      {/* Keyword groups */}
      {!loading && data.length > 0 && grouped.map(g => (
        <KeywordGroup key={g.id} group={g} rows={g.rows} />
      ))}
    </div>
  )
}

// ─── Ads Transparency — Status Dashboard ─────────────────────────────────────

const StatusDashboard = ({ data }) => {
  if (!data.length) return null
  // Sort same way as cards: most ads first
  const sorted = [...data].sort((a, b) => (b.ad_count || 0) - (a.ad_count || 0))
  return (
    <div className="mb-6 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
        Today's Ad Status
      </p>
      <div className="flex flex-wrap gap-2">
        {sorted.map(row => {
          const isToday = row.filter_applied === 'today'
          const count   = row.ad_count || 0
          const isGreen = isToday && count > 0
          return (
            <div
              key={row.domain}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-medium transition ${
                isGreen
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-orange-50 border-orange-200 text-orange-700'
              }`}
            >
              {/* Pulsing dot */}
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                {isGreen && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                )}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isGreen ? 'bg-green-500' : 'bg-orange-400'
                }`} />
              </span>
              {row.advertiser}
              {isToday && count > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                  {count}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        🟢 Green = advertising today · 🟠 Orange = no ads today
      </p>
    </div>
  )
}

// ─── Ads Transparency Section ────────────────────────────────────────────────

const AdsTransparency = () => {
  const { isSuperAdmin } = useAuth()
  const [data, setData]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [scraping, setScraping] = useState(false)
  const [expanded, setExpanded] = useState({})
  const [lightbox, setLightbox] = useState(null)

  const fetchResults = useCallback(async () => {
    setLoading(true)
    try {
      const { data: rows } = await supabase
        .from('ads_transparency_results')
        .select('*')
        .order('advertiser', { ascending: true })
      setData(rows || [])
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchResults() }, [fetchResults])

  const handleRefresh = async () => {
    setScraping(true)
    try {
      await fetch(`${BACKEND_URL}/api/scrape/ads-transparency`, { method: 'POST' })
      // Poll every 30s for up to 10 minutes until scraped_at updates
      const startedAt = Date.now()
      const prevLatest = data.length
        ? data.reduce((l, r) => !l || new Date(r.scraped_at) > new Date(l) ? r.scraped_at : l, null)
        : null
      const poll = setInterval(async () => {
        try {
          const { data: rows } = await supabase
            .from('ads_transparency_results')
            .select('*')
            .order('advertiser', { ascending: true })
          const newLatest = (rows || []).length
            ? rows.reduce((l, r) => !l || new Date(r.scraped_at) > new Date(l) ? r.scraped_at : l, null)
            : null
          // Stop polling when data is fresher than when we started, or after 10 min
          if ((newLatest && newLatest !== prevLatest) || Date.now() - startedAt > 600_000) {
            setData(rows || [])
            setScraping(false)
            clearInterval(poll)
          }
        } catch { /* keep polling */ }
      }, 30_000)
    } catch { setScraping(false) }
  }

  const toggle = (domain) => setExpanded(e => ({ ...e, [domain]: !e[domain] }))

  const lastUpdated = data.length
    ? data.reduce((l, r) => !l || new Date(r.scraped_at) > new Date(l) ? r.scraped_at : l, null)
    : null

  // Sort by ad_count descending (most ads at top)
  const sortedData = [...data].sort((a, b) => (b.ad_count || 0) - (a.ad_count || 0))

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm font-semibold text-gray-800">Competitor Ads on Google (UAE)</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {lastUpdated ? `Last scraped: ${fmtDate(lastUpdated)}` : 'Not yet scraped — click Refresh to run'}
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleRefresh}
            disabled={scraping}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            <RefreshCw size={14} strokeWidth={2} className={scraping ? 'animate-spin' : ''} />
            {scraping ? 'Scraping…' : 'Refresh Now'}
          </button>
        )}
      </div>

      {/* Scraping notice */}
      {scraping && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-600 mb-5">
          <RefreshCw size={15} className="animate-spin" />
          Chrome is opening Google Ads Transparency Centre with Today's filter for each competitor. Takes 3–5 minutes.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-12 justify-center">
          <RefreshCw size={16} className="animate-spin" /> Loading…
        </div>
      )}

      {/* Empty */}
      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <FileSearch size={24} className="text-gray-300" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">No data yet</p>
          <p className="text-xs text-gray-400">Click "Refresh Now" to scrape Google Ads Transparency for each competitor.</p>
        </div>
      )}

      {/* Status dashboard + results */}
      {!loading && sortedData.length > 0 && (
        <>
          <StatusDashboard data={data} />

          <div className="space-y-4">
            {sortedData.map(row => {
              const isOpen      = expanded[row.domain] !== false   // default open
              const adCount     = row.ad_count || 0              // today's count
              const totalCount  = row.total_ad_count || 0        // all-time count
              const isToday     = row.filter_applied === 'today'
              const shots       = row.ads || []
              return (
                <div key={row.domain} className="border border-gray-100 rounded-xl overflow-hidden">
                  {/* Advertiser header */}
                  <button
                    onClick={() => toggle(row.domain)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      {/* Status dot */}
                      <span className="relative flex h-3 w-3 flex-shrink-0">
                        {isToday && adCount > 0 && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                        )}
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${
                          isToday && adCount > 0 ? 'bg-green-500' : 'bg-orange-400'
                        }`} />
                      </span>
                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 size={14} className="text-blue-600" strokeWidth={2} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">{row.advertiser}</p>
                        <p className="text-xs text-gray-400">{row.domain}</p>
                      </div>
                      {/* All-time ad count badge */}
                      <span className={`ml-2 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        totalCount > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {totalCount} ad{totalCount !== 1 ? 's' : ''} total
                      </span>
                      {/* Today's count badge */}
                      {isToday && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          adCount > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-orange-100 text-orange-600'
                        }`}>
                          {adCount} today
                        </span>
                      )}
                    </div>
                    {isOpen
                      ? <ChevronUp size={15} className="text-gray-400" />
                      : <ChevronDown size={15} className="text-gray-400" />}
                  </button>

                  {/* Ad screenshot grid */}
                  {isOpen && shots.length > 0 && (
                    <div className="p-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                      {shots.map((ad, i) => (
                        <div
                          key={i}
                          onClick={() => setLightbox(ad)}
                          className="cursor-pointer border border-gray-100 rounded-xl overflow-hidden hover:shadow-md hover:border-blue-200 transition group"
                        >
                          <div className="bg-gray-50 aspect-video overflow-hidden">
                            <img
                              src={`${BACKEND_URL}${ad.screenshot_url}`}
                              alt={ad.title}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                              onError={e => { e.target.style.display = 'none' }}
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-gray-800 line-clamp-2 leading-snug">{ad.title}</p>
                            {ad.body && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ad.body}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isOpen && shots.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-gray-400">
                      No ads running today for this advertiser
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6"
          onClick={() => setLightbox(null)}
        >
          <div className="bg-white rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{lightbox.title}</p>
              <button onClick={() => setLightbox(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <img
              src={`${BACKEND_URL}${lightbox.screenshot_url}`}
              alt={lightbox.title}
              className="w-full"
            />
            {lightbox.body && (
              <div className="px-5 py-3 text-xs text-gray-500">{lightbox.body}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Coming Soon placeholder ─────────────────────────────────────────────────

const ComingSoon = ({ title, description, icon: Icon, iconColor = 'text-gray-300' }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center p-8">
    <div className="w-16 h-16 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-5">
      <Icon size={28} className={iconColor} strokeWidth={1.5} />
    </div>
    <h3 className="text-base font-semibold text-gray-700 mb-2">{title}</h3>
    <p className="text-sm text-gray-400 max-w-sm leading-relaxed">{description}</p>
    <div className="mt-6 px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
      <p className="text-xs font-medium text-blue-500">Coming Soon</p>
    </div>
  </div>
)

// ─── Meta Ads — Audience Category config ─────────────────────────────────────

const AUDIENCE_CATEGORIES = [
  { id: 'early_years', label: 'Early Years',          color: '#B8860B', bg: '#FFFBEB', border: '#F59E0B' },
  { id: 'primary',     label: 'Primary / Middle',     color: '#002D72', bg: 'rgba(0,45,114,0.07)', border: '#002D72' },
  { id: 'sixth_form',  label: 'Sixth Form / Senior',  color: '#6D28D9', bg: '#F5F3FF', border: '#7C3AED' },
  { id: 'open_day',    label: 'Open Day / Event',     color: '#065F46', bg: '#ECFDF5', border: '#059669' },
  { id: 'admissions',  label: 'Admissions Always-On', color: '#C41230', bg: 'rgba(196,18,48,0.07)', border: '#C41230' },
  { id: 'brand',       label: 'Brand / Reputation',   color: '#374151', bg: '#F9FAFB', border: '#9CA3AF' },
  { id: 'others',      label: 'Others',               color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
]
const getCat = (id) => AUDIENCE_CATEGORIES.find(c => c.id === id) || AUDIENCE_CATEGORIES[6]

// ─── Platform SVG Icons ──────────────────────────────────────────────────────

const FacebookIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

const InstagramIcon = ({ size = 10 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
)

// ─── Ad helpers ──────────────────────────────────────────────────────────────

const parseAdDate = (text) => {
  if (!text) return null
  try {
    const d = new Date(text)
    if (!isNaN(d.getTime())) return d
  } catch {}
  return null
}

const getDaysRunning = (started_running) => {
  const d = parseAdDate(started_running)
  if (!d) return null
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000))
}

const getDurationStyle = (days) => {
  if (days === null) return { color: '#9CA3AF', bg: '#F9FAFB' }
  if (days < 15)    return { color: '#6B7280', bg: '#F3F4F6' }
  if (days < 46)    return { color: '#D97706', bg: '#FFFBEB' }
  return               { color: '#059669', bg: '#ECFDF5' }
}

const detectAdType = (ad) => {
  // ── 1. Use the stored DB value when the scraper captured it ──────────────
  if (ad.ad_type && ['Video', 'Carousel', 'Static'].includes(ad.ad_type)) {
    return ad.ad_type
  }

  // ── 2. Fallback: infer from caption for older rows that lack ad_type ─────
  const cap = (ad.caption || '').toLowerCase()

  // Video: timestamp pattern "0:00 / 1:12" is the strongest signal
  if (/\d+:\d{2}\s*\/\s*\d+:\d{2}/.test(cap)) return 'Video'
  // Video: explicit keywords
  if (cap.includes('video') || cap.includes('watch') || cap.includes('reel')) return 'Video'
  // Carousel: swipe / multiple image cues
  if (cap.includes('swipe') || cap.includes('carousel') || cap.includes('more photos')) return 'Carousel'

  return 'Static'
}

// ─── Meta Ad Card ─────────────────────────────────────────────────────────────

const AD_TYPE_OPTIONS = [
  { id: 'Static',   label: 'Static',   icon: '🖼️' },
  { id: 'Video',    label: 'Video',    icon: '▶️' },
  { id: 'Carousel', label: 'Carousel', icon: '🔄' },
]

const MetaAdCard = ({ ad, isNew, onCategoryUpdate, onTypeUpdate, onClick }) => {
  const [showPicker, setShowPicker]       = useState(false)
  const [confirmCat, setConfirmCat]       = useState(null)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [confirmType, setConfirmType]     = useState(null)
  const [updating, setUpdating]           = useState(false)
  const [updatingType, setUpdatingType]   = useState(false)
  const [imgError, setImgError]           = useState(false)

  const cat      = getCat(ad.audience_category)
  const platforms = Array.isArray(ad.platforms)
    ? ad.platforms
    : (typeof ad.platforms === 'string' ? JSON.parse(ad.platforms || '[]') : [])
  const days    = getDaysRunning(ad.started_running)
  const dur     = getDurationStyle(days)
  const adType  = detectAdType(ad)

  const handleConfirm = async () => {
    if (!confirmCat) return
    setUpdating(true)
    try {
      await supabase
        .from('meta_ads_results')
        .update({ audience_category: confirmCat.id })
        .eq('id', ad.id)
      onCategoryUpdate(ad.id, confirmCat.id)
    } catch (e) { console.error(e) }
    setUpdating(false)
    setConfirmCat(null)
  }

  const handleTypeConfirm = async () => {
    if (!confirmType) return
    setUpdatingType(true)
    try {
      await supabase
        .from('meta_ads_results')
        .update({ ad_type: confirmType.id })
        .eq('id', ad.id)
      onTypeUpdate(ad.id, confirmType.id)
    } catch (e) { console.error(e) }
    setUpdatingType(false)
    setConfirmType(null)
  }

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer"
      style={{
        backgroundColor: isNew ? 'rgba(37,99,235,0.04)' : '#fff',
        border: isNew ? '1.5px solid rgba(37,99,235,0.35)' : '1px solid #F3F4F6',
        borderLeft: isNew ? '4px solid #2563EB' : undefined,
      }}
      onClick={onClick}
    >

      {/* ── Creative ── */}
      <div className="relative bg-gray-50 overflow-hidden" style={{ aspectRatio: '16/10' }}>
        {ad.screenshot_url && !imgError ? (
          <img
            src={`${BACKEND_URL}${ad.screenshot_url}`}
            alt="Ad creative"
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={32} className="text-gray-300" strokeWidth={1} />
          </div>
        )}

        {/* Top-right: Platform icon circles */}
        <div className="absolute top-2 right-2 flex gap-1">
          {platforms.includes('Facebook') && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: '#1877F2' }}>
              <FacebookIcon size={10} />
            </span>
          )}
          {platforms.includes('Instagram') && (
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
              style={{ background: 'linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}>
              <InstagramIcon size={10} />
            </span>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-3.5 flex flex-col flex-1">

        {/* Row 1: School name + Ad type badge (clickable) */}
        <div className="flex items-start justify-between gap-1.5 mb-2">
          <p className="text-xs font-bold leading-snug" style={{ color: '#002D72' }}>
            {ad.school_name}
          </p>
          <button
            onClick={e => { e.stopPropagation(); setShowTypePicker(true) }}
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 tracking-wide hover:bg-gray-200 transition"
            title="Click to change ad type"
          >
            {adType}
          </button>
        </div>

        {/* Row 2: Audience category chip + CTA */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <button
            onClick={e => { e.stopPropagation(); setShowPicker(true) }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border transition hover:opacity-75"
            style={{ color: cat.color, backgroundColor: cat.bg, borderColor: cat.border + '60' }}
            title="Click to change category"
          >
            {cat.label}
          </button>
          {ad.cta && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
              {ad.cta}
            </span>
          )}
        </div>

        {/* Row 3: Caption */}
        {ad.caption && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed mb-3 flex-1">
            {ad.caption}
          </p>
        )}

        {/* Row 4: Footer — started + duration left, view right */}
        <div className="mt-auto pt-2.5 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
              {ad.started_running ? `Started ${ad.started_running}` : '—'}
            </span>
            <a
              href={ad.ad_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-0.5 text-[11px] font-bold hover:underline flex-shrink-0"
              style={{ color: '#002D72' }}
            >
              View <ExternalLink size={9} strokeWidth={2.5} />
            </a>
          </div>
          {days !== null && (
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: dur.color }}>
              Running {days} day{days !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Category picker modal ── */}
      {showPicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-72 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-3">Select Audience Category</p>
            <div className="space-y-1.5">
              {AUDIENCE_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setConfirmCat(c); setShowPicker(false) }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border transition hover:opacity-80 flex items-center justify-between"
                  style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border + '50' }}
                >
                  {c.label}
                  {ad.audience_category === c.id && <Check size={12} strokeWidth={2.5} />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm category update dialog ── */}
      {confirmCat && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setConfirmCat(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-80 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-1.5">Update Category?</p>
            <p className="text-sm text-gray-500 mb-5">
              Change to{' '}
              <strong style={{ color: confirmCat.color }}>{confirmCat.label}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={updating}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition"
                style={{ backgroundColor: '#002D72' }}
              >
                {updating ? 'Saving…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmCat(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ad Type picker modal ── */}
      {showTypePicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTypePicker(false)}
        >
          <div
            className="bg-white rounded-2xl p-5 w-64 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-3">Set Ad Format</p>
            <div className="space-y-1.5">
              {AD_TYPE_OPTIONS.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setConfirmType(t); setShowTypePicker(false) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold border transition hover:bg-gray-50 flex items-center justify-between"
                  style={adType === t.id
                    ? { backgroundColor: '#002D72', color: '#fff', borderColor: '#002D72' }
                    : { color: '#374151', borderColor: '#E5E7EB' }}
                >
                  <span className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    {t.label}
                  </span>
                  {adType === t.id && <Check size={13} strokeWidth={2.5} />}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowTypePicker(false)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm type update dialog ── */}
      {confirmType && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setConfirmType(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-80 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-gray-800 mb-1.5">Update Ad Format?</p>
            <p className="text-sm text-gray-500 mb-5">
              Change format to{' '}
              <strong className="text-gray-800">{confirmType.icon} {confirmType.label}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTypeConfirm}
                disabled={updatingType}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition"
                style={{ backgroundColor: '#002D72' }}
              >
                {updatingType ? 'Saving…' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmType(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Meta Ads Library Section ─────────────────────────────────────────────────

const META_SUB_TABS = [
  { id: 'library',   label: 'Ads Library', Icon: Library },
  { id: 'dashboard', label: 'Dashboard',   Icon: LayoutDashboard },
  { id: 'analysis',  label: 'Analysis',    Icon: BarChart2 },
]

const AD_TYPES = ['Static', 'Video', 'Carousel']

// ─── Ad Detail Modal ──────────────────────────────────────────────────────────

const AdDetailModal = ({ ads, idx, onClose, onNavigate }) => {
  const ad       = ads[idx]
  const cat      = getCat(ad.audience_category)
  const platforms = Array.isArray(ad.platforms)
    ? ad.platforms
    : (typeof ad.platforms === 'string' ? JSON.parse(ad.platforms || '[]') : [])
  const days   = getDaysRunning(ad.started_running)
  const dur    = getDurationStyle(days)
  const adType = detectAdType(ad)
  const total  = ads.length

  // Lock scroll
  useEffect(() => {
    const orig = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = orig }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose()
      if (e.key === 'ArrowLeft')  onNavigate(idx > 0 ? idx - 1 : total - 1)
      if (e.key === 'ArrowRight') onNavigate(idx < total - 1 ? idx + 1 : 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, total, onClose, onNavigate])

  const prev = () => onNavigate(idx > 0 ? idx - 1 : total - 1)
  const next = () => onNavigate(idx < total - 1 ? idx + 1 : 0)

  const PlatformDot = ({ p, size = 6 }) => p === 'Facebook'
    ? <span className="rounded-full flex items-center justify-center text-white flex-shrink-0"
        style={{ width: size * 2.5, height: size * 2.5, backgroundColor: '#1877F2' }}>
        <FacebookIcon size={size} />
      </span>
    : <span className="rounded-full flex items-center justify-center text-white flex-shrink-0"
        style={{ width: size * 2.5, height: size * 2.5, background: 'linear-gradient(45deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}>
        <InstagramIcon size={size} />
      </span>

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)' }}
      onClick={onClose}
    >
      {/* ── Prev arrow ── */}
      <button
        onClick={e => { e.stopPropagation(); prev() }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center transition"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.22)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.12)'}
      >
        <ChevronLeft size={22} strokeWidth={2} color="#fff" />
      </button>

      {/* ── Modal ── */}
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden bg-white"
        style={{ width: '85vw', maxWidth: '1140px', height: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close × */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition"
          style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(0,0,0,0.15)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor='rgba(0,0,0,0.08)'}
        >
          <X size={14} strokeWidth={2.5} />
        </button>

        {/* ── Two columns ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — Creative (55%) */}
          <div
            className="flex items-center justify-center overflow-hidden flex-shrink-0"
            style={{ width: '55%', backgroundColor: '#111' }}
          >
            {ad.screenshot_url ? (
              adType === 'Video' ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={`${BACKEND_URL}${ad.screenshot_url}`}
                    alt="Ad preview"
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                      style={{ backgroundColor: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.5)' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <p className="text-white text-xs text-center opacity-75 leading-relaxed">
                      Video preview — click<br/>"See original ad" to watch
                    </p>
                  </div>
                </div>
              ) : (
                <img
                  src={`${BACKEND_URL}${ad.screenshot_url}`}
                  alt="Ad creative"
                  className="max-w-full max-h-full object-contain"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center text-white opacity-30">
                <ImageIcon size={56} strokeWidth={1} />
                <p className="text-sm mt-3">No creative available</p>
              </div>
            )}
          </div>

          {/* Right — Details (45%) */}
          <div className="flex flex-col overflow-y-auto" style={{ width: '45%' }}>
            <div className="p-7 flex flex-col gap-5">

              {/* Ad type + platform icons */}
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 tracking-wide">
                  {adType}
                </span>
                <div className="flex gap-1.5">
                  {platforms.map(p => <PlatformDot key={p} p={p} size={6} />)}
                </div>
              </div>

              {/* School + Library ID */}
              <div>
                <h2 className="text-xl font-bold font-display leading-snug" style={{ color: '#002D72' }}>
                  {ad.school_name}
                </h2>
                {ad.library_id && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    Library ID: {ad.library_id}
                  </p>
                )}
              </div>

              <div className="w-full h-px bg-gray-100" />

              {/* Category */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Audience Category
                </p>
                <button
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                  style={{ color: cat.color, backgroundColor: cat.bg, borderColor: cat.border + '70' }}
                >
                  {cat.label}
                </button>
              </div>

              {/* Timeline row */}
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                    Started
                  </p>
                  <p className="text-sm font-semibold text-gray-800">
                    {ad.started_running || '—'}
                  </p>
                </div>
                {days !== null && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Running
                    </p>
                    <p className="text-sm font-bold" style={{ color: dur.color }}>
                      {days} day{days !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Platforms */}
              {platforms.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Running On
                  </p>
                  <div className="flex gap-3">
                    {platforms.map(p => (
                      <span key={p} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                        <PlatformDot p={p} size={5} />
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="w-full h-px bg-gray-100" />

              {/* Full ad copy */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
                  Ad Copy
                </p>
                {ad.caption ? (
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {ad.caption}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">No copy captured</p>
                )}
              </div>

              {/* CTA pill */}
              {ad.cta && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Call to Action
                  </p>
                  <span className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    {ad.cta}
                  </span>
                </div>
              )}

              {/* See original */}
              {ad.ad_link && (
                <a
                  href={ad.ad_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition mt-auto"
                  style={{ backgroundColor: '#002D72' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor='#001E50'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor='#002D72'}
                >
                  See original ad on Meta
                  <ExternalLink size={13} strokeWidth={2.5} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Position indicator ── */}
        <div className="flex-shrink-0 py-3 text-center border-t border-gray-100 bg-white">
          <span className="text-xs font-bold text-gray-400 tracking-widest">
            {idx + 1} / {total}
          </span>
        </div>
      </div>

      {/* ── Next arrow ── */}
      <button
        onClick={e => { e.stopPropagation(); next() }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full flex items-center justify-center transition"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
        onMouseEnter={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.22)'}
        onMouseLeave={e => e.currentTarget.style.backgroundColor='rgba(255,255,255,0.12)'}
      >
        <ChevronRight size={22} strokeWidth={2} color="#fff" />
      </button>
    </div>
  )
}

// ─── Meta Ads Library Section ─────────────────────────────────────────────────

const MetaAdsLibrary = () => {
  const { isSuperAdmin } = useAuth()
  const [subTab, setSubTab]                   = useState('library')
  const [ads, setAds]                         = useState([])
  const [competitors, setCompetitors]         = useState([])
  const [dates, setDates]                     = useState([])
  const [selectedDate, setSelectedDate]       = useState(null)
  const [selectedSchool, setSelectedSchool]   = useState('all')
  const [modalIdx, setModalIdx]               = useState(null)  // null = closed
  const [loading, setLoading]                 = useState(true)
  const [scraping, setScraping]               = useState(false)
  const [hasLinks, setHasLinks]               = useState(true)
  const [filterAdTypes, setFilterAdTypes]     = useState([])
  const [filterObjectives, setFilterObjectives] = useState([])
  const [showObjDropdown, setShowObjDropdown] = useState(false)
  const [sortBy, setSortBy]                   = useState('newest')
  const [search, setSearch]                   = useState('')

  const fetchResults = useCallback(async (date = null) => {
    setLoading(true)
    try {
      const { data: allRows } = await supabase
        .from('meta_ads_results')
        .select('*')
        .order('scrape_date', { ascending: false })
      const rows = allRows || []
      const allDates = [...new Set(rows.map(r => r.scrape_date))].sort().reverse()
      const targetDate = (date && allDates.includes(date)) ? date : (allDates[0] || null)
      const filtered = targetDate ? rows.filter(r => r.scrape_date === targetDate) : rows
      setAds(filtered)
      setDates(allDates)
      if (targetDate) setSelectedDate(targetDate)
    } catch { setAds([]) }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.from('competitors').select('id,name,meta_ad_link').eq('is_active', true)
      .then(({ data }) => {
        const withLinks = (data || []).filter(c => c.meta_ad_link)
        setCompetitors(withLinks)
        setHasLinks(withLinks.length > 0)
      })
    fetchResults()
  }, [fetchResults])

  const handleRefresh = async () => {
    setScraping(true)
    try {
      await fetch(`${BACKEND_URL}/api/scrape/meta-ads`, { method: 'POST' })
      const started  = Date.now()
      const prevDate = selectedDate
      const poll = setInterval(async () => {
        try {
          const { data: allRows } = await supabase
            .from('meta_ads_results')
            .select('*')
            .order('scrape_date', { ascending: false })
          const rows = allRows || []
          const allDates = [...new Set(rows.map(r => r.scrape_date))].sort().reverse()
          const latestDate = allDates[0] || null
          if ((latestDate && latestDate !== prevDate) || Date.now() - started > 900_000) {
            const filtered = latestDate ? rows.filter(r => r.scrape_date === latestDate) : rows
            setAds(filtered)
            setDates(allDates)
            if (latestDate) setSelectedDate(latestDate)
            setScraping(false)
            clearInterval(poll)
          }
        } catch { /* keep polling */ }
      }, 30_000)
    } catch { setScraping(false) }
  }

  const handleCategoryUpdate = (adId, newCat) => {
    setAds(prev => prev.map(a => a.id === adId ? { ...a, audience_category: newCat } : a))
  }

  const handleTypeUpdate = (adId, newType) => {
    setAds(prev => prev.map(a => a.id === adId ? { ...a, ad_type: newType } : a))
  }

  const toggleAdType    = (t) => setFilterAdTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])
  const toggleObjective = (o) => setFilterObjectives(p => p.includes(o) ? p.filter(x => x !== o) : [...p, o])

  // ── No links state ─────────────────────────────────────────────────────────
  if (!hasLinks && !loading) return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'rgba(0,45,114,0.08)' }}>
        <Link size={22} strokeWidth={1.5} style={{ color: '#002D72' }} />
      </div>
      <p className="text-sm font-semibold mb-2" style={{ color: '#002D72' }}>
        No Meta Ad Library links added yet
      </p>
      <p className="text-xs text-gray-400 max-w-sm leading-relaxed mb-5">
        Add a Meta Ad Library link for each competitor in the Competitors table.
        Go to <strong>facebook.com/ads/library</strong>, filter by UAE + Active, and paste the URL.
      </p>
      <a href="/competitors"
        className="px-4 py-2 text-white text-sm font-medium rounded-lg transition"
        style={{ backgroundColor: '#002D72' }}>
        Go to Competitors →
      </a>
    </div>
  )

  // ── Latest scrape date for "New" badge ────────────────────────────────────
  const latestDate = dates.length > 0 ? dates[0] : null

  // ── Faceted filter helpers ────────────────────────────────────────────────
  // Base = filtered by school + search only (no type/objective filters)
  const passesBase = (a) => {
    if (selectedSchool !== 'all' && a.school_id !== selectedSchool) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (a.caption||'').toLowerCase().includes(q) ||
             (a.school_name||'').toLowerCase().includes(q) ||
             (a.cta||'').toLowerCase().includes(q)
    }
    return true
  }
  const baseAds = ads.filter(passesBase)

  // Full filtered list (all filters applied + sort)
  const applyAll = (list) => {
    let r = list.filter(a => {
      if (filterAdTypes.length > 0    && !filterAdTypes.includes(detectAdType(a)))        return false
      if (filterObjectives.length > 0 && !filterObjectives.includes(a.audience_category)) return false
      return true
    })
    if (sortBy === 'newest')  r = [...r].sort((a,b) => { const da=parseAdDate(a.started_running),db=parseAdDate(b.started_running); return (!da&&!db)?0:!da?1:!db?-1:db-da })
    if (sortBy === 'oldest')  r = [...r].sort((a,b) => { const da=parseAdDate(a.started_running),db=parseAdDate(b.started_running); return (!da&&!db)?0:!da?1:!db?-1:da-db })
    if (sortBy === 'longest') r = [...r].sort((a,b) => (getDaysRunning(b.started_running)??-1) - (getDaysRunning(a.started_running)??-1))
    return r
  }
  const filteredAds = applyAll(baseAds)

  // Dynamic counts for type toggles (ignore type filter, keep everything else)
  const typeCount = (type) => baseAds.filter(a => {
    if (filterObjectives.length > 0 && !filterObjectives.includes(a.audience_category)) return false
    return detectAdType(a) === type
  }).length

  // Dynamic counts for objective dropdown (ignore objective filter, keep everything else)
  const objCount = (objId) => baseAds.filter(a => {
    if (filterAdTypes.length > 0 && !filterAdTypes.includes(detectAdType(a))) return false
    return a.audience_category === objId
  }).length

  // Activity warning: no ads for this competitor in the latest scrape
  const hasRecentAds = (compId) => {
    if (!latestDate || ads.length === 0) return true
    return ads.some(a => a.school_id === compId && a.scrape_date === latestDate)
  }

  return (
    <div>
      {/* ── Sub-tabs ── */}
      <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
        {META_SUB_TABS.map(({ id, label, Icon }) => {
          const active = subTab === id
          return (
            <button
              key={id}
              onClick={() => setSubTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-[#C9A227] text-[#002D72]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Dashboard / Analysis — coming soon ── */}
      {(subTab === 'dashboard' || subTab === 'analysis') && (
        <div className="flex flex-col items-center justify-center py-24 text-center p-8">
          <div className="w-14 h-14 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center mb-4">
            {subTab === 'dashboard'
              ? <LayoutDashboard size={24} className="text-gray-300" strokeWidth={1.5} />
              : <BarChart2 size={24} className="text-gray-300" strokeWidth={1.5} />}
          </div>
          <p className="text-sm font-semibold text-gray-600 mb-2">
            {subTab === 'dashboard' ? 'Meta Ads Dashboard' : 'Ad Analysis'}
          </p>
          <p className="text-xs text-gray-400 max-w-xs">Coming in the next phase.</p>
          <div className="mt-5 px-4 py-2 rounded-lg" style={{ backgroundColor: 'rgba(201,162,39,0.1)' }}>
            <p className="text-xs font-semibold" style={{ color: '#C9A227' }}>Coming Soon</p>
          </div>
        </div>
      )}

      {/* ── Library tab ── */}
      {subTab === 'library' && (
        <div className="p-6" onClick={() => showObjDropdown && setShowObjDropdown(false)}>

          {/* ── Toolbar row 1: Title + Date + Refresh ── */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#002D72' }}>
                Creative Library — Meta Ads (UAE · Active)
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {ads.length > 0
                  ? `${filteredAds.length} of ${ads.length} ads · scraped ${selectedDate || '—'}`
                  : 'No data yet — click Refresh to scrape'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {dates.length > 0 && (
                <select
                  value={selectedDate || ''}
                  onChange={e => { setSelectedDate(e.target.value); fetchResults(e.target.value) }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white"
                >
                  {dates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
              {isSuperAdmin && (
                <button
                  onClick={handleRefresh}
                  disabled={scraping}
                  className="flex items-center gap-2 px-4 py-2 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60"
                  style={{ backgroundColor: '#002D72' }}
                  onMouseEnter={e => { if (!scraping) e.currentTarget.style.backgroundColor = '#001E50' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#002D72' }}
                >
                  <RefreshCw size={14} strokeWidth={2} className={scraping ? 'animate-spin' : ''} />
                  {scraping ? 'Scraping…' : 'Refresh Now'}
                </button>
              )}
            </div>
          </div>

          {/* ── Toolbar row 2: Search + Ad Type toggles + Objective + Sort ── */}
          <div className="flex flex-wrap items-center gap-2 mb-5" onClick={e => e.stopPropagation()}>

            {/* Search bar */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ads…"
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  <X size={12} strokeWidth={2.5} />
                </button>
              )}
            </div>

            {/* Ad Type toggles */}
            {AD_TYPES.map(type => {
              const active = filterAdTypes.includes(type)
              const count  = typeCount(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleAdType(type)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition"
                  style={active
                    ? { backgroundColor: '#002D72', color: '#fff', borderColor: '#002D72' }
                    : { backgroundColor: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}
                >
                  {type}
                  <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              )
            })}

            {/* Objective dropdown */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowObjDropdown(o => !o)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border rounded-lg transition"
                style={filterObjectives.length > 0
                  ? { backgroundColor: '#C9A227', color: '#002D72', borderColor: '#C9A227' }
                  : { backgroundColor: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}
              >
                <Target size={12} strokeWidth={2} />
                Objective
                {filterObjectives.length > 0 && (
                  <span className="px-1.5 py-px rounded-full text-[10px] font-bold bg-[#002D72] text-white">
                    {filterObjectives.length}
                  </span>
                )}
                <ChevronDown size={11} strokeWidth={2.5} />
              </button>
              {showObjDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 p-2 w-52">
                  {AUDIENCE_CATEGORIES.map(c => {
                    const active = filterObjectives.includes(c.id)
                    const count  = objCount(c.id)
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleObjective(c.id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition"
                        style={{ color: active ? c.color : '#374151' }}
                      >
                        <div className="flex items-center gap-2">
                          {active
                            ? <Check size={11} strokeWidth={2.5} style={{ color: c.color }} />
                            : <span className="w-[11px]" />}
                          {c.label}
                        </div>
                        <span className="text-gray-400 text-[10px]">{count}</span>
                      </button>
                    )
                  })}
                  {filterObjectives.length > 0 && (
                    <button
                      onClick={() => { setFilterObjectives([]); setShowObjDropdown(false) }}
                      className="w-full text-center text-[11px] text-gray-400 hover:text-gray-600 pt-2 pb-1 border-t border-gray-100 mt-1"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1">
              <ArrowUpDown size={12} className="text-gray-400 flex-shrink-0" strokeWidth={2} />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="text-xs font-medium border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="longest">Longest Running</option>
              </select>
            </div>
          </div>

          {/* Scraping notice */}
          {scraping && (
            <div className="flex items-center gap-2 p-4 rounded-xl text-sm mb-5"
              style={{ backgroundColor: 'rgba(0,45,114,0.06)', border: '1px solid rgba(0,45,114,0.12)', color: '#002D72' }}>
              <RefreshCw size={14} className="animate-spin flex-shrink-0" />
              Browser opening Meta Ads Library for each competitor. Takes a few minutes per school. Results auto-update every 30s.
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-16 justify-center">
              <RefreshCw size={15} className="animate-spin" /> Loading…
            </div>
          )}

          {!loading && (
            <>
              {/* ── Competitor filter pills with live counts ── */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedSchool('all')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition"
                  style={selectedSchool === 'all'
                    ? { backgroundColor: '#002D72', color: '#fff', borderColor: '#002D72' }
                    : { backgroundColor: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}
                >
                  All Schools
                  <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${selectedSchool === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {ads.length}
                  </span>
                </button>

                {competitors.map(comp => {
                  const active     = selectedSchool === comp.id
                  const count      = ads.filter(a => a.school_id === comp.id).length
                  const warn       = ads.length > 0 && !hasRecentAds(comp.id)
                  return (
                    <button
                      key={comp.id}
                      onClick={() => setSelectedSchool(comp.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition"
                      style={active
                        ? { backgroundColor: '#C9A227', color: '#002D72', borderColor: '#C9A227' }
                        : { backgroundColor: '#fff', color: '#6B7280', borderColor: '#E5E7EB' }}
                    >
                      {warn && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"
                          title="No new ads in the latest scrape" />
                      )}
                      {comp.name}
                      <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${active ? 'bg-[#002D72]/20 text-[#002D72]' : 'bg-gray-100 text-gray-500'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* ── Per-competitor sections ── */}
              {competitors.length > 0 && (
                <div className="space-y-8">
                  {competitors
                    .filter(comp => selectedSchool === 'all' || selectedSchool === comp.id)
                    .map(comp => {
                      const schoolAds = filteredAds.filter(a => a.school_id === comp.id)
                      const warn      = ads.length > 0 && !hasRecentAds(comp.id)
                      return (
                        <div key={comp.id}>
                          {/* School heading */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                              <h3 className="text-base font-bold font-display" style={{ color: '#002D72' }}>
                                {comp.name}
                              </h3>
                              {warn && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border"
                                  style={{ backgroundColor: '#FFFBEB', color: '#D97706', borderColor: '#FCD34D' }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  No new ads in latest scrape
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                              style={{ backgroundColor: 'rgba(0,45,114,0.08)', color: '#002D72' }}>
                              {schoolAds.length} AD{schoolAds.length !== 1 ? 'S' : ''} FOUND
                            </span>
                          </div>

                          {/* Ad grid or zero state */}
                          {schoolAds.length === 0 ? (
                            <div className="flex items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                              <div className="text-center">
                                <ImageIcon size={28} className="text-gray-200 mx-auto mb-2" strokeWidth={1} />
                                <p className="text-xs text-gray-400 font-medium">
                                  {ads.some(a => a.school_id === comp.id)
                                    ? 'No ads match the current filters'
                                    : 'No ads found for this scrape date'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                              {schoolAds.map(ad => {
                                const globalIdx = filteredAds.findIndex(a => (a.id || a.library_id) === (ad.id || ad.library_id))
                                return (
                                  <MetaAdCard
                                    key={ad.id || ad.library_id}
                                    ad={ad}
                                    isNew={(() => { const d = getDaysRunning(ad.started_running); return d !== null && d <= 10 })()}
                                    onCategoryUpdate={handleCategoryUpdate}
                                    onTypeUpdate={handleTypeUpdate}
                                    onClick={() => setModalIdx(globalIdx)}
                                  />
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}

              {/* No competitors yet + no ads */}
              {competitors.length === 0 && ads.length === 0 && !scraping && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Library size={24} className="text-gray-300 mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-semibold text-gray-600 mb-1">No ads scraped yet</p>
                  <p className="text-xs text-gray-400">Click "Refresh Now" to run the first Meta Ads scrape.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Ad Detail Modal ── */}
      {modalIdx !== null && filteredAds.length > 0 && (
        <AdDetailModal
          ads={filteredAds}
          idx={Math.min(modalIdx, filteredAds.length - 1)}
          onClose={() => setModalIdx(null)}
          onNavigate={(i) => setModalIdx(i)}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const Module3 = () => {
  const [activePlatform, setActivePlatform] = useState('google')

  return (
    <Layout>
      <div className="p-8">

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Megaphone size={12} strokeWidth={1.8} />
            <span>Ad Intelligence</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Intelligence</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track live competitor ads across Google and Meta platforms.
          </p>
        </div>

        {/* Platform Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-8">
          {PLATFORMS.map(({ id, label, Icon, color }) => {
            const isActive = activePlatform === id
            return (
              <button
                key={id}
                onClick={() => setActivePlatform(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} strokeWidth={1.8} className={isActive ? color : 'text-gray-400'} />
                {label}
              </button>
            )
          })}
        </div>

        {/* ── Google → Ads Transparency (direct, no sub-tabs) ── */}
        {activePlatform === 'google' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-4 border-b border-gray-100">
              <FileSearch size={15} className="text-blue-600" strokeWidth={1.8} />
              <span className="text-sm font-semibold text-gray-800">Ads Transparency</span>
              <span className="ml-1 text-xs text-gray-400">Google Ads Transparency Centre · UAE</span>
            </div>
            <AdsTransparency />
          </div>
        )}

        {/* ── Meta ── */}
        {activePlatform === 'meta' && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            <MetaAdsLibrary />
          </div>
        )}

      </div>
    </Layout>
  )
}

export default Module3
