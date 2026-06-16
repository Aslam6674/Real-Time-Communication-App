import { useState } from 'react'
import axios from 'axios'

export default function Auth({ onLogin }) {
  const [tab,   setTab]   = useState('login')
  const [form,  setForm]  = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async () => {
    setError('')
    setLoading(true)
    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'
      const { data } = await axios.post(endpoint, form)
      localStorage.setItem('nexmeet_token', data.token)
      onLogin(data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Is the server running on port 5000?')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,107,255,0.15), transparent)' }}>
      <div className="bg-[#111118] border border-purple-900/30 rounded-2xl p-10 w-96 shadow-2xl"
        style={{ boxShadow: '0 0 40px rgba(124,107,255,0.2)' }}>

        <h1 className="text-3xl font-black text-purple-400 mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>
          NexMeet ✦
        </h1>
        <p className="text-gray-500 text-sm mb-6">Real-time collaboration platform</p>

        <div className="flex bg-[#18181f] rounded-xl p-1 mb-6 gap-1">
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all
                ${tab === t ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              style={{ fontFamily: 'Syne, sans-serif' }}>
              {t === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        {tab === 'register' && (
          <input className="auth-input" placeholder="Full Name" value={form.name}
            onChange={handle('name')} onKeyDown={handleKey} />
        )}
        <input className="auth-input" placeholder="Email address" type="email" value={form.email}
          onChange={handle('email')} onKeyDown={handleKey} />
        <input className="auth-input" placeholder="Password" type="password" value={form.password}
          onChange={handle('password')} onKeyDown={handleKey} />

        {error && (
          <p className="text-red-400 text-xs mb-3 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
            ⚠️ {error}
          </p>
        )}

        <button onClick={submit} disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50
            text-white font-bold py-3 rounded-xl transition-all mt-1
            hover:shadow-lg hover:shadow-purple-900/40 hover:-translate-y-px"
          style={{ fontFamily: 'Syne, sans-serif' }}>
          {loading ? '...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
        </button>

        <p className="text-gray-600 text-xs mt-5 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse inline-block" />
          End-to-end encrypted · AES-256 + DTLS-SRTP via WebRTC
        </p>
      </div>
    </div>
  )
}
