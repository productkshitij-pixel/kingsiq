import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { supabaseAdmin } from '../lib/supabaseAdmin'

// ─── Avatar initials ────────────────────────────────────────────────────────
const Avatar = ({ email, size = 'md' }) => {
  const initials = email
    ? email
        .split('@')[0]
        .split(/[._-]/)
        .map((p) => p[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : '?'

  const sizeClass = size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm'

  return (
    <div
      className={`${sizeClass} rounded-full bg-[#1a2744] text-white flex items-center justify-center font-semibold flex-shrink-0`}
    >
      {initials}
    </div>
  )
}

// ─── Role badge ──────────────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  if (role === 'super_admin')
    return (
      <span className="inline-block bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-semibold tracking-wide">
        SUPER ADMIN
      </span>
    )
  return (
    <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-medium capitalize">
      ADMIN
    </span>
  )
}

// ─── Confirm modal ───────────────────────────────────────────────────────────
const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full mx-4">
      <p className="text-gray-800 text-sm mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Confirm
        </button>
      </div>
    </div>
  </div>
)

// ─── Main component ──────────────────────────────────────────────────────────
const UserManagement = () => {
  const { profile: currentProfile, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')
  const [confirmModal, setConfirmModal] = useState(null) // { type, targetId, targetEmail }

  // Guard: redirect non super-admins
  useEffect(() => {
    if (currentProfile && !isSuperAdmin) {
      navigate('/dashboard', { replace: true })
    }
  }, [currentProfile, isSuperAdmin, navigate])

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoadingMembers(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    setMembers(data || [])
    setLoadingMembers(false)
  }

  // Split super admin from team members
  const superAdminProfile = members.find((m) => m.role === 'super_admin' || m.email === 'productkshitij@gmail.com')
  const teamMembers = members.filter((m) => m.id !== superAdminProfile?.id)

  // ── Create new user ────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!formEmail || !formPassword) {
      setCreateError('Email and password are required.')
      return
    }
    if (formPassword.length < 6) {
      setCreateError('Password must be at least 6 characters.')
      return
    }

    setCreating(true)

    try {
      if (supabaseAdmin) {
        // Use admin client to create user without affecting current session
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: formEmail,
          password: formPassword,
          email_confirm: true, // skip email confirmation for internal users
        })

        if (authError) throw authError

        // Insert profile record
        const { error: profileError } = await supabase.from('profiles').insert({
          id: newUser.user.id,
          email: formEmail,
          full_name: '',
          role: formRole,
        })

        if (profileError) throw profileError
      } else {
        // Fallback: create profile only (admin must also create user in Supabase dashboard)
        setCreateError(
          'Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file to enable user creation.'
        )
        setCreating(false)
        return
      }

      setCreateSuccess(`User ${formEmail} created successfully.`)
      setFormEmail('')
      setFormPassword('')
      setFormRole('admin')
      fetchMembers()
    } catch (err) {
      setCreateError(err.message || 'Failed to create user.')
    } finally {
      setCreating(false)
    }
  }

  // ── Promote to Super Admin ────────────────────────────────────────────────
  const handlePromote = (member) => {
    setConfirmModal({
      type: 'promote',
      targetId: member.id,
      targetEmail: member.email,
      message: `Promote ${member.email} to Super Admin? They will gain access to User Management and all admin controls.`,
    })
  }

  const confirmPromote = async () => {
    const { targetId } = confirmModal
    setConfirmModal(null)
    await supabase.from('profiles').update({ role: 'super_admin' }).eq('id', targetId)
    fetchMembers()
  }

  // ── Remove user access (delete profile) ───────────────────────────────────
  const handleRemove = (member) => {
    setConfirmModal({
      type: 'remove',
      targetId: member.id,
      targetEmail: member.email,
      message: `Remove ${member.email}'s access? They will no longer be able to log in. This cannot be undone.`,
    })
  }

  const confirmRemove = async () => {
    const { targetId } = confirmModal
    setConfirmModal(null)
    // Delete profile — auth.users cascade will keep auth record; adjust if needed
    await supabase.from('profiles').delete().eq('id', targetId)
    fetchMembers()
  }

  return (
    <Layout>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Manage access levels and permissions for your team.
          </p>
        </div>

        <div className="flex gap-6">
          {/* ── Left panel ── */}
          <div className="flex-1 min-w-0">
            {/* Current super admin */}
            {superAdminProfile && (
              <div className="bg-white rounded-xl border-2 border-blue-600 p-5 mb-6 flex items-center gap-4">
                <Avatar email={superAdminProfile.email} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium text-sm truncate">
                    {superAdminProfile.email}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <RoleBadge role="super_admin" />
                    <span className="text-gray-400 text-xs">• You (Current Session)</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-sm text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0"
                >
                  Account Settings
                </button>
              </div>
            )}

            {/* Team members */}
            <div>
              <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-3">
                Team Members ({teamMembers.length})
              </p>

              {loadingMembers ? (
                <div className="flex items-center gap-3 py-8 justify-center text-gray-400 text-sm">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  Loading members…
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <p className="text-gray-400 text-sm">No team members added yet.</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Use the form on the right to add your first user.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
                    >
                      <Avatar email={member.email} />
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm font-medium truncate">
                          {member.email}
                        </p>
                        <RoleBadge role={member.role} />
                      </div>

                      {/* Promote button */}
                      <button
                        onClick={() => handlePromote(member)}
                        className="flex items-center gap-1.5 bg-teal-400 hover:bg-teal-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                        title="Promote to Super Admin"
                      >
                        ↑ Promote to Super Admin
                      </button>

                      {/* Remove button */}
                      <button
                        onClick={() => handleRemove(member)}
                        className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                        title="Remove user access"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right panel ── */}
          <div className="w-80 flex-shrink-0 space-y-4">
            {/* Add new user form */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
                <h2 className="text-gray-900 font-semibold text-base">Add New User</h2>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Work email */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. name@company.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Temporary password */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Temporary Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    User will be prompted to change password on first login.
                  </p>
                </div>

                {/* Assigned role */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Assigned Role
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formRole === 'admin'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={formRole === 'admin'}
                        onChange={() => setFormRole('admin')}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Admin</p>
                        <p className="text-xs text-gray-500">Full access to dashboard and analytics.</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formRole === 'super_admin'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value="super_admin"
                        checked={formRole === 'super_admin'}
                        onChange={() => setFormRole('super_admin')}
                        className="mt-0.5 accent-blue-600"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Super Admin</p>
                        <p className="text-xs text-gray-500">Requires existing Super Admin approval.</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Feedback */}
                {createError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    {createError}
                  </p>
                )}
                {createSuccess && (
                  <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    {createSuccess}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Creating…
                    </>
                  ) : (
                    'Create User Profile →'
                  )}
                </button>
              </form>
            </div>

            {/* Permissions policy */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Permissions Policy</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Only Super Admins can promote other users. Each workspace is limited to 10 active administrators under your current plan.
              </p>
              <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-teal-500 text-xs mt-0.5">✓</span>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Admin</span> — Dashboard, all modules, Competitors. No User Management or Refresh.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 text-xs mt-0.5">✓</span>
                  <p className="text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">Super Admin</span> — Everything above + User Management + Refresh Button.
                  </p>
                </div>
              </div>
              <button className="mt-3 text-xs text-blue-600 hover:underline">
                View Security Audit Log →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.type === 'promote' ? confirmPromote : confirmRemove}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </Layout>
  )
}

export default UserManagement
