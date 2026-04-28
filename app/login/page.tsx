'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('switched_role')
      sessionStorage.removeItem('original_role')
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      if (profile?.role === 'admin') router.push('/dashboard/admin')
      else if (profile?.role === 'examiner') router.push('/dashboard/examiner')
      else if (profile?.role === 'trainee') router.push('/dashboard/trainee')
      else setError('Role not found. Contact admin.')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #7a1515 0%, #4a0a0a 100%)'}}>
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="PGIM Logo" width={90} height={90} className="mb-4" />
          <h1 className="text-2xl font-bold" style={{color: '#7a1515'}}>PGIM</h1>
          <p className="text-sm text-gray-500">Postgraduate Institute of Medicine</p>
          <p className="text-xs text-gray-400">University of Colombo</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Email Address</label>
            <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none"
            placeholder="you@pgim.lk"
            style={{color: '#1f2937', backgroundColor: 'white'}}
            required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-lg text-white font-semibold text-sm transition"
            style={{background: loading ? '#aaa' : 'linear-gradient(135deg, #7a1515, #c4a020)'}}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">
          PGIM Information Management System © 2026
        </p>
      </div>
    </div>
  )
}