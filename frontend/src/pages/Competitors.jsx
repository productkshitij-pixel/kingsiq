import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Camera, Pencil, Plus, Trash2, Globe, Link } from 'lucide-react'

const KHDA_OPTIONS = ['Outstanding', 'Very Good', 'Good', 'Acceptable', 'Weak', 'Very Weak']
const KINGS_SCHOOLS = [
  { name: "Kings' School Dubai",          khda_rating: 'Outstanding' },
  { name: "Kings' School Al Barsha",      khda_rating: 'Outstanding' },
  { name: "Kings' School Nad Al Sheba",   khda_rating: 'Very Good' },
]

const ratingColor = (r) => {
  if (r === 'Outstanding') return 'bg-green-100 text-green-700'
  if (r === 'Very Good')   return 'bg-blue-100 text-blue-700'
  if (r === 'Good')        return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

const extractDomain = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return '' }
}

// ── Generic inline-editable cell ─────────────────────────────────────────────
const EditableCell = ({ value, onSave, placeholder, icon: Icon, iconClass = 'text-gray-400', prefix = '', emptyLabel = 'add', inputClass = 'w-44' }) => {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value || '')

  const commit = () => {
    setEditing(false)
    const clean = draft.trim()
    if (clean !== (value || '')) onSave(clean)
  }

  if (editing) return (
    <input
      autoFocus
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(value || ''); setEditing(false) }
      }}
      className={`border border-blue-400 rounded-md px-2 py-1 text-sm ${inputClass} focus:outline-none focus:ring-2 focus:ring-blue-500`}
      placeholder={placeholder}
    />
  )

  return value ? (
    <button
      onClick={() => { setDraft(value); setEditing(true) }}
      className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-blue-600 group max-w-[180px]"
      title="Click to edit"
    >
      {Icon && <Icon size={13} className={iconClass} strokeWidth={1.8} />}
      <span className="truncate">{prefix}{value}</span>
      <Pencil size={11} className="text-gray-300 group-hover:text-blue-400 ml-0.5 flex-shrink-0" />
    </button>
  ) : (
    <button
      onClick={() => { setDraft(''); setEditing(true) }}
      className="flex items-center gap-1 text-sm text-gray-300 hover:text-blue-500"
    >
      <Plus size={13} />
      <span>{emptyLabel}</span>
    </button>
  )
}

// ── Instagram cell (keeps @ stripping behaviour) ──────────────────────────────
const InstagramCell = ({ value, onSave }) => (
  <EditableCell
    value={value}
    onSave={v => onSave(v.replace(/^@/, ''))}
    placeholder="instagram_handle"
    icon={Camera}
    iconClass="text-pink-500"
    prefix="@"
    emptyLabel="add handle"
    inputClass="w-36"
  />
)

// ─────────────────────────────────────────────────────────────────────────────

