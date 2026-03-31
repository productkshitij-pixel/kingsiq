import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const KINGS_NAVY    = '#002D72'
const KINGS_GOLD    = '#C9A227'
const KINGS_CRIMSON = '#C41230'

const StatCard = ({ label, value, sub }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
    <p className="text-3xl font-bold mt-1" style={{ color: KINGS_NAVY }}>{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

// statusColor: 'navy' | 'gold' | 'crimson'
const borderColorMap = {
  navy:    KINGS_NAVY,
  gold:    KINGS_GOLD,
  crimson: KINGS_CRIMSON,
}
const iconBgMap = {
  navy:    'rgba(0,45,114,0.07)',
  gold:    'rgba(201,162,39,0.10)',
  crimson: 'rgba(196,18,48,0.07)',
}
const badgeBgMap = {
  navy:    { bg: 'rgba(0,45,114,0.08)', color: KINGS_NAVY },
  gold:    { bg: 'rgba(201,162,39,0.15)', color: '#7A5E00' },
  crimson: { bg: 'rgba(196,18,48,0.08)', color: KINGS_CRIMSON },
}

const ModuleCard = ({ title, description, icon, status, statusColor }) => {
  const borderColor = borderColorMap[statusColor]
  const iconBg      = iconBgMap[statusColor]
  const badge       = badgeBgMap[statusColor]

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 border-l-4 p-6 flex flex-col shadow-sm"
      style={{ borderLeftColor: borderColor }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <h3 className="font-semibold mb-2" style={{ color: KINGS_NAVY }}>{title}</h3>
      <p className="text-sm text-gray-500 mb-4 flex-1">{description}</p>
      <span
        className="text-xs px-3 py-1 rounded-full font-semibold self-start"
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        {status}
      </span>
    </div>
  )
}

const Dashboard = () => {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ competitors: 0, keywords: 0, lastScrape: null })

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const [compRes, kwRes, logRes] = await Promise.all([
      supabase.from('competitors').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('keywords').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('scrape_logs').select('completed_at').eq('status', 'success').order('completed_at', { ascending: false }).limit(1),
    ])
    setStats({
      competitors: compRes.count ?? 0,
      keywords:    kwRes.count ?? 0,
      lastScrape:  logRes.data?.[0]?.completed_at ?? null,
    })
  }

  const modules = [
    {
      title: 'Social Media Dashboard',
      description: "Track post counts by type and follower numbers for Kings' own accounts and all competitor schools across Instagram and Facebook.",
      icon: '📱', statusColor: 'navy', status: 'Phase 2 — Social scrapers',
    },
    {
      title: 'Social Listening & Ranking',
      description: "Monitor keyword mentions across Google Reviews, blog pages, and Facebook groups. Score and rank Kings' vs competitors with adjustable weights.",
      icon: '🔍', statusColor: 'gold', status: 'Phase 4 & 5 — Listening & ranking',
    },
    {
      title: 'Competitor Ad Intelligence',
      description: 'Automatically capture and display all live competitor ads from Meta Ad Library and Google Ads Transparency Centre in one unified view.',
      icon: '📢', statusColor: 'crimson', status: 'Phase 3 — Ad scrapers',
    },
  ]

  const firstName = profile?.full_name?.split(' ')[0] || ''

  return (
    <Layout showInsights={false}>
      <div className="p-8">
        {/* Page header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display" style={{ color: KINGS_NAVY }}>
              {firstName ? `Welcome back, ${firstName}` : 'Welcome to KingsIQ'}
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Kings' Education Digital Marketing Intelligence Platform</p>
          </div>
          {/* Gold accent bar */}
          <div className="h-1 w-24 rounded-full" style={{ backgroundColor: KINGS_GOLD }} />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatCard label="Tracked Competitors" value={stats.competitors} sub="schools being monitored" />
          <StatCard label="Active Keywords" value={stats.keywords} sub="including 4 brand defaults" />
          <StatCard
            label="Last Data Refresh"
            value={stats.lastScrape ? new Date(stats.lastScrape).toLocaleDateString('en-GB') : '—'}
            sub={stats.lastScrape ? 'scrapers ran successfully' : 'scrapers not yet run'}
          />
        </div>

        {/* Foundation banner */}
        <div
          className="rounded-xl p-5 mb-8 flex items-start gap-4"
          style={{ backgroundColor: 'rgba(0,45,114,0.06)', border: '1px solid rgba(0,45,114,0.12)' }}
        >
          <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: KINGS_GOLD, marginTop: '4px' }} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm" style={{ color: KINGS_NAVY }}>Phase 1 Complete</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: KINGS_NAVY, color: '#fff' }}
              >
                Foundation
              </span>
            </div>
            <p className="text-sm" style={{ color: KINGS_NAVY, opacity: 0.7 }}>
              Database, authentication, and competitor management are live. The three modules below will be built in Phases 2–5.
            </p>
          </div>
        </div>

        {/* Modules */}
        <h2 className="text-base font-semibold mb-4" style={{ color: KINGS_NAVY }}>Platform Modules</h2>
        <div className="grid grid-cols-3 gap-6">
          {modules.map((mod) => <ModuleCard key={mod.title} {...mod} />)}
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
