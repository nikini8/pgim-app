'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function ExaminerDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [examSessions, setExamSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [isSwitched, setIsSwitched] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSwitched(!!sessionStorage.getItem('switched_role'))
    }
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      const { data: e } = await supabase.from('portfolio_entries')
        .select('*, profiles(full_name), courses(name)').order('created_at', { ascending: false })
      setEntries(e || [])
      const { data: s } = await supabase.from('exam_sessions')
        .select('*, courses(name)').order('created_at', { ascending: false })
      setExamSessions(s || [])
    }
    load()
  }, [])

  async function loadCandidates(sessionId: string) {
    setSelectedSession(sessionId)
    const { data } = await supabase.from('exam_registrations')
      .select('*, profiles(full_name, email)')
      .eq('exam_session_id', sessionId)
    setCandidates(data || [])
  }

  async function submitFeedback(entryId: string, feedback: string, status: string) {
    await supabase.from('portfolio_entries').update({ examiner_feedback: feedback, status }).eq('id', entryId)
    const { data: e } = await supabase.from('portfolio_entries')
      .select('*, profiles(full_name), courses(name)').order('created_at', { ascending: false })
    setEntries(e || [])
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function backToAdmin() {
    sessionStorage.removeItem('switched_role')
    sessionStorage.removeItem('original_role')
    router.push('/dashboard/admin')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {profile.full_name}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#c4a020' }}>Examiner</span>
          {isSwitched && (
            <button onClick={backToAdmin} className="text-xs px-3 py-1 rounded border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10">
              ← Back to Admin
            </button>
          )}
          <button onClick={handleSignOut} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">Sign Out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Examiner Dashboard</h2>
        <p className="text-gray-500 mb-8">Review portfolio entries and manage exam sessions</p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: 'Portfolio Entries', value: entries.length, icon: '📁' },
            { label: 'Exam Sessions', value: examSessions.length, icon: '📋' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Exam Sessions & Candidate List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Exam Sessions — Candidate List</h3>
            <p className="text-xs text-gray-400 mt-1">Click a session to view registered candidates</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {/* Sessions */}
            <div>
              {examSessions.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No exam sessions</p>}
              {examSessions.map(session => (
                <div key={session.id} onClick={() => loadCandidates(session.id)}
                  className={`px-6 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${selectedSession === session.id ? 'bg-orange-50 border-l-4' : 'border-l-4 border-l-transparent'}`}
                  style={{ borderLeftColor: selectedSession === session.id ? '#7a1515' : 'transparent' }}>
                  <p className="font-medium text-gray-800 text-sm">{session.name}</p>
                  <p className="text-xs text-gray-400">{session.courses?.name}</p>
                  <p className="text-xs text-gray-400">{session.exam_date ? new Date(session.exam_date).toLocaleDateString() : 'Date TBD'}</p>
                </div>
              ))}
            </div>

            {/* Candidates */}
            <div>
              {!selectedSession && (
                <div className="p-8 text-center text-gray-400">
                  <p className="text-3xl mb-2">👥</p>
                  <p className="text-sm">Select a session to view candidates</p>
                </div>
              )}
              {selectedSession && candidates.length === 0 && (
                <p className="text-center py-8 text-gray-400 text-sm">No candidates registered</p>
              )}
              {candidates.map((reg, i) => (
                <div key={reg.id} className="px-6 py-4 border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: '#7a1515' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{reg.profiles?.full_name}</p>
                      <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                      {reg.result && (
                        <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {reg.result}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Portfolio Entries */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Portfolio Entries to Review</h3>
          {entries.length === 0 && <p className="text-gray-400 text-sm">No entries to review</p>}
          <div className="flex flex-col gap-4">
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onSubmit={submitFeedback} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EntryCard({ entry, onSubmit }: { entry: any, onSubmit: any }) {
  const [feedback, setFeedback] = useState(entry.examiner_feedback || '')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(status: string) {
    setSaving(true)
    await onSubmit(entry.id, feedback, status)
    setSaving(false)
  }

  return (
    <div className="p-4 rounded-lg border border-gray-100" style={{ background: '#f9f5f0' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
              {entry.entry_type || 'Clinical Case'}
            </span>
          </div>
          <h4 className="font-medium text-gray-800">{entry.title}</h4>
          <p className="text-xs text-gray-400">{entry.profiles?.full_name} • {entry.courses?.name} • {entry.competency_domain}</p>
          <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ml-4 ${
          entry.status === 'approved' ? 'bg-green-100 text-green-700' :
          entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'}`}>
          {entry.status}
        </span>
      </div>
      <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
        placeholder="Add feedback for the trainee..." rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
      <div className="flex gap-2">
        <button onClick={() => handleSubmit('approved')} disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium">Approve & Sign Off</button>
        <button onClick={() => handleSubmit('rejected')} disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium">Reject</button>
      </div>
    </div>
  )
}