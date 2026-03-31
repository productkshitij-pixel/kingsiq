import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  SlidersHorizontal,
  ChevronDown,
  BarChart3,
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatMonth = (ym) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(y, m - 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

const shortNum = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const buildMonthOptions = () => {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    options.push({ value, label: formatMonth(value) })
  }
  return options
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
const MiniBarChart = ({ bars, isKings }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null)
  if (!bars || bars.length === 0) return null
  const recent = bars.slice(-6)
  const max = Math.max(...recent.map(b => b.value || 0), 1)
  return (
    <div className="flex items-end gap-[2px] h-6 relative">
      {recent.map((b, i) => (
        <div
          key={i}
          className="relative flex flex-col items-center"
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Per-bar tooltip */}
          {hoveredIdx === i && b.value > 0 && (
            <div
              className="absolute bottom-full mb-1 z-50 pointer-events-none"
              style={{ whiteSpace: 'nowrap', left: '50%', transform: 'translateX(-50%)' }}
            >
              <div className="bg-gray-900 text-white text-[10px] font-semibold px-2 py-1 rounded-md shadow-xl">
                {b.value.toLocaleString()}
                <div className="text-gray-400 text-[9px] text-center">{b.month}</div>
              </div>
            </div>
          )}
          <div
            className="w-[5px] rounded-sm cursor-default"
            style={{
              height: `${Math.max(Math.round(((b.value || 0) / max) * 100), 8)}%`,
              minHeight: 3,
              background: hoveredIdx === i
                ? (isKings ? '#C9A227' : '#64748b')
                : (isKings ? '#002D72' : '#94a3b8'),
              transition: 'background 0.1s',
            }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── Trend indicator (small arrow) ───────────────────────────────────────────
const TrendArrow = ({ history }) => {
  if (!history || history.length < 2) return null
  const last = history[history.length - 1]?.value || 0
  const prev = history[history.length - 2]?.value || 0
  if (last > prev) return <TrendingUp size={11} className="text-emerald-500 inline ml-0.5" />
  if (last < prev) return <TrendingDown size={11} className="text-rose-400 inline ml-0.5" />
  return null
}

// ─── Month Dropdown ───────────────────────────────────────────────────────────
const MonthDropdown = ({ value, onChange, options, amber }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors shadow-sm"
        style={amber
          ? { background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309' }
          : { background: '#fff', border: '1px solid #e2e8f0', color: '#374151' }
        }
      >
        {formatMonth(value) || 'Select month'}
        <ChevronDown size={13} className="opacity-60" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[170px]">
          {options.map(m => (
            <button
              key={m}
              onClick={() => { onChange(m); setOpen(false) }}
              className={`block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-50 ${m === value ? 'font-semibold text-blue-700 bg-blue-50' : 'text-slate-600'}`}
            >
              {formatMonth(m)}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">No data available</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Instagram Icon SVG ──────────────────────────────────────────────────────
const InstagramIcon = ({ size = 16, color = '#E1306C' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
    <circle cx="17.5" cy="6.5" r="1.2" fill={color} />
  </svg>
)

// ─── School Card (horizontal row) ────────────────────────────────────────────
const SchoolCard = ({ snapshot, compareSnapshot, compareMode, history, isKings }) => {
  const [follHover, setFollHover] = useState(false)
  const reelHistory  = history?.post_count_reel      || []
  const carHistory   = history?.post_count_carousel  || []
  const statHistory  = history?.post_count_static    || []
  const follHistory  = history?.follower_count       || []

  const reels     = snapshot.post_count_reel      || 0
  const carousels = snapshot.post_count_carousel  || 0
  const statics   = snapshot.post_count_static    || 0
  const total     = reels + carousels + statics
  const followers = snapshot.follower_count || 0

  const igUrl = snapshot.source_url || null

  return (
    <div
      className="bg-white rounded-2xl px-5 py-4 mb-3 flex items-center gap-4"
      style={{
        borderLeft: isKings ? '4px solid #C9A227' : '4px solid #e2e8f0',
        boxShadow: isKings
          ? '0 2px 14px rgba(0,45,114,0.09)'
          : '0 1px 4px rgba(0,0,0,0.05)',
      }}
    >
      {/* Icon + label */}
      <div className="flex flex-col items-center gap-1 min-w-[84px]">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: isKings ? '#FFF0F6' : '#fff0f6' }}
        >
          <InstagramIcon size={22} color="#E1306C" />
        </div>
        <span
          className="text-[9px] font-bold tracking-wider px-2 py-[2px] rounded-full whitespace-nowrap"
          style={isKings
            ? { background: '#002D72', color: '#fff' }
            : { background: '#f1f5f9', color: '#64748b' }
          }
        >
          {isKings ? "KINGS' BADGE" : 'COMPETITOR'}
        </span>
      </div>

      {/* Name */}
      <div className="min-w-[155px]">
        <div className="flex items-center gap-2">
          <InstagramIcon size={13} color="#E1306C" />
          {igUrl ? (
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm leading-tight hover:underline"
              style={{
                color: isKings ? '#002D72' : '#1e293b',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {snapshot.school_name}
            </a>
          ) : (
            <span
              className="font-semibold text-sm leading-tight"
              style={{
                color: isKings ? '#002D72' : '#1e293b',
                fontFamily: "'Playfair Display', serif",
              }}
            >
              {snapshot.school_name}
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 ml-4">Instagram</p>
      </div>

      {/* Post type stats */}
      <div className="flex items-center gap-5 flex-1">
        {/* Reels */}
        <div className="text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Reels</div>
          <div className="text-base font-bold text-slate-700">
            {reels}
            <TrendArrow history={reelHistory} />
            {compareMode && compareSnapshot && (
              <span className="text-xs font-normal text-amber-600 ml-1">
                / {compareSnapshot.post_count_reel || 0}
              </span>
            )}
          </div>
        </div>

        {/* Carousels */}
        <div className="text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Carousels</div>
          <div className="text-base font-bold text-slate-700">
            {carousels}
            <TrendArrow history={carHistory} />
            {compareMode && compareSnapshot && (
              <span className="text-xs font-normal text-amber-600 ml-1">
                / {compareSnapshot.post_count_carousel || 0}
              </span>
            )}
          </div>
        </div>

        {/* Static */}
        <div className="text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Static</div>
          <div className="text-base font-bold text-slate-700">
            {statics}
            <TrendArrow history={statHistory} />
            {compareMode && compareSnapshot && (
              <span className="text-xs font-normal text-amber-600 ml-1">
                / {compareSnapshot.post_count_static || 0}
              </span>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-9 w-px bg-slate-100 mx-1" />

        {/* Total Posts */}
        <div className="text-center">
          <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Total Posts</div>
          <span
            className="text-sm font-bold px-3 py-1 rounded-full"
            style={isKings
              ? { background: '#002D72', color: '#fff' }
              : { background: '#f1f5f9', color: '#475569' }
            }
          >
            {total}
          </span>
          {compareMode && compareSnapshot && (
            <div className="text-xs text-amber-600 mt-0.5 font-medium">
              / {(compareSnapshot.post_count_reel||0)+(compareSnapshot.post_count_carousel||0)+(compareSnapshot.post_count_static||0)}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-9 w-px bg-slate-100 mx-1" />

        {/* Followers */}
        <div
          className="flex items-center gap-3 ml-auto relative"
          onMouseEnter={() => setFollHover(true)}
          onMouseLeave={() => setFollHover(false)}
        >
          {/* Exact count tooltip */}
          {follHover && followers > 0 && (
            <div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
              style={{ whiteSpace: 'nowrap' }}
            >
              <div className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl">
                {followers.toLocaleString()} followers
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{ borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid #111827' }}
                />
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-0.5">Followers</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base font-bold text-slate-700 cursor-default">
                {shortNum(followers)}
                <TrendArrow history={follHistory} />
              </span>
              {compareMode && compareSnapshot && (
                <span className="text-xs font-semibold text-amber-600">
                  / {shortNum(compareSnapshot.follower_count || 0)}
                </span>
              )}
              {snapshot.most_followed && (
                <span className="text-[9px] font-bold px-2 py-[2px] rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>
                  MOST FOLLOWED
                </span>
              )}
              {snapshot.most_active && (
                <span className="text-[9px] font-bold px-2 py-[2px] rounded-full" style={{ background: '#d1fae5', color: '#065f46' }}>
                  MOST ACTIVE
                </span>
              )}
            </div>
          </div>
          <MiniBarChart bars={follHistory} isKings={isKings} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Module1 = () => {
  const [allSnapshots, setAllSnapshots] = useState([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareMonth, setCompareMonth] = useState(null)
  const [schoolFilter, setSchoolFilter] = useState('all')
  const [scrapeMonth, setScrapeMonth] = useState('')

  useEffect(() => {
    fetchAllData()
    fetchScrapeStatus()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('social_media_snapshots')
      .select('*')
      .eq('platform', 'instagram')
      .order('scraped_at', { ascending: false })
      .limit(500)

    if (data) {
      setAllSnapshots(data)
      const months = [...new Set(data.map((s) => s.scraped_at.slice(0, 7)))]
        .sort().reverse()
      setAvailableMonths(months)
      if (months.length > 0) {
        setSelectedMonth(prev => prev || months[0])
        setCompareMonth(prev => prev || (months[1] || null))
      }
    }
    setLoading(false)
  }

  const getMonthSnapshots = (month) => {
    if (!month) return []
    const monthData = allSnapshots.filter(s => s.scraped_at.startsWith(month))
    const seenId = new Map()
    monthData.forEach(s => {
      if (!seenId.has(s.school_id) || s.scraped_at > seenId.get(s.school_id).scraped_at)
        seenId.set(s.school_id, s)
    })
    const rows = Array.from(seenId.values())
    const kingsRows = rows.filter(s => s.school_type === 'kings')
    const nonKings  = rows.filter(s => s.school_type !== 'kings')
    const bestKings = kingsRows.length > 0
      ? kingsRows.reduce((a, b) => (a.follower_count || 0) >= (b.follower_count || 0) ? a : b)
      : null
    const sorted = nonKings.sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))

    // Tag most_followed and most_active
    if (sorted.length > 0) {
      const maxFollowers = Math.max(...sorted.map(s => s.follower_count || 0))
      const maxPosts = Math.max(...sorted.map(s =>
        (s.post_count_reel || 0) + (s.post_count_carousel || 0) + (s.post_count_static || 0)
      ))
      sorted.forEach(s => {
        s.most_followed = (s.follower_count || 0) === maxFollowers
        s.most_active = ((s.post_count_reel||0)+(s.post_count_carousel||0)+(s.post_count_static||0)) === maxPosts
      })
    }
    return bestKings ? [bestKings, ...sorted] : sorted
  }

  const buildHistory = () => {
    const history = {}
    const METRICS = ['follower_count', 'post_count_reel', 'post_count_carousel', 'post_count_static']
    const monthMap = {}
    allSnapshots.forEach(s => {
      const month = s.scraped_at.slice(0, 7)
      if (!monthMap[month]) monthMap[month] = {}
      const existing = monthMap[month][s.school_id]
      if (!existing || s.scraped_at > existing.scraped_at)
        monthMap[month][s.school_id] = s
    })
    Object.entries(monthMap).forEach(([month, schoolMap]) => {
      Object.entries(schoolMap).forEach(([schoolId, snap]) => {
        if (!history[schoolId]) { history[schoolId] = {}; METRICS.forEach(m => (history[schoolId][m] = [])) }
        METRICS.forEach(m => history[schoolId][m].push({ month, value: snap[m] || 0 }))
      })
    })
    Object.values(history).forEach(schoolH =>
      METRICS.forEach(m => schoolH[m].sort((a, b) => a.month.localeCompare(b.month)))
    )
    return history
  }

  const fetchScrapeStatus = async () => {
    try {
      const res  = await fetch(`${BACKEND_URL}/api/scrape/status`)
      const data = await res.json()
      setScrapeStatus(data.log)
    } catch { /* backend not running */ }
  }

  const handleRefreshNow = async () => {
    setScraping(true)
    const monthLabel = scrapeMonth ? formatMonth(scrapeMonth) : 'current month'
    try {
      await fetch(`${BACKEND_URL}/api/scrape/module1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: scrapeMonth || null }),
      })
      alert(`Scrape started for ${monthLabel}! A browser window will open and visit each Instagram profile. This takes 3–5 minutes. The dashboard will update automatically.`)
      const interval = setInterval(async () => {
        await fetchAllData()
        await fetchScrapeStatus()
        const statusRes  = await fetch(`${BACKEND_URL}/api/scrape/status`)
        const statusData = await statusRes.json()
        if (statusData.log?.status === 'success' || statusData.log?.status === 'failed') {
          clearInterval(interval)
          setScraping(false)
        }
      }, 15000)
    } catch {
      alert('Could not connect to the backend. Make sure it is running on port 8000.')
      setScraping(false)
    }
  }

  const history = buildHistory()
  const currentSnaps = getMonthSnapshots(selectedMonth).filter(s =>
    schoolFilter === 'all' ||
    (schoolFilter === 'kings' && s.school_type === 'kings') ||
    (schoolFilter === 'competitors' && s.school_type !== 'kings')
  )
  const compareSnaps = compareMode ? getMonthSnapshots(compareMonth) : []

  // Summary stats
  const allCurrent = getMonthSnapshots(selectedMonth)
  const kingsSnap  = allCurrent.find(s => s.school_type === 'kings')
  const competitors = allCurrent.filter(s => s.school_type !== 'kings')
  const kingsTotal  = kingsSnap
    ? (kingsSnap.post_count_reel||0)+(kingsSnap.post_count_carousel||0)+(kingsSnap.post_count_static||0)
    : 0
  const allTotals   = allCurrent.map(s => (s.post_count_reel||0)+(s.post_count_carousel||0)+(s.post_count_static||0))
  const marketAvg   = allTotals.length ? (allTotals.reduce((a,b)=>a+b,0)/allTotals.length) : 0
  const postsPct    = marketAvg ? (((kingsTotal-marketAvg)/marketAvg)*100).toFixed(1) : 0
  const compAvgFollowers = competitors.length
    ? competitors.reduce((a,b)=>a+(b.follower_count||0),0)/competitors.length : 0
  const followersLead = kingsSnap ? ((kingsSnap.follower_count||0)-compAvgFollowers) : 0

  return (
    <Layout>
      <div className="min-h-screen p-6" style={{ background: '#f0f2f8' }}>

        {/* ── Page Header ───────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
              Social Media Dashboard
            </h1>
            <p className="text-gray-400 text-sm mt-0.5">Instagram post breakdown — Kings' and competitors</p>
          </div>
          {/* Refresh button */}
          <div className="flex items-center gap-2">
            <select
              value={scrapeMonth}
              onChange={e => setScrapeMonth(e.target.value)}
              disabled={scraping}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none disabled:opacity-50"
            >
              <option value="">Current month</option>
              {buildMonthOptions().slice(1).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={handleRefreshNow}
              disabled={scraping}
              className="text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{ backgroundColor: '#002D72' }}
            >
              {scraping
                ? <><RefreshCw size={14} className="animate-spin" /> Scraping...</>
                : <><RefreshCw size={14} /> Refresh Now</>
              }
            </button>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl px-5 py-3 mb-5 flex items-center gap-4 flex-wrap shadow-sm">
          {/* Viewing pill */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Viewing: {selectedMonth ? formatMonth(selectedMonth) : '—'}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {availableMonths.length} month{availableMonths.length !== 1 ? 's' : ''} of data available
          </span>

          <div className="flex-1" />

          {/* Primary month dropdown */}
          <MonthDropdown
            value={selectedMonth}
            onChange={setSelectedMonth}
            options={availableMonths}
          />

          {/* Compare month (visible when Compare is on) */}
          {compareMode && (
            <MonthDropdown
              value={compareMonth}
              onChange={setCompareMonth}
              options={availableMonths.filter(m => m !== selectedMonth)}
              amber
            />
          )}

          {/* Individual / Compare toggle */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setCompareMode(false)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={!compareMode ? { background: '#002D72', color: '#fff' } : { color: '#64748b' }}
            >
              Individual
            </button>
            <button
              onClick={() => setCompareMode(true)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              style={compareMode ? { background: '#C9A227', color: '#fff' } : { color: '#64748b' }}
            >
              Compare
            </button>
          </div>

          {/* Scrape status badge */}
          {scrapeStatus && (
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              scrapeStatus.status === 'success' ? 'bg-green-100 text-green-700'
              : scrapeStatus.status === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse'
              : 'bg-red-100 text-red-600'
            }`}>
              {scrapeStatus.status}
            </span>
          )}
        </div>

        {/* ── Summary Stats ─────────────────────────────────────── */}
        {allCurrent.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Total Posts Strategy
              </div>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-extrabold text-slate-800" style={{ fontFamily: "'Raleway', sans-serif" }}>
                  {kingsTotal}
                </span>
                <span className="text-sm text-slate-400 mb-1">vs {marketAvg.toFixed(1)} avg</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                {kingsTotal >= marketAvg
                  ? <><TrendingUp size={13} /> +{postsPct}% above market average</>
                  : <><TrendingDown size={13} /> {postsPct}% below market average</>
                }
              </div>
            </div>
            <div className="bg-white rounded-2xl px-6 py-5 shadow-sm">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Total Followers
              </div>
              <div className="flex items-end gap-3 mb-1">
                <span className="text-4xl font-extrabold text-slate-800" style={{ fontFamily: "'Raleway', sans-serif" }}>
                  {kingsSnap ? shortNum(kingsSnap.follower_count) : '—'}
                </span>
                <span className="text-sm text-slate-400 mb-1">vs {shortNum(Math.round(compAvgFollowers))} avg</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                {followersLead >= 0
                  ? <><TrendingUp size={13} /> +{shortNum(Math.round(followersLead))} lead over competitors</>
                  : <><TrendingDown size={13} /> {shortNum(Math.abs(Math.round(followersLead)))} behind competitors</>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Filter ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { id: 'all', label: 'All Schools' },
            { id: 'kings', label: "Kings'" },
            { id: 'competitors', label: 'Competitors' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSchoolFilter(tab.id)}
              className="px-5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={schoolFilter === tab.id
                ? { background: '#002D72', color: '#fff', boxShadow: '0 2px 8px rgba(0,45,114,0.18)' }
                : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }
              }
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <button className="p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:border-slate-300 transition-colors shadow-sm">
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* ── School Cards ──────────────────────────────────────── */}
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading data...</div>
        ) : currentSnaps.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 size={48} className="text-gray-300 mb-4 mx-auto" strokeWidth={1.2} />
            <h3 className="text-gray-700 font-semibold mb-2">No data yet</h3>
            <p className="text-gray-400 text-sm mb-6">Click "Refresh Now" above to run the first scrape.</p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 max-w-md mx-auto text-left">
              <p className="text-blue-700 text-sm font-medium mb-2">To start collecting data:</p>
              <ol className="text-blue-600 text-sm space-y-1 list-decimal list-inside">
                <li>Open PowerShell in the <code className="bg-blue-100 px-1 rounded">backend</code> folder</li>
                <li>Run: <code className="bg-blue-100 px-1 rounded">py -3.12 -m uvicorn main:app --reload --port 8000</code></li>
                <li>Come back here and click "Refresh Now"</li>
              </ol>
            </div>
          </div>
        ) : (
          <div>
            {/* Kings' first */}
            {currentSnaps.filter(s => s.school_type === 'kings').map(snap => (
              <SchoolCard
                key={snap.school_id}
                snapshot={snap}
                compareSnapshot={compareMode ? compareSnaps.find(s => s.school_id === snap.school_id) : null}
                compareMode={compareMode}
                history={history[snap.school_id]}
                isKings={true}
              />
            ))}
            {/* Competitors */}
            {currentSnaps.filter(s => s.school_type !== 'kings').map(snap => (
              <SchoolCard
                key={snap.school_id}
                snapshot={snap}
                compareSnapshot={compareMode ? compareSnaps.find(s => s.school_id === snap.school_id) : null}
                compareMode={compareMode}
                history={history[snap.school_id]}
                isKings={false}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Module1
