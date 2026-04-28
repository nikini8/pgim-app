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
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [toast, setToast] = useState('')
  const [scores, setScores] = useState<{ [key: string]: string }>({})
  const [appealResponse, setAppealResponse] = useState<{ [key: string]: string }>({})
  const [activeTab, setActiveTab] = useState<'candidates' | 'results' | 'appeals'>('candidates')
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: s } = await supabase.from('exam_sessions').select('*, courses(name)').order('created_at', { ascending: false })
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
    showToast('Exam session created successfully')
    loadData()
  }

  async function publishResult(regId: string) {
    const score = parseInt(scores[regId] || '0')
    const result = score >= 50 ? 'pass' : 'fail'
    await supabase.from('exam_registrations').update({ result, score }).eq('id', regId)
    if (selectedSession) loadRegistrations(selectedSession)
    showToast(`Result published — Score: ${score}/100 → ${result.toUpperCase()}`)
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
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#7a1515' }}>Examination Management</h2>

        {/* Create Session */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Create New Exam Session</h3>
          <div className="flex gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. MD General Medicine — Part I Theory"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800" />
            <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800">
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800" />
            <button onClick={addSession} disabled={adding || !form.name || !form.course_id}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: '#7a1515' }}>
              {adding ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Sessions List */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Exam Sessions</h3>
              <p className="text-xs text-gray-500 mt-1">Click a session to manage it</p>
            </div>
            {sessions.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No sessions yet</p>}
            {sessions.map(session => {
              const regCount = registrations.filter(r => r.exam_session_id === session.id).length
              return (
                <div key={session.id} onClick={() => loadRegistrations(session)}
                  className="px-6 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition"
                  style={{
                    borderLeft: selectedSession?.id === session.id ? '4px solid #7a1515' : '4px solid transparent',
                    background: selectedSession?.id === session.id ? '#fdf5f5' : ''
                  }}>
                  <p className="font-medium text-gray-800 text-sm">{session.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{session.courses?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400">
                      {session.exam_date ? new Date(session.exam_date).toLocaleDateString('en-GB') : 'Date TBD'}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{session.status}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right Panel */}
          <div className="col-span-3">
            {!selectedSession ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm">Select an exam session from the left to manage candidates and results</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Session Header */}
                <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#fdf5f5' }}>
                  <h3 className="font-semibold text-gray-800">{selectedSession.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedSession.courses?.name} •{' '}
                    {selectedSession.exam_date ? new Date(selectedSession.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {registrations.length} Candidates
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      {publishedResults.length} Results Published
                    </span>
                    {pendingAppeals.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                        {pendingAppeals.length} Appeals Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                  {[
                    { key: 'candidates', label: 'Candidate List', count: registrations.length },
                    { key: 'results', label: 'Publish Results', count: unpublishedCount },
                    { key: 'appeals', label: 'Appeals', count: pendingAppeals.length },
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
                      <div className="p-8 text-center text-gray-400">
                        <p className="text-3xl mb-2">👥</p>
                        <p className="text-sm">No candidates registered for this session</p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead style={{ background: '#f3ece8' }}>
                          <tr>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">#</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Candidate</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Email</th>
                            <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Result</th>
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
                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-4">
                      ℹ️ Enter scores out of 100 for each candidate. Pass mark is 50. Click "Publish All Results" to publish at once, or publish individually.
                    </div>
                    {registrations.length === 0 ? (
                      <p className="text-center py-6 text-gray-400 text-sm">No candidates registered</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {registrations.map((reg, i) => (
                          <div key={reg.id} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100" style={{ background: '#f9f5f0' }}>
                            <div className="flex-1">
                              <p className="font-medium text-gray-800 text-sm">{reg.profiles?.full_name}</p>
                              <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                            </div>
                            {reg.result ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-700">{reg.score}/100</span>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {reg.result.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-400">Published</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number" min="0" max="100"
                                    value={scores[reg.id] || ''}
                                    onChange={e => setScores(prev => ({ ...prev, [reg.id]: e.target.value }))}
                                    placeholder="Score"
                                    className="w-20 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-800 text-center" />
                                  <span className="text-xs text-gray-400">/100</span>
                                </div>
                                {scores[reg.id] && (
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${parseInt(scores[reg.id]) >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {parseInt(scores[reg.id]) >= 50 ? 'PASS' : 'FAIL'}
                                  </span>
                                )}
                                <button onClick={() => publishResult(reg.id)}
                                  disabled={!scores[reg.id]}
                                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-50"
                                  style={{ background: '#7a1515' }}>
                                  Publish
                                </button>
                              </div>
                            )}
                          </div>
                        ))}

                        {unpublishedCount > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                            <button onClick={publishAllResults}
                              className="px-6 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#7a1515' }}>
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
                    {pendingAppeals.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        <p className="text-3xl mb-2">✅</p>
                        <p className="text-sm">No pending appeals for this session</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {pendingAppeals.map(reg => (
                          <div key={reg.id} className="p-5 rounded-xl border border-amber-200" style={{ background: '#fef9ec' }}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-semibold text-gray-800">{reg.profiles?.full_name}</p>
                                <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    Original Result: {reg.result?.toUpperCase()} {reg.score !== null && reg.score !== undefined ? `(${reg.score}/100)` : ''}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                                ⚠ Appeal Pending
                              </span>
                            </div>
                            <div className="bg-white rounded-lg p-3 mb-3 border border-amber-100">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Candidate's Appeal Statement:</p>
                              <p className="text-sm text-gray-700 italic">"{reg.appeal_text || 'No statement provided'}"</p>
                            </div>
                            <div className="mb-3">
                              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Your Response</label>
                              <textarea
                                value={appealResponse[reg.id] || ''}
                                onChange={e => setAppealResponse(prev => ({ ...prev, [reg.id]: e.target.value }))}
                                placeholder="Write your official response to this appeal..."
                                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800" rows={3} />
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => processAppeal(reg.id, 'upheld')}
                                className="flex-1 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">
                                ✓ Uphold Appeal
                              </button>
                              <button onClick={() => processAppeal(reg.id, 'rejected')}
                                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium">
                                ✗ Reject Appeal
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Resolved Appeals */}
                    {registrations.filter(r => r.appeal_status && r.appeal_status !== 'pending').length > 0 && (
                      <div className="mt-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Resolved Appeals</p>
                        {registrations.filter(r => r.appeal_status && r.appeal_status !== 'pending').map(reg => (
                          <div key={reg.id} className={`p-4 rounded-lg mb-2 ${reg.appeal_status === 'upheld' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                            <div className="flex justify-between">
                              <p className="text-sm font-medium text-gray-800">{reg.profiles?.full_name}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.appeal_status === 'upheld' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {reg.appeal_status === 'upheld' ? 'Upheld ✓' : 'Rejected ✗'}
                              </span>
                            </div>
                            {reg.appeal_response && <p className="text-xs text-gray-500 mt-1">{reg.appeal_response}</p>}
                          </div>
                        ))}
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