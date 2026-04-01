import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

const ModuleCard = ({ title, description, icon, status, statusColor, linkTo }) => {
  const colorMap = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    orange: 'border-l-orange-400',
  }
  const iconBgMap = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    orange: 'bg-orange-50',
  }
  const badgeMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${colorMap[statusColor]} p-6 flex flex-col`}>
      <div className={`w-12 h-12 rounded-xl ${iconBgMap[statusColor]} flex items-center justify-center text-2xl mb-4`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4 flex-1">{description}</p>
      <span className={`text-xs px-3 py-1 rounded-full font-medium self-start ${badgeMap[statusColor]}`}>
        {status}
      </span>
    </div>
  )
}

const Dashboard = () => {
  const { profile, isSuperAdmin } = useAuth()
  const [stats, setStats] = useState({ competitors: 0, keywords: 0, lastScrape: null })
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const [compRes, kwRes, logRes] = await Promise.all([
      supabase.from('competitors').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('keywords').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('scrape_logs').select('completed_at').eq('status', 'success').order('completed_at', { ascending: false }).limit(1),
    ])
    setStats({
      competitors: compRes.count ?? 0,
      keywords: kwRes.count ?? 0,
      lastScrape: logRes.data?.[0]?.completed_at ?? null,
    })
  }

  // Super admin only: trigger a manual data refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStats()
    setTimeout(() => setRefreshing(false), 600)
  }

  const modules = [
    {
      title: 'Social Media Dashboard',
      description: "Track post counts by type and follower numbers for Kings' own accounts and all competitor schools across Instagram and Facebook.",
      icon: '📱',
      statusColor: 'blue',
      status: 'Phase 2 — Social scrapers',
    },
    {
      title: 'Social Listening & Ranking',
      description: "Monitor keyword mentions across Google Reviews, blog pages, and Facebook groups. Score and rank Kings' vs competitors with adjustable weights.",
      icon: '🔍',
      statusColor: 'green',
      status: 'Phase 4 & 5 — Listening & ranking',
    },
    {
      title: 'Competitor Ad Intelligence',
      description: 'Automatically capture and display all live competitor ads from Meta Ad Library and Google Ads Transparency Centre in one unified view.',
      icon: '📢',
      statusColor: 'orange',
      status: 'Phase 3 — Ad scrapers',
    },
  ]

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <Layout>
      <div className="p-8 max-w-6xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {firstName ? `Welcome back, ${firstName}` : 'Welcome to KingsIQ'}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              Kings' Education Digital Marketing Intelligence Platform
            </p>
          </div>

          {/* Refresh button — Super Admin only */}
          {isSuperAdmin && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={refreshing ? 'animate-spin' : ''}
              >
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              {refreshing ? 'Refreshing…' : 'Refresh Data'}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Tracked Competitors" value={stats.competitors} sub="schools being monitored" />
          <StatCard label="Active Keywords" value={stats.keywords} sub="including 4 brand defaults" />
          <StatCard
            label="Last Data Refresh"
            value={stats.lastScrape ? new Date(stats.lastScrape).toLocaleDateString('en-GB') : '—'}
            sub={stats.lastScrape ? 'scrapers ran successfully' : 'scrapers not yet run'}
          />
        </div>

        {/* Build progress */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 font-semibold text-sm">Phase 1 Complete</span>
            <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">Foundation</span>
          </div>
          <p className="text-blue-700 text-sm">
            Database, authentication, and competitor management are live. The three modules below will be built in Phases 2–5.
          </p>
        </div>

        {/* Module cards */}
        <h2 className="text-base font-semibold text-gray-800 mb-4">Platform Modules</h2>
        <div className="grid grid-cols-3 gap-6">
          {modules.map((mod) => (
            <ModuleCard key={mod.title} {...mod} />
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
