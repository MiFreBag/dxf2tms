import { useState } from 'react'
import { FileText, X, AlertCircle, Eye, EyeOff, Loader2, Shield } from 'lucide-react'

const API = '/api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const msg = response.status === 401
          ? 'Ungültige Anmeldedaten'
          : `Serverfehler (${response.status}). Versuche es später erneut.`
        setError(msg)
      } else {
        const { access_token } = await response.json()
        localStorage.setItem('token', access_token)
        onLogin(access_token)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Netzwerkfehler. Bitte prüfe deine Verbindung.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.3),transparent_50%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%)] bg-[length:60px_60px] animate-pulse"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-xl animate-bounce"></div>
      <div className="absolute bottom-20 right-20 w-48 h-48 bg-cyan-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
      <div className="absolute top-1/2 left-10 w-24 h-24 bg-indigo-500 rounded-full opacity-30 blur-lg animate-bounce delay-1000"></div>

      <div className="w-full max-w-md relative z-10">
        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl space-y-8"
        >
          {/* Header */}
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <FileText className="w-10 h-10 text-white drop-shadow-lg" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Stadt Zürich DAV</h1>
            <p className="text-blue-200/80 text-lg">DXF2GeoPDF Converter</p>
            <div className="flex items-center justify-center gap-2 mt-2 text-cyan-300/60 text-sm">
              <Shield className="w-4 h-4" />
              <span>Sicher • Schnell • Zuverlässig</span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/20 rounded-2xl blur-sm"></div>
              <div className="relative flex items-center gap-3 bg-red-500/10 backdrop-blur-sm border border-red-400/30 text-red-100 px-4 py-4 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="flex-1">{error}</span>
                <button 
                  type="button" 
                  onClick={() => setError('')} 
                  className="text-red-300 hover:text-red-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-100/90">
                Benutzername
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300 hover:bg-white/15"
                  placeholder="Benutzername eingeben"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  disabled={loading}
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-100/90">
                Passwort
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-4 pr-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-white/50 focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 focus:outline-none transition-all duration-300 hover:bg-white/15"
                  placeholder="Passwort eingeben"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full relative group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group-hover:scale-[1.02] group-active:scale-[0.98]">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Anmelden...</span>
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span>Anmelden</span>
                </>
              )}
            </div>
          </button>

          {/* Demo Credentials */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span className="text-white/70 text-sm">
                Demo: <span className="font-mono font-medium text-cyan-300">admin / admin123</span>
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-white/10">
            <p className="text-white/40 text-xs">
              © {new Date().getFullYear()} Stadt Zürich DAV. Alle Rechte vorbehalten.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}