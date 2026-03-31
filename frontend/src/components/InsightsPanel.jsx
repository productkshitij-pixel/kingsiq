import { useState } from 'react'
import { CalendarDays, Lightbulb, GraduationCap, MapPin, ChevronRight, TrendingUp } from 'lucide-react'

const NAVY    = '#002D72'
const GOLD    = '#C9A227'
const CRIMSON = '#C41230'

// ── UAE Public Holidays 2026 ──────────────────────────────────────────────────
const UAE_HOLIDAYS = [
  { date: '2026-03-20', name: 'Eid Al Fitr (est.)' },
  { date: '2026-03-21', name: 'Eid Al Fitr Holiday' },
  { date: '2026-03-22', name: 'Eid Al Fitr Holiday' },
  { date: '2026-05-27', name: 'Arafat Day (est.)' },
  { date: '2026-05-28', name: 'Eid Al Adha (est.)' },
  { date: '2026-05-29', name: 'Eid Al Adha Holiday' },
  { date: '2026-05-30', name: 'Eid Al Adha Holiday' },
  { date: '2026-06-17', name: 'Islamic New Year (est.)' },
  { date: '2026-08-25', name: "Prophet's Birthday (est.)" },
  { date: '2026-12-01', name: 'Commemoration Day' },
  { date: '2026-12-02', name: 'UAE National Day' },
  { date: '2026-12-03', name: 'UAE National Day Holiday' },
]

// ── School Calendar by Month ──────────────────────────────────────────────────
const SCHOOL_CALENDAR = {
  1:  { emoji: '📚', activity: 'Spring Term begins', tips: ['Post "new term" content', 'Promote Jan enrolment tours'] },
  2:  { emoji: '💬', activity: 'Parent-teacher meetings', tips: ['Share student achievement stories', 'Highlight academic support'] },
  3:  { emoji: '📝', activity: 'Spring assessments', tips: ['Run "results" ad campaigns', 'Deadline-focused copy works well'] },
  4:  { emoji: '🌸', activity: 'Spring break / Easter', tips: ['Lower spend — families travelling', 'Schedule posts in advance'] },
  5:  { emoji: '🎓', activity: 'Summer prep & graduation', tips: ['Showcase leavers content', 'Target next-year families now'] },
  6:  { emoji: '☀️', activity: 'End of year & graduations', tips: ['High engagement month', 'Open day promos for Sept intake'] },
  7:  { emoji: '🏖️', activity: 'Summer holidays', tips: ['Admissions ads for new families', 'Video tours of facilities'] },
  8:  { emoji: '🎒', activity: 'Back-to-school prep', tips: ['Peak admissions search period', 'Highest CPCs — max your budget'] },
  9:  { emoji: '🏫', activity: 'Autumn term starts', tips: ['Welcome-back posts perform well', 'Admissions close for most schools'] },
  10: { emoji: '📊', activity: 'Mid-term assessments', tips: ['Share school results & rankings', 'KHDA season — use ratings in ads'] },
  11: { emoji: '🏆', activity: 'Open days & awards season', tips: ['Peak open day search volume', 'Competitor ad spend is highest'] },
  12: { emoji: '🎄', activity: 'End of term & festivities', tips: ['Holiday themed content works', 'Plan Jan budget now'] },
}

// ── Key dates by month ────────────────────────────────────────────────────────
const KEY_DATES = {
  3:  [{ label: 'Spring break starts', day: 'Late Mar' }, { label: 'Eid Al Fitr (est.)', day: '20 Mar' }],
  4:  [{ label: 'Spring term resumes', day: 'Early Apr' }, { label: 'Open day season', day: 'Throughout' }],
  8:  [{ label: 'KHDA results (est.)', day: 'Mid Aug' }, { label: 'Back-to-school ads peak', day: 'Aug 15+' }],
  9:  [{ label: 'Autumn term begins', day: '1 Sep' }, { label: 'Admissions deadline', day: 'Late Sep' }],
  11: [{ label: 'Open day season peak', day: 'Throughout' }, { label: 'Early admissions open', day: 'Mid Nov' }],
}

