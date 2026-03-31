import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { signIn }              = useAuth()
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #001B4E 0%, #002D72 55%, #003A8F 100%)' }}
    >
      {/* Decorative gold lines */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, #C9A227 0, #C9A227 1px, transparent 0, transparent 50%)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Gold top bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: '#C9A227' }} />

        <div className="p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
              style={{ backgroundColor: '#002D72' }}
            >
              <span
                className="text-2xl font-bold font-display"
                style={{ color: '#C9A227' }}
              >
                K
              </span>
            </div>
            <h1
              className="text-2xl font-bold font-display"
              style={{ color: '#002D72' }}
            >
              KingsIQ
            </h1>
            <p className="text-gray-500 text-sm mt-1">Digital Marketing Intelligence Platform</p>
            <p className="text-xs mt-0.5" style={{ color: '#C9A227' }}>Kings' Education Dubai</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#002D72' }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm transition-all"
                placeholder="you@kings-edu.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#002D72' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ backgroundColor: '#C9A227', color: '#002D72' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#B8921F' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#C9A227' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Kings' Education · Dubai · Confidential
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
