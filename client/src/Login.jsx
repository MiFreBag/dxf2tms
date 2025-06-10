import { useState } from 'react'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    onLogin(username, password)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={submit} className="bg-white p-6 shadow space-y-4">
        <h1 className="text-xl font-bold">Anmeldung</h1>
        <input
          className="border p-2 w-64"
          placeholder="Benutzer"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          className="border p-2 w-64"
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <button type="submit" className="bg-blue-900 text-white px-4 py-2 w-full">
          Login
        </button>
      </form>
    </div>
  )
}

export default Login