const MARKETING_TIPS = [
  { icon: '🕒', tip: 'Best time to post for Dubai school parents: 7–9am and 8–10pm GST (school run windows).' },
  { icon: '📱', tip: 'Instagram Reels get 3× the reach of static posts for Dubai school audiences.' },
  { icon: '🔍', tip: '"British school Dubai admissions" peaks every Aug–Sep. Bid aggressively 6 weeks before.' },
  { icon: '🎯', tip: 'Families in Dubai research 3–5 schools before deciding. Retargeting is highly effective.' },
  { icon: '💰', tip: 'Average CPC for "British school Dubai" is AED 18–30. Brand keywords cost AED 3–8.' },
  { icon: '📍', tip: 'Google Maps ads (Local Pack) show for "school near me" — set up Google Business Profile.' },
  { icon: '📊', tip: 'KHDA ratings in ad copy increase CTR by ~22% for Outstanding/Very Good schools.' },
]

const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]

export default function InsightsPanel({ collapsed, setCollapsed }) {
  const today     = new Date()
  const thisMonth = today.getMonth() + 1
  const cal       = SCHOOL_CALENDAR[thisMonth]
  const keyDates  = KEY_DATES[thisMonth] || []
  const [tipIdx, setTipIdx] = useState(0)
  const [stripHover, setStripHover] = useState(false)
  const tip = MARKETING_TIPS[tipIdx % MARKETING_TIPS.length]

  const upcoming = UAE_HOLIDAYS.filter(h => {
    const d = new Date(h.date)
    return d >= today && d <= new Date(today.getFullYear(), today.getMonth() + 2, 0)
  }).slice(0, 3)

  // ── Collapsed strip ────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside
        className="fixed right-0 top-0 h-screen w-10 flex flex-col items-center justify-center z-30 cursor-pointer select-none transition-all duration-200"
        style={{
          backgroundColor: stripHover ? GOLD : NAVY,
          borderLeft: `1px solid ${stripHover ? 'rgba(201,162,39,0.4)' : 'rgba(201,162,39,0.2)'}`,
        }}
        onClick={() => setCollapsed(false)}
        onMouseEnter={() => setStripHover(true)}
        onMouseLeave={() => setStripHover(false)}
        title="Expand Insights"
      >
        {/* Top dot */}
        <div
          className="w-1.5 h-1.5 rounded-full mb-4 transition-colors"
          style={{ backgroundColor: stripHover ? NAVY : GOLD }}
        />

        {/* Vertical label */}
        <div
          className="flex items-center justify-center"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          <span
            className="text-[11px] font-bold uppercase tracking-[0.2em] transition-colors"
            style={{ color: stripHover ? NAVY : GOLD }}
          >
            Insights
          </span>
        </div>

        {/* Bottom dot */}
        <div
          className="w-1.5 h-1.5 rounded-full mt-4 transition-colors"
          style={{ backgroundColor: stripHover ? NAVY : GOLD }}
        />

        {/* Chevron hint at bottom */}
        <div
          className="absolute bottom-8 transition-colors"
          style={{ color: stripHover ? NAVY : 'rgba(201,162,39,0.5)' }}
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </div>
      </aside>
    )
  }

  // ── Expanded panel ─────────────────────────────────────────────────────────
  return (
    <aside className="fixed right-0 top-0 h-screen w-72 bg-white border-l border-gray-100 flex flex-col z-30">

      {/* Header — Kings navy with gold accent + collapse button */}
      <div
        className="px-5 pt-5 pb-3 flex-shrink-0 flex items-start justify-between"
        style={{ borderBottom: `2px solid ${GOLD}`, backgroundColor: NAVY }}
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: `rgba(201,162,39,0.65)` }}>
            Insights
          </p>
          <p className="text-sm font-semibold mt-0.5 text-white">
            {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {/* Collapse button */}
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse Insights"
          className="mt-0.5 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors"
          style={{ color: 'rgba(201,162,39,0.55)' }}
          onMouseEnter={e => { e.currentTarget.style.color = GOLD; e.currentTarget.style.backgroundColor = 'rgba(201,162,39,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(201,162,39,0.55)'; e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <ChevronRight size={15} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── This month in schools — navy tint ──────────────────────── */}
        <div
          className="rounded-xl p-3.5"
          style={{ backgroundColor: 'rgba(0,45,114,0.06)', border: `1px solid rgba(0,45,114,0.12)` }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <GraduationCap size={13} strokeWidth={2} style={{ color: NAVY }} />
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: NAVY }}>Schools This Month</p>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1.5">{cal.emoji} {cal.activity}</p>
          <ul className="space-y-1">
            {cal.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: NAVY, opacity: 0.75 }}>
                <span className="mt-0.5 flex-shrink-0" style={{ color: GOLD }}>•</span>{t}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Key dates this month ───────────────────────────────────── */}
        {keyDates.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2.5">
              <TrendingUp size={13} strokeWidth={2} style={{ color: GOLD }} />
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Key Dates</p>
            </div>
            <ul className="space-y-2">
              {keyDates.map(({ label, day }) => (
                <li key={label} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-600">{label}</span>
                  <span className="text-xs font-semibold whitespace-nowrap" style={{ color: NAVY }}>{day}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── UAE Holidays ───────────────────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2.5">
            <CalendarDays size={13} strokeWidth={2} style={{ color: CRIMSON }} />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">UAE Holidays</p>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-gray-400">No public holidays in the next 2 months.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map(h => {
                const d = new Date(h.date)
                const isToday   = d.toDateString() === today.toDateString()
                const daysAway  = Math.round((d - today) / 86400000)
                return (
                  <li key={h.date} className="flex items-center gap-2.5">
                    <div
                      className="text-center rounded-lg px-2 py-1 min-w-[38px] flex-shrink-0"
                      style={
                        isToday
                          ? { backgroundColor: CRIMSON, color: '#fff' }
                          : { backgroundColor: 'rgba(0,45,114,0.07)', color: NAVY }
                      }
                    >
                      <p className="text-xs font-bold leading-tight">{d.getDate()}</p>
                      <p className="text-xs leading-tight">{monthName(d.getMonth() + 1)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-700 leading-snug">{h.name}</p>
                      <p className="text-xs text-gray-400">
                        {daysAway === 0 ? 'Today' : `in ${daysAway} day${daysAway !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Dubai school market stats ──────────────────────────────── */}
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2.5">
            <MapPin size={13} strokeWidth={2} style={{ color: NAVY }} />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Dubai Market</p>
          </div>
          <div className="space-y-2">
            {[
              { label: 'British curriculum schools', value: '80+',                   color: NAVY },
              { label: 'Avg. annual fee (British)',   value: 'AED 55k',              color: '#276D43' },
              { label: 'Peak admissions months',      value: 'Aug – Oct',            color: GOLD },
              { label: 'Top search term',             value: '"British school Dubai"',color: '#555' },
              { label: 'Avg. CPC (search)',           value: 'AED 18–30',            color: CRIMSON },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-400 leading-tight">{label}</span>
                <span className="text-xs font-semibold text-right" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Rotating marketing tip — gold tint ─────────────────────── */}
        <div
          className="rounded-xl p-3.5"
          style={{ backgroundColor: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.22)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={13} strokeWidth={2} style={{ color: GOLD }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#7A5E00' }}>Tip</p>
            </div>
            <button
              onClick={() => setTipIdx(i => i + 1)}
              title="Next tip"
              className="transition"
              style={{ color: GOLD }}
              onMouseEnter={e => { e.currentTarget.style.color = '#7A5E00' }}
              onMouseLeave={e => { e.currentTarget.style.color = GOLD }}
            >
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: '#5A4600' }}>
            <span className="mr-1">{tip.icon}</span>{tip.tip}
          </p>
          <div className="flex gap-1 mt-2.5">
            {MARKETING_TIPS.map((_, i) => (
              <div
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  backgroundColor: i === tipIdx % MARKETING_TIPS.length ? GOLD : 'rgba(201,162,39,0.25)',
                  width: i === tipIdx % MARKETING_TIPS.length ? '16px' : '6px',
                }}
              />
            ))}
          </div>
        </div>

      </div>
    </aside>
  )
}
