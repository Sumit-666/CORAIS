import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function Field({ label, type = 'text', value, onChange, placeholder, autoFocus, minLength }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-bold text-gray-700">
        {label} <span className="text-indigo-700">*</span>
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoFocus={autoFocus} minLength={minLength} required
        className="border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all w-full"
      />
    </div>
  )
}

function SignInForm({ endpoint, onSuccess, onError, loading, setLoading }) {
  const [form, setForm] = useState({ email: '', password: '' })
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { onError(data.detail || 'Invalid credentials'); return }
      onSuccess(data.user, data.access_token)
    } catch { onError('Network error. Please try again.') }
    finally  { setLoading(false) }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <Field label="Email"    type="email"    value={form.email}    onChange={set('email')}    placeholder="mail@example.com" autoFocus />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
      <button type="submit" disabled={loading}
        className="mt-1 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-base cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </form>
  )
}

function RegisterForm({ onSuccess, onError, loading, setLoading }) {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { onError('Passwords do not match'); return }
    if (form.password.length < 8)       { onError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, username: form.username, password: form.password }) })
      const data = await res.json()
      if (!res.ok) { onError(data.detail || 'Registration failed'); return }
      onSuccess(data.user, data.access_token)
    } catch { onError('Network error. Please try again.') }
    finally  { setLoading(false) }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label="Email"            type="email"    value={form.email}    onChange={set('email')}    placeholder="mail@example.com" autoFocus />
      <Field label="Username"                         value={form.username} onChange={set('username')} placeholder="yourname" minLength={3} />
      <Field label="Password"         type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
      <Field label="Confirm Password" type="password" value={form.confirm}  onChange={set('confirm')}  placeholder="Repeat password" />
      <button type="submit" disabled={loading}
        className="mt-1 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-base cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  )
}

function BootstrapForm({ onSuccess, onError, loading, setLoading }) {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { onError('Passwords do not match'); return }
    if (form.password.length < 8)       { onError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/admin/bootstrap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, username: form.username, password: form.password }) })
      const data = await res.json()
      if (!res.ok) { onError(data.detail || 'Setup failed'); return }
      onSuccess(data.user, data.access_token)
    } catch { onError('Network error. Please try again.') }
    finally  { setLoading(false) }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <Field label="Email"            type="email"    value={form.email}    onChange={set('email')}    placeholder="admin@company.com" autoFocus />
      <Field label="Username"                         value={form.username} onChange={set('username')} placeholder="superadmin" minLength={3} />
      <Field label="Password"         type="password" value={form.password} onChange={set('password')} placeholder="Min. 8 characters" />
      <Field label="Confirm Password" type="password" value={form.confirm}  onChange={set('confirm')}  placeholder="Repeat password" />
      <button type="submit" disabled={loading}
        className="mt-1 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-700 to-indigo-500 text-white font-bold text-base cursor-pointer hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        {loading ? 'Setting up…' : 'Create Superadmin'}
      </button>
    </form>
  )
}

export default function AuthPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()
  const [mode, setMode]       = useState('user')
  const [sub,  setSub]        = useState('signin')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const switchMode = (m) => { setMode(m); setError(''); setSub('signin') }
  const switchSub  = (s) => { setSub(s);  setError('') }
  const onSuccess  = (user, token) => { login(user, token); navigate('/') }
  const formProps  = { onSuccess, onError: setError, loading, setLoading }

  const heading = mode === 'user' && sub === 'register' ? 'Create Account'
    : mode === 'admin' && sub === 'setup'               ? 'First-time Setup'
    : mode === 'admin'                                  ? 'Admin Sign In'
    :                                                     'Sign In'

  const subtext = mode === 'user' && sub === 'register'
    ? 'Fill in the details to create your candidate account.'
    : mode === 'admin' && sub === 'setup'
    ? 'Creates the first superadmin. Disabled once any admin exists.'
    : mode === 'admin'
    ? 'Enter your admin credentials to sign in!'
    : 'Enter your email and password to sign in!'

  return (
    <div className="flex min-h-screen bg-white">

      {/* ── Left: form panel ────────────────────────────────────────────── */}
      <div className="flex flex-col w-[50%] px-16 py-10 bg-white">
        <div className="flex-1 flex flex-col justify-center max-w-[300px] w-full mx-auto py-8">

          {/* Mode pills */}
          <div className="flex bg-gray-100 rounded-full p-1 w-fit gap-0.5 mb-7">
            <button
              onClick={() => switchMode('user')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${mode === 'user' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
              User
            </button>
            <button
              onClick={() => switchMode('admin')}
              className={`px-6 py-2 rounded-full text-sm font-bold transition-all cursor-pointer ${mode === 'admin' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>
              Admin
            </button>
          </div>

          <h1 className="text-2xl font-extrabold text-gray-800 leading-tight">{heading}</h1>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">{subtext}</p>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {mode === 'user'  && sub === 'signin'   && <SignInForm endpoint="/api/auth/login"       {...formProps} />}
          {mode === 'user'  && sub === 'register' && <RegisterForm                                {...formProps} />}
          {mode === 'admin' && sub === 'signin'   && <SignInForm endpoint="/api/auth/admin/login" {...formProps} />}
          {mode === 'admin' && sub === 'setup'    && <BootstrapForm                               {...formProps} />}

          <div className="mt-6 text-sm text-gray-500 text-center">
            {mode === 'user'  && sub === 'signin'   && <span>Not registered yet? <button onClick={() => switchSub('register')} className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none">Create an Account</button></span>}
            {mode === 'user'  && sub === 'register' && <span>Already have an account? <button onClick={() => switchSub('signin')} className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none">Sign In</button></span>}
            {mode === 'admin' && sub === 'signin'   && <span>No admin yet? <button onClick={() => switchSub('setup')} className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none">First-time Setup</button></span>}
            {mode === 'admin' && sub === 'setup'    && <span>Have an account? <button onClick={() => switchSub('signin')} className="text-indigo-700 font-bold hover:underline cursor-pointer bg-transparent border-none">Sign In</button></span>}
          </div>
        </div>

        <footer className="text-xs text-gray-300 text-center pt-6 border-t border-gray-100">
          © 2025 CORAIS · AI Orchestration Brain
        </footer>
      </div>

      {/* ── Right: brand panel ───────────────────────────────────────────── */}
      <div className="flex-1 m-2 max-w-[50%] ml-0 rounded-bl-[200px] flex items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #3b0764 0%, #4318ff 35%, #6d28d9 60%, #a855f7 80%, #ec4899 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 35% 35%, rgba(255,255,255,0.14) 0%, transparent 65%)' }} />
        <div className="text-center text-white px-10 relative z-10">
          <div className="w-28 h-28 rounded-full flex items-center justify-center text-6xl mx-auto mb-7
            bg-white/20 border-2 border-white/25 backdrop-blur-md">
            🧠
          </div>
          <h2 className="text-5xl font-extrabold tracking-tight mb-2">CORAIS</h2>
          <p className="text-base opacity-75 mb-9 tracking-wide">AI Orchestration Brain</p>
          {/* <div className="bg-white/15 border border-white/20 rounded-2xl px-7 py-4 backdrop-blur-sm text-sm opacity-90 max-w-xs mx-auto leading-relaxed">
            Powered by multi-agent LangGraph pipelines with adaptive cost routing
          </div> */}
        </div>
      </div>

    </div>
  )
}
