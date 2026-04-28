'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function ExaminerDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [examSessions, setExamSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<any[]>([])
  const [isSwitched, setIsSwitched] = useState(false)
  const [activeTab, setActiveTab] = useState<'portfolio' | 'exams'>('portfolio')
  const [filterStatus, setFilterStatus] = useState<string>('all')
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
      loadEntries()
      const { data: s } = await supabase.from('exam_sessions')
        .select('*, courses(name)').order('created_at', { ascending: false })
      setExamSessions(s || [])
    }
    load()
  }, [])

  async function loadEntries() {
    const { data: e } = await supabase.from('portfolio_entries')
      .select('*, profiles(full_name, email), courses(name)')
      .order('created_at', { ascending: false })
    setEntries(e || [])
  }

  async function loadCandidates(sessionId: string) {
    setSelectedSession(sessionId)
    const { data } = await supabase.from('exam_registrations')
      .select('*, profiles(full_name, email)')
      .eq('exam_session_id', sessionId)
    setCandidates(data || [])
  }

  async function submitFeedback(entryId: string, feedback: string, grade: string, status: string) {
    await supabase.from('portfolio_entries').update({
      examiner_feedback: feedback,
      grade,
      status
    }).eq('id', entryId)
    loadEntries()
  }

  async function handleSignOut() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('switched_role')
      sessionStorage.removeItem('original_role')
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  function backToAdmin() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('switched_role')
      sessionStorage.removeItem('original_role')
    }
    router.push('/dashboard/admin')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  const filteredEntries = filterStatus === 'all'
    ? entries
    : entries.filter(e => e.status === filterStatus)

  const pendingCount = entries.filter(e => e.status === 'submitted').length

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
        <p className="text-gray-500 mb-6">Review portfolio entries and access exam candidate lists</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Entries', value: entries.length, icon: '📁' },
            { label: 'Pending Review', value: pendingCount, icon: '⏳' },
            { label: 'Approved', value: entries.filter(e => e.status === 'approved').length, icon: '✅' },
            { label: 'Exam Sessions', value: examSessions.length, icon: '📋' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'portfolio', label: '📁 Portfolio Review', count: pendingCount },
            { key: 'exams', label: '📋 Exam Candidate Lists', count: 0 },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              style={{
                background: activeTab === tab.key ? '#7a1515' : 'white',
                color: activeTab === tab.key ? 'white' : '#374151',
                border: '1px solid #e5e7eb'
              }}>
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs text-white" style={{ background: '#c4a020' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Portfolio Review Tab */}
        {activeTab === 'portfolio' && (
          <div>
            {/* Filter */}
            <div className="flex gap-2 mb-4">
              {[
                { key: 'all', label: 'All' },
                { key: 'submitted', label: 'Pending Review' },
                { key: 'approved', label: 'Approved' },
                { key: 'rejected', label: 'Rejected' },
              ].map(f => (
                <button key={f.key} onClick={() => setFilterStatus(f.key)}
                  className="text-xs px-4 py-1.5 rounded-full font-medium transition"
                  style={{
                    background: filterStatus === f.key ? '#7a1515' : 'white',
                    color: filterStatus === f.key ? 'white' : '#6b7280',
                    border: '1px solid #e5e7eb'
                  }}>
                  {f.label} ({f.key === 'all' ? entries.length : entries.filter(e => e.status === f.key).length})
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              {filteredEntries.length === 0 && (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
                  No entries to show
                </div>
              )}
              {filteredEntries.map(entry => (
                <EntryCard key={entry.id} entry={entry} onSubmit={submitFeedback} />
              ))}
            </div>
          </div>
        )}

        {/* Exam Sessions Tab */}
        {activeTab === 'exams' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-100" style={{ minHeight: 400 }}>
              <div>
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-sm">Exam Sessions</h3>
                  <p className="text-xs text-gray-400 mt-1">Click to view candidate list</p>
                </div>
                {examSessions.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No exam sessions</p>}
                {examSessions.map(session => (
                  <div key={session.id} onClick={() => loadCandidates(session.id)}
                    className="px-6 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition"
                    style={{
                      borderLeft: selectedSession === session.id ? '4px solid #7a1515' : '4px solid transparent',
                      background: selectedSession === session.id ? '#fdf5f5' : ''
                    }}>
                    <p className="font-medium text-gray-800 text-sm">{session.name}</p>
                    <p className="text-xs text-gray-500">{session.courses?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {session.exam_date ? new Date(session.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800 text-sm">
                    {selectedSession ? `Registered Candidates (${candidates.length})` : 'Select a session'}
                  </h3>
                </div>
                {!selectedSession && (
                  <div className="p-8 text-center text-gray-400">
                    <p className="text-3xl mb-2">👥</p>
                    <p className="text-sm">Select an exam session to view the candidate list</p>
                  </div>
                )}
                {selectedSession && candidates.length === 0 && (
                  <p className="text-center py-8 text-gray-400 text-sm">No candidates registered</p>
                )}
                {candidates.map((reg, i) => (
                  <div key={reg.id} className="px-6 py-4 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#7a1515' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">{reg.profiles?.full_name}</p>
                        <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                      </div>
                      {reg.result ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {reg.score !== null && reg.score !== undefined ? `${reg.score}/100 — ` : ''}{reg.result.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Pending</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EntryCard({ entry, onSubmit }: { entry: any, onSubmit: any }) {
  const [feedback, setFeedback] = useState(entry.examiner_feedback || '')
  const [grade, setGrade] = useState(entry.grade || '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(entry.status === 'submitted')

  const grades = ['Excellent', 'Good', 'Satisfactory', 'Unsatisfactory']

  async function handleSubmit(status: string) {
    if (!feedback) return
    setSaving(true)
    await onSubmit(entry.id, feedback, grade, status)
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Entry Header - always visible */}
      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                {entry.entry_type || 'Clinical Case'}
              </span>
              <span className="text-xs text-gray-400">{entry.courses?.name}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">{entry.competency_domain}</span>
            </div>
            <h4 className="font-semibold text-gray-800">{entry.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              Submitted by: <span className="font-medium">{entry.profiles?.full_name}</span>
              {entry.profiles?.email && ` (${entry.profiles.email})`}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {entry.grade && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                {entry.grade}
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              entry.status === 'approved' ? 'bg-green-100 text-green-700' :
              entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'}`}>
              {entry.status === 'submitted' ? 'Pending Review' : entry.status}
            </span>
            <span className="text-gray-400 text-sm">{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Entry Details */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: '#f9f5f0' }}>
            <h5 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Entry Description</h5>
            <p className="text-sm text-gray-700 leading-relaxed">{entry.description || 'No description provided'}</p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="p-2 bg-white rounded-lg">
                <p className="text-xs text-gray-400">Entry Type</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{entry.entry_type || 'Clinical Case'}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <p className="text-xs text-gray-400">Competency Domain</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{entry.competency_domain}</p>
              </div>
              <div className="p-2 bg-white rounded-lg">
                <p className="text-xs text-gray-400">Course</p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{entry.courses?.name}</p>
              </div>
            </div>
          </div>

          {/* Previous Feedback */}
          {entry.examiner_feedback && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: '#f3ece8' }}>
              <p className="text-xs font-semibold" style={{ color: '#7a1515' }}>Previous Feedback:</p>
              <p className="text-sm text-gray-700 mt-1">{entry.examiner_feedback}</p>
            </div>
          )}

          {/* Review Form */}
          <div className="mt-4">
            <div className="mb-3">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Grade</label>
              <div className="flex gap-2 mt-1.5">
                {grades.map(g => (
                  <button key={g} onClick={() => setGrade(g)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium transition"
                    style={{
                      background: grade === g ? '#7a1515' : 'white',
                      color: grade === g ? 'white' : '#374151',
                      borderColor: grade === g ? '#7a1515' : '#d1d5db'
                    }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Feedback / Comments <span className="text-red-500">*</span>
              </label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="Provide detailed feedback on the portfolio entry, including strengths, areas for improvement, and recommendations..."
                rows={4}
                className="mt-1.5 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleSubmit('approved')}
                disabled={saving || !feedback}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#15803D' }}>
                ✓ Approve & Sign Off
              </button>
              <button onClick={() => handleSubmit('rejected')}
                disabled={saving || !feedback}
                className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#DC2626' }}>
                ✗ Reject Entry
              </button>
              <button onClick={() => setExpanded(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                Collapse
              </button>
            </div>
            {!feedback && (
              <p className="text-xs text-red-500 mt-2">* Feedback is required before approving or rejecting</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}