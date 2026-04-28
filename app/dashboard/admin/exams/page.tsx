'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminExamsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', course_id: '', exam_date: '' })
  const [adding, setAdding] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [scores, setScores] = useState<{ [key: string]: string }>({})
  const [appealResponse, setAppealResponse] = useState<{ [key: string]: string }>({})
  const [activeTab, setActiveTab] = useState<'candidates' | 'results' | 'appeals'>('candidates')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: s } = await supabase.from('exam_sessions').select('*, courses(name)').order('exam_date', { ascending: true })
    setSessions(s || [])
    const { data: c } = await supabase.from('courses').select('*')
    setCourses(c || [])
  }

  async function loadRegistrations(session: any) {
    setSelectedSession(session)
    setActiveTab('candidates')
    const { data: r } = await supabase.from('exam_registrations')
      .select('*, profiles(full_name, email)')
      .eq('exam_session_id', session.id)
    setRegistrations(r || [])
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function addSession() {
    if (!form.name || !form.course_id) return
    setAdding(true)
    await supabase.from('exam_sessions').insert({ ...form, status: 'upcoming' })
    setForm({ name: '', course_id: '', exam_date: '' })
    setAdding(false)
    setShowCreateForm(false)
    showToast('Exam session created successfully')
    loadData()
  }

  async function updateSessionStatus(sessionId: string, status: string) {
    await supabase.from('exam_sessions').update({ status }).eq('id', sessionId)
    loadData()
    if (selectedSession?.id === sessionId) {
      setSelectedSession({ ...selectedSession, status })
    }
    showToast(`Session status updated to ${status}`)
  }

  async function publishResult(regId: string) {
    const score = parseInt(scores[regId] || '0')
    const result = score >= 50 ? 'pass' : 'fail'
    await supabase.from('exam_registrations').update({ result, score }).eq('id', regId)
    if (selectedSession) loadRegistrations(selectedSession)
    showToast(`Result published — ${score}/100 → ${result.toUpperCase()}`)
  }

  async function publishAllResults() {
    const unpublished = registrations.filter(r => !r.result)
    for (const reg of unpublished) {
      const score = parseInt(scores[reg.id] || '0')
      const result = score >= 50 ? 'pass' : 'fail'
      await supabase.from('exam_registrations').update({ result, score }).eq('id', reg.id)
    }
    if (selectedSession) loadRegistrations(selectedSession)
    showToast(`Published results for ${unpublished.length} candidates`)
  }

  async function processAppeal(regId: string, decision: string) {
    const response = appealResponse[regId] || ''
    await supabase.from('exam_registrations').update({
      appeal_status: decision,
      appeal_response: response
    }).eq('id', regId)
    if (selectedSession) loadRegistrations(selectedSession)
    showToast(`Appeal ${decision}`)
    setAppealResponse(prev => ({ ...prev, [regId]: '' }))
  }

  const pendingAppeals = registrations.filter(r => r.appeal_status === 'pending')
  const publishedResults = registrations.filter(r => r.result)
  const unpublishedCount = registrations.filter(r => !r.result).length

  const filteredSessions = statusFilter === 'all'
    ? sessions
    : sessions.filter(s => s.status === statusFilter)

  const statusColors: any = {
    upcoming: 'bg-blue-100 text-blue-700',
    ongoing: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
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

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>Examination Management</h2>
            <p className="text-sm text-gray-500 mt-1">Create sessions, publish results and manage appeals</p>
          </div>
          <button onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#7a1515' }}>
            + Create Exam Session
          </button>
        </div>

        {/* Create Session Form - Collapsible */}
        {showCreateForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Create New Exam Session</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕ Cancel</button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Session Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. MD General Medicine — Part I Theory"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Course *</label>
                <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800">
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Exam Date</label>
                <input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addSession} disabled={adding || !form.name || !form.course_id}
                className="px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: '#7a1515' }}>
                {adding ? 'Creating...' : 'Create Session'}
              </button>
              <button onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Sessions', value: sessions.length, color: '#7a1515' },
            { label: 'Upcoming', value: sessions.filter(s => s.status === 'upcoming').length, color: '#1D4ED8' },
            { label: 'Ongoing', value: sessions.filter(s => s.status === 'ongoing').length, color: '#15803D' },
            { label: 'Completed', value: sessions.filter(s => s.status === 'completed').length, color: '#6B7280' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Sessions List */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Exam Sessions</h3>
              {/* Status Filter */}
              <div className="flex gap-1">
                {['all', 'upcoming', 'ongoing', 'completed'].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className="flex-1 text-xs py-1 rounded-lg font-medium transition capitalize"
                    style={{
                      background: statusFilter === s ? '#7a1515' : '#f3f4f6',
                      color: statusFilter === s ? 'white' : '#374151'
                    }}>
                    {s === 'all' ? 'All' : s}
                  </button>
                ))}
              </div>
            </div>

            {filteredSessions.length === 0 && (
              <p className="text-center py-8 text-gray-400 text-sm">No sessions found</p>
            )}

            {filteredSessions.map(session => (
              <div key={session.id}
                className="border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition"
                style={{
                  borderLeft: selectedSession?.id === session.id ? '4px solid #7a1515' : '4px solid transparent',
                  background: selectedSession?.id === session.id ? '#fdf5f5' : ''
                }}>
                <div className="px-4 py-4" onClick={() => loadRegistrations(session)}>
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-gray-800 text-sm flex-1 mr-2">{session.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusColors[session.status] || 'bg-gray-100 text-gray-600'}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{session.courses?.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    📅 {session.exam_date ? new Date(session.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBD'}
                  </p>
                </div>
                {/* Status Toggle */}
                <div className="px-4 pb-3 flex gap-1" onClick={e => e.stopPropagation()}>
                  {['upcoming', 'ongoing', 'completed'].map(s => (
                    <button key={s} onClick={() => updateSessionStatus(session.id, s)}
                      className="text-xs px-2 py-0.5 rounded font-medium transition capitalize"
                      style={{
                        background: session.status === s ? '#7a1515' : '#f3f4f6',
                        color: session.status === s ? 'white' : '#6b7280'
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right Panel */}
          <div className="col-span-3">
            {!selectedSession ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-medium text-gray-600 mb-1">No session selected</p>
                <p className="text-sm">Select an exam session from the left to view candidates, publish results and manage appeals</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Session Header */}
                <div className="px-6 py-5 border-b border-gray-100" style={{ background: '#fdf5f5' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{selectedSession.name}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {selectedSession.courses?.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        📅 {selectedSession.exam_date ? new Date(selectedSession.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${statusColors[selectedSession.status] || 'bg-gray-100 text-gray-600'}`}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      👥 {registrations.length} Candidates
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                      ✓ {publishedResults.length} Results Published
                    </span>
                    {pendingAppeals.length > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                        ⚠ {pendingAppeals.length} Appeals Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                  {[
                    { key: 'candidates', label: '👥 Candidate List', count: registrations.length },
                    { key: 'results', label: '📊 Publish Results', count: unpublishedCount },
                    { key: 'appeals', label: '📩 Appeals', count: pendingAppeals.length },
                  ].map(tab => (
                    <button key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className="flex-1 px-4 py-3 text-xs font-semibold transition"
                      style={{
                        color: activeTab === tab.key ? '#7a1515' : '#6b7280',
                        borderBottom: activeTab === tab.key ? '2px solid #7a1515' : '2px solid transparent',
                        background: activeTab === tab.key ? '#fdf5f5' : 'white'
                      }}>
                      {tab.label}
                      {tab.count > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-white text-xs" style={{ background: '#7a1515' }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab: Candidate List */}
                {activeTab === 'candidates' && (
                  <div>
                    {registrations.length === 0 ? (
                      <div className="p-10 text-center text-gray-400">
                        <p className="text-3xl mb-2">👥</p>
                        <p className="text-sm">No candidates registered for this session yet</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead style={{ background: '#f3ece8' }}>
                          <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">#</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Candidate</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Email</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Result</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Appeal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {registrations.map((reg, i) => (
                            <tr key={reg.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-6 py-3 text-sm text-gray-500">{i + 1}</td>
                              <td className="px-6 py-3 text-sm font-medium text-gray-800">{reg.profiles?.full_name}</td>
                              <td className="px-6 py-3 text-sm text-gray-500">{reg.profiles?.email}</td>
                              <td className="px-6 py-3">
                                {reg.result ? (
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {reg.score !== undefined && reg.score !== null ? `${reg.score}/100 — ` : ''}{reg.result.toUpperCase()}
                                  </span>
                                ) : (
                                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">Pending</span>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                {reg.appeal_status ? (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.appeal_status === 'pending' ? 'bg-yellow-100 text-yellow-700' : reg.appeal_status === 'upheld' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {reg.appeal_status}
                                  </span>
                                ) : <span className="text-xs text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Tab: Publish Results */}
                {activeTab === 'results' && (
                  <div className="p-6">
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-5 flex items-start gap-2">
                      <span>ℹ️</span>
                      <span>Enter scores out of 100. Pass mark is 50/100. You can publish individually or all at once.</span>
                    </div>
                    {registrations.length === 0 ? (
                      <p className="text-center py-6 text-gray-400 text-sm">No candidates registered</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {registrations.map((reg) => (
                          <div key={reg.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100" style={{ background: '#f9f5f0' }}>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 text-sm">{reg.profiles?.full_name}</p>
                              <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                            </div>
                            {reg.result ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-700">{reg.score}/100</span>
                                <span className={`text-xs px-3 py-1 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {reg.result.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-400">✓ Published</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number" min="0" max="100"
                                  value={scores[reg.id] || ''}
                                  onChange={e => setScores(prev => ({ ...prev, [reg.id]: e.target.value }))}
                                  placeholder="0–100"
                                  className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 text-center" />
                                <span className="text-xs text-gray-400">/100</span>
                                {scores[reg.id] && (
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${parseInt(scores[reg.id]) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {parseInt(scores[reg.id]) >= 50 ? 'PASS' : 'FAIL'}
                                  </span>
                                )}
                                <button onClick={() => publishResult(reg.id)}
                                  disabled={!scores[reg.id]}
                                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-40"
                                  style={{ background: '#7a1515' }}>
                                  Publish
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                        {unpublishedCount > 0 && (
                          <div className="mt-2 flex justify-end">
                            <button onClick={publishAllResults}
                              className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ background: '#7a1515' }}>
                              Publish All {unpublishedCount} Remaining Results
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Appeals */}
                {activeTab === 'appeals' && (
                  <div className="p-6">
                    {pendingAppeals.length === 0 && registrations.filter(r => r.appeal_status && r.appeal_status !== 'pending').length === 0 ? (
                      <div className="text-center py-10 text-gray-400">
                        <p className="text-4xl mb-3">✅</p>
                        <p className="text-sm">No appeals for this session</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {pendingAppeals.map(reg => (
                          <div key={reg.id} className="p-5 rounded-xl border-2 border-amber-200" style={{ background: '#fef9ec' }}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-bold text-gray-800">{reg.profiles?.full_name}</p>
                                <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  Original: {reg.result?.toUpperCase()} {reg.score !== null && reg.score !== undefined ? `(${reg.score}/100)` : ''}
                                </span>
                              </div>
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">⚠ Pending</span>
                            </div>
                            <div className="bg-white rounded-lg p-3 mb-4 border border-amber-100">
                              <p className="text-xs font-semibold text-gray-500 mb-1">Appeal Statement from Candidate:</p>
                              <p className="text-sm text-gray-700 italic">"{reg.appeal_text || 'No statement provided'}"</p>
                            </div>
                            <div className="mb-3">
                              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Official Response</label>
                              <textarea
                                value={appealResponse[reg.id] || ''}
                                onChange={e => setAppealResponse(prev => ({ ...prev, [reg.id]: e.target.value }))}
                                placeholder="Write your official response..."
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800" rows={3} />
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => processAppeal(reg.id, 'upheld')}
                                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold">
                                ✓ Uphold Appeal
                              </button>
                              <button onClick={() => processAppeal(reg.id, 'rejected')}
                                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">
                                ✗ Reject Appeal
                              </button>
                            </div>
                          </div>
                        ))}

                        {registrations.filter(r => r.appeal_status && r.appeal_status !== 'pending').length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resolved Appeals</p>
                            {registrations.filter(r => r.appeal_status && r.appeal_status !== 'pending').map(reg => (
                              <div key={reg.id} className={`p-4 rounded-xl mb-2 border ${reg.appeal_status === 'upheld' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800">{reg.profiles?.full_name}</p>
                                    {reg.appeal_response && <p className="text-xs text-gray-500 mt-1">{reg.appeal_response}</p>}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.appeal_status === 'upheld' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {reg.appeal_status === 'upheld' ? 'Upheld ✓' : 'Rejected ✗'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}