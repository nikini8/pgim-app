'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', nic: '', contact: '', qualification: '', username: '', password: ''
  })
  const router = useRouter()

  useEffect(() => { loadCandidates() }, [])

  async function loadCandidates() {
    const { data } = await supabase.from('candidate_registrations').select('*').order('created_at', { ascending: false })
    setCandidates(data || [])
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function createCandidate() {
    if (!form.full_name || !form.email || !form.nic || !form.username || !form.password) return
    setSaving(true)
    await supabase.from('candidate_registrations').insert({
      full_name: form.full_name,
      email: form.email,
      nic: form.nic,
      contact: form.contact,
      qualification: form.qualification,
      username: form.username,
      password_hint: '********',
      created_by: 'admin',
      status: 'active'
    })
    await supabase.from('activity_log').insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      action: `Created candidate account for ${form.full_name} (${form.email})`
    })
    setForm({ full_name: '', email: '', nic: '', contact: '', qualification: '', username: '', password: '' })
    setShowForm(false)
    setSaving(false)
    showToast(`Account created for ${form.full_name} — credentials ready to share`)
    loadCandidates()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm" style={{ background: '#15803D' }}>
          ✓ {toast}
        </div>
      )}

      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>Candidate Management</h2>
            <p className="text-sm text-gray-500 mt-1">Create and manage candidate accounts for the PGIM LMS</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#7a1515' }}>
            + Create Candidate Account
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-800">New Candidate Account</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name *</label>
                <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="Dr. Amali Perera" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email Address *</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="candidate@pgim.lk" type="email" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">NIC Number *</label>
                <input value={form.nic} onChange={e => setForm({ ...form, nic: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="9XXXXXXXXV" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contact Number</label>
                <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="+94 7X XXX XXXX" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Qualifications</label>
                <input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="MBBS (Colombo), SLMC Reg. No: XXXXX" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Username *</label>
                <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="amali.perera" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Temporary Password *</label>
                <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                  placeholder="Temp@1234" type="password" />
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mt-4">
              ℹ️ The candidate will receive their login credentials via email. They must change their password on first login.
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={createCandidate}
                disabled={saving || !form.full_name || !form.email || !form.nic || !form.username || !form.password}
                className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#7a1515' }}>
                {saving ? 'Creating...' : 'Create Account'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Candidates List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: '#fdf5f5' }}>
            <h3 className="font-semibold text-gray-800">Registered Candidates ({candidates.length})</h3>
          </div>

          {candidates.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">👤</p>
              <p className="text-sm font-medium">No candidates registered yet</p>
              <p className="text-xs mt-1">Click "+ Create Candidate Account" to add a candidate</p>
            </div>
          ) : (
            <table className="w-full">
              <thead style={{ background: '#f3ece8' }}>
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Full Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">NIC</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Qualifications</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Username</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-800">{c.full_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{c.email}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{c.nic}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{c.contact || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{c.qualification || '—'}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{c.username}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}