const Competitors = () => {
  const [competitors, setCompetitors] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [form, setForm] = useState({
    name: '', website_url: '', khda_rating: '',
    instagram_handle: '', google_ad_domain: '', meta_ad_link: '',
  })
  const [saving, setSaving] = useState(false)
  const [toast,  setToast]  = useState('')

  useEffect(() => { fetchCompetitors() }, [])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const fetchCompetitors = async () => {
    const { data } = await supabase
      .from('competitors').select('*')
      .eq('is_active', true).order('created_at', { ascending: true })
    setCompetitors(data || [])
    setLoading(false)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    // Default google_ad_domain to extracted domain from website_url if blank
    const googleDomain = form.google_ad_domain.trim()
      || extractDomain(form.website_url.trim())
    const { error } = await supabase.from('competitors').insert([{
      name:              form.name.trim(),
      website_url:       form.website_url.trim()  || null,
      khda_rating:       form.khda_rating          || null,
      instagram_handle:  form.instagram_handle.trim().replace(/^@/, '') || null,
      google_ad_domain:  googleDomain              || null,
      meta_ad_link:      form.meta_ad_link.trim()  || null,
    }])
    if (error) showToast('Error: ' + error.message)
    else {
      showToast('Competitor added')
      setForm({ name: '', website_url: '', khda_rating: '', instagram_handle: '', google_ad_domain: '', meta_ad_link: '' })
      setShowForm(false)
      fetchCompetitors()
    }
    setSaving(false)
  }

  const handleRemove = async (id, name) => {
    if (!window.confirm(`Remove "${name}"?`)) return
    await supabase.from('competitors').update({ is_active: false }).eq('id', id)
    showToast(`${name} removed`)
    fetchCompetitors()
  }

  const handleUpdate = async (id, field, value) => {
    await supabase.from('competitors').update({ [field]: value || null }).eq('id', id)
    showToast(`${field.replace(/_/g, ' ')} updated`)
    fetchCompetitors()
  }

  // When website changes in form, auto-fill google_ad_domain if still blank
  const handleWebsiteChange = (url) => {
    setForm(f => ({
      ...f,
      website_url: url,
      google_ad_domain: f.google_ad_domain || extractDomain(url),
    }))
  }

  return (
    <Layout showInsights={false}>
      <div className="p-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Competitor Schools</h1>
            <p className="text-gray-500 mt-1 text-sm">Manage the schools tracked across all KingsIQ modules.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#1a2744] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors flex items-center gap-2"
          >
            <Plus size={15} /> Add Competitor
          </button>
        </div>

        {toast && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
            {toast}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Add New Competitor</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">School Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. GEMS Wellington"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Website URL</label>
                <input
                  value={form.website_url}
                  onChange={e => handleWebsiteChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Instagram Handle</label>
                <input
                  value={form.instagram_handle}
                  onChange={e => setForm({ ...form, instagram_handle: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. gemswellington"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">KHDA Rating</label>
                <select
                  value={form.khda_rating}
                  onChange={e => setForm({ ...form, khda_rating: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select rating</option>
                  {KHDA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Google Ad Domain
                  <span className="ml-1 text-gray-400 font-normal">(auto-filled from website)</span>
                </label>
                <input
                  value={form.google_ad_domain}
                  onChange={e => setForm({ ...form, google_ad_domain: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. gemswellington.ae"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Meta Ad Library Link
                  <span className="ml-1 text-indigo-500 font-normal">* needed for Meta Intelligence</span>
                </label>
                <input
                  value={form.meta_ad_link}
                  onChange={e => setForm({ ...form, meta_ad_link: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="https://www.facebook.com/ads/library/..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="bg-[#1a2744] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-900 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Competitor'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* ── Competitors Table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 text-sm">Tracked Competitors</h2>
            <span className="text-xs text-gray-400">{competitors.length} tracked</span>
          </div>
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
          ) : competitors.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No competitors added yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['School', 'Website', 'Instagram', 'KHDA Rating', 'Google Ad Domain', 'Meta Ad Link', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {competitors.map((comp) => (
                    <tr key={comp.id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 font-medium text-gray-900 text-sm whitespace-nowrap">{comp.name}</td>
                      <td className="px-5 py-4">
                        {comp.website_url
                          ? <a href={comp.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              {comp.website_url.replace(/^https?:\/\/(www\.)?/, '')}
                            </a>
                          : <span className="text-gray-300 text-sm">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <InstagramCell
                          value={comp.instagram_handle || ''}
                          onSave={val => handleUpdate(comp.id, 'instagram_handle', val)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={comp.khda_rating || ''}
                          onChange={e => handleUpdate(comp.id, 'khda_rating', e.target.value)}
                          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        >
                          <option value="">Not set</option>
                          {KHDA_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </td>
                      {/* Google Ad Domain — editable, defaults to website domain */}
                      <td className="px-5 py-4">
                        <EditableCell
                          value={comp.google_ad_domain || extractDomain(comp.website_url || '')}
                          onSave={val => handleUpdate(comp.id, 'google_ad_domain', val)}
                          placeholder="e.g. school.ae"
                          icon={Globe}
                          iconClass="text-blue-400"
                          emptyLabel="add domain"
                          inputClass="w-40"
                        />
                      </td>
                      {/* Meta Ad Link — optional, needed for Meta Intelligence */}
                      <td className="px-5 py-4">
                        <EditableCell
                          value={comp.meta_ad_link || ''}
                          onSave={val => handleUpdate(comp.id, 'meta_ad_link', val)}
                          placeholder="https://facebook.com/ads/library/..."
                          icon={Link}
                          iconClass="text-indigo-400"
                          emptyLabel="add Meta link"
                          inputClass="w-52"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleRemove(comp.id, comp.name)}
                          className="text-red-400 hover:text-red-600 flex items-center gap-1 text-sm"
                          title="Remove"
                        >
                          <Trash2 size={14} strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Kings' Education table ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Kings' Education Schools</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fixed — always tracked</p>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">School</th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">KHDA Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {KINGS_SCHOOLS.map(school => (
                <tr key={school.name}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{school.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${ratingColor(school.khda_rating)}`}>
                      {school.khda_rating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </Layout>
  )
}

export default Competitors
