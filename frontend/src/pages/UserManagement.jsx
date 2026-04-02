import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'

const SUPER_ADMIN_EMAIL = 'productkshitij@gmail.com'

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ email, size = 'md' }) => {
  const initials = email
    ? email.split('@')[0].split(/[._-]/).map((p) => p[0]?.toUpperCase()).slice(0, 2).join('')
    : '?'
  const sz = size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'
  return (
    <div className={`${sz} rounded-full bg-[#002D72] text-white flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials}
    </div>
  )
}

// ─── Role badge ───────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) =>
  role === 'super_admin' ? (
    <span className="inline-block bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-semibold tracking-wide">SUPER ADMIN</span>
  ) : (
    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium">ADMIN</span>
  )

// ─── Generic modal ────────────────────────────────────────────────────────────
const Modal = ({ title, children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  </div>
)

// ─── Main ─────────────────────────────────────────────────────────────────────
const UserManagement = () => {
  const { user: currentUser, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers]             = useState([])   // merged auth + profile data
  const [loading, setLoading]         = useState(true)
  const [errorMsg, setErrorMsg]       = useState('')

  // Add user form
  const [formEmail, setFormEmail]     = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole]       = useState('admin')
  const [showPw, setShowPw]           = useState(false)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  // Modals
  const [deleteModal, setDeleteModal]   = useState(null) // { id, email }
  const [pwModal, setPwModal]           = useState(null) // { id, email }
  const [newPw, setNewPw]               = useState('')
  const [showNewPw, setShowNewPw]       = useState(false)
  const [pwSaving, setPwSaving]         = useState(false)
  const [pwError, setPwError]           = useState('')
  const [pwSuccess, setPwSuccess]       = useState('')

  // Redirect non-admins
  useEffect(() => {
    if (!isSuperAdmin && currentUser) navigate('/dashboard', { replace: true })
  }, [isSuperAdmin, currentUser, navigate])

  useEffect(() => { fetchUsers() }, [])

  // ── Fetch: auth users + profiles joined ──────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      if (!supabaseAdmin) {
        setErrorMsg('Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env')
        setLoading(false)
        return
      }

      // 1. Get all auth users
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
      if (authErr) throw authErr

      // 2. Get all profiles for role info
      const { data: profiles } = await supabase.from('profiles').select('id, role, full_name')
      const profileMap = {}
      ;(profiles || []).forEach((p) => { profileMap[p.id] = p })

      // 3. Merge
      const merged = (authData?.users || []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        role: profileMap[u.id]?.role || 'admin',
        full_name: profileMap[u.id]?.full_name || '',
      }))

      // Sort: super admin first, then by creation date
      merged.sort((a, b) => {
        const aSuper = a.email === SUPER_ADMIN_EMAIL || a.role === 'super_admin'
        const bSuper = b.email === SUPER_ADMIN_EMAIL || b.role === 'super_admin'
        if (aSuper && !bSuper) return -1
        if (!aSuper && bSuper) return 1
        return new Date(a.created_at) - new Date(b.created_at)
      })

      setUsers(merged)
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load users.')
    }
    setLoading(false)
  }

  const superAdminUser = users.find((u) => u.email === SUPER_ADMIN_EMAIL || u.role === 'super_admin')
  const teamMembers    = users.filter((u) => u.id !== superAdminUser?.id)

  // ── Create user ───────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')
    if (!formEmail || !formPassword) return setCreateError('Email and password are required.')
    if (formPassword.length < 6) return setCreateError('Password must be at least 6 characters.')
    setCreating(true)
    try {
      const { data: newUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email: formEmail,
        password: formPassword,
        email_confirm: true,
      })
      if (authErr) throw authErr

      // Upsert profile
      await supabase.from('profiles').upsert({
        id: newUser.user.id,
        email: formEmail,
        full_name: '',
        role: formRole,
      })

      setCreateSuccess(`${formEmail} created successfully.`)
      setFormEmail('')
      setFormPassword('')
      setFormRole('admin')
      fetchUsers()
    } catch (err) {
      setCreateError(err.message || 'Failed to create user.')
    }
    setCreating(false)
  }

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError('')
    setPwSuccess('')
    if (newPw.length < 6) return setPwError('Password must be at least 6 characters.')
    setPwSaving(true)
    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(pwModal.id, { password: newPw })
      if (error) throw error
      setPwSuccess('Password updated successfully.')
      setNewPw('')
      setTimeout(() => { setPwModal(null); setPwSuccess('') }, 1500)
    } catch (err) {
      setPwError(err.message || 'Failed to update password.')
    }
    setPwSaving(false)
  }

  // ── Delete user ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const { id } = deleteModal
    setDeleteModal(null)
    try {
      await supabaseAdmin.auth.admin.deleteUser(id)
      await supabase.from('profiles').delete().eq('id', id)
      fetchUsers()
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete user.')
    }
  }

  // ── Promote ───────────────────────────────────────────────────────────────
  const handlePromote = async (member) => {
    await supabase.from('profiles').upsert({ id: member.id, email: member.email, role: 'super_admin' })
    fetchUsers()
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage access levels and permissions for your team.</p>
        </div>

        {errorMsg && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-6">
          {/* ── Left panel ── */}
          <div className="flex-1 min-w-0">

            {/* Super admin card */}
            {superAdminUser && (
              <div className="bg-white rounded-xl border-2 border-blue-600 p-5 mb-6 flex items-center gap-4">
                <Avatar email={superAdminUser.email} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm truncate">{superAdminUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <RoleBadge role="super_admin" />
                    <span className="text-gray-400 text-xs">• You (Current Session)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Team members */}
            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">
              Team Members ({teamMembers.length})
            </p>

            {loading ? (
              <div className="flex items-center gap-3 py-10 justify-center text-gray-400 text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                Loading users…
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-gray-400 text-sm">No team members added yet.</p>
                <p className="text-gray-400 text-xs mt-1">Use the form on the right to add your first user.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member) => (
                  <div key={member.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                    <Avatar email={member.email} />

                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm font-medium truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <RoleBadge role={member.role} />
                        {member.last_sign_in && (
                          <span className="text-gray-400 text-xs">
                            Last login {new Date(member.last_sign_in).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Change Password */}
                    <button
                      onClick={() => { setPwModal(member); setNewPw(''); setPwError(''); setPwSuccess('') }}
                      className="flex items-center gap-1.5 border border-gray-200 hover:border-blue-400 hover:text-blue-600 text-gray-500 text-xs font-medium px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                      title="Change password"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Password
                    </button>

                    {/* Promote */}
                    <button
                      onClick={() => handlePromote(member)}
                      className="flex items-center gap-1.5 bg-teal-400 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                      title="Promote to Super Admin"
                    >
                      ↑ Promote
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => setDeleteModal(member)}
                      className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50"
                      title="Delete user"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Add user form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-gray-900 font-semibold text-base mb-5">Add New User</h2>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Work Email</label>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Temporary Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw
                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">User will be prompted to change on first login.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assigned Role</label>
                  <div className="space-y-2">
                    {[
                      { value: 'admin', label: 'Admin', desc: 'Full access to dashboard and analytics.' },
                      { value: 'super_admin', label: 'Super Admin', desc: 'Requires existing Super Admin approval.' },
                    ].map(({ value, label, desc }) => (
                      <label
                        key={value}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          formRole === value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input type="radio" name="role" value={value} checked={formRole === value} onChange={() => setFormRole(value)} className="mt-0.5 accent-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{label}</p>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {createError  && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{createError}</p>}
                {createSuccess && <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{createSuccess}</p>}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Creating…</> : 'Create User Profile →'}
                </button>
              </form>
            </div>

            {/* Permissions policy */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Permissions Policy</h3>
              <div className="space-y-2 mt-3">
                <div className="flex items-start gap-2">
                  <span className="text-teal-500 text-xs mt-0.5">✓</span>
                  <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Admin</span> — All modules, no User Management or Refresh.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-xs mt-0.5">✓</span>
                  <p className="text-xs text-gray-500"><span className="font-semibold text-gray-700">Super Admin</span> — Everything + User Management + Refresh.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {pwModal && (
        <Modal title={`Change Password`} onClose={() => setPwModal(null)}>
          <p className="text-xs text-gray-500 mb-4 truncate">For: {pwModal.email}</p>
          <div className="relative mb-3">
            <input
              type={showNewPw ? 'text' : 'password'}
              placeholder="New password (min 6 chars)"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showNewPw
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              }
            </button>
          </div>
          {pwError   && <p className="text-xs text-red-500 mb-3">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-green-600 mb-3">{pwSuccess}</p>}
          <div className="flex gap-3 justify-end">
            <button onClick={() => setPwModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleChangePassword} disabled={pwSaving} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteModal && (
        <Modal title="Remove User?" onClose={() => setDeleteModal(null)}>
          <p className="text-sm text-gray-600 mb-5">
            Permanently delete <span className="font-semibold">{deleteModal.email}</span>? They will lose all access immediately. This cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setDeleteModal(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete User</button>
          </div>
        </Modal>
      )}
    </Layout>
  )
}

export default UserManagement
