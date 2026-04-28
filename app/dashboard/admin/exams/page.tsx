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
  const [appealResponse, setAppealResponse] = useState<{ [key: string]: string }>({})
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

  async function publishResult(regId: string, result: string) {
    await supabase.from('exam_registrations').update({ result }).eq('id', regId)
    if (selectedSession) loadRegistrations(selectedSession)
    showToast(`Result published: ${result}`)
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

      <div className="max-w-6xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-6" style={{ color: '#7a1515' }}>Examination Management</h2>

        {/* Create Session */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Create New Exam Session</h3>
          <div className="flex gap-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Session name e.g. MD General Medicine Part I"
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
              {adding ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {/* Sessions List */}
          <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Exam Sessions</h3>
              <p className="text-xs text-gray-500 mt-1">Click to manage candidates & results</p>
            </div>
            {sessions.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No sessions yet</p>}
            {sessions.map(session => (
              <div key={session.id} onClick={() => loadRegistrations(session)}
                className="px-6 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition"
                style={{ borderLeft: selectedSession?.id === session.id ? '4px solid #7a1515' : '4px solid transparent', background: selectedSession?.id === session.id ? '#fdf5f5' : '' }}>
                <p className="font-medium text-gray-800 text-sm">{session.name}</p>
                <p className="text-xs text-gray-500">{session.courses?.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {session.exam_date ? new Date(session.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                </p>
              </div>
            ))}
          </div>

          {/* Candidates & Results */}
          <div className="col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {selectedSession ? `Candidates — ${selectedSession.name}` : 'Select a session'}
              </h3>
            </div>

            {!selectedSession && (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm">Select an exam session to view candidates and manage results</p>
              </div>
            )}

            {selectedSession && registrations.length === 0 && (
              <div className="p-8 text-center text-gray-400">
                <p className="text-3xl mb-2">👥</p>
                <p className="text-sm">No candidates registered for this session</p>
              </div>
            )}

            {registrations.map((reg: any, i: number) => (
              <div key={reg.id} className="px-6 py-5 border-b border-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-800">{reg.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                    <div className="flex gap-2 mt-2">
                      {reg.result ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          Result: {reg.result}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">Result not published</span>
                      )}
                      {reg.appeal_status && (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                          Appeal: {reg.appeal_status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Publish Result Buttons */}
                  {!reg.result && (
                    <div className="flex gap-2">
                      <button onClick={() => publishResult(reg.id, 'pass')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium">
                        ✓ Pass
                      </button>
                      <button onClick={() => publishResult(reg.id, 'fail')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium">
                        ✗ Fail
                      </button>
                    </div>
                  )}
                </div>

                {/* Appeal Processing */}
                {reg.appeal_status === 'pending' && (
                  <div className="mt-3 p-4 rounded-lg" style={{ background: '#fef9ec' }}>
                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Appeal Pending Review</p>
                    {reg.appeal_text && (
                      <p className="text-xs text-gray-600 mb-3 italic">"{reg.appeal_text}"</p>
                    )}
                    <textarea
                      value={appealResponse[reg.id] || ''}
                      onChange={e => setAppealResponse(prev => ({ ...prev, [reg.id]: e.target.value }))}
                      placeholder="Write your response to this appeal..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 mb-2" rows={2} />
                    <div className="flex gap-2">
                      <button onClick={() => processAppeal(reg.id, 'upheld')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-medium">
                        Uphold Appeal
                      </button>
                      <button onClick={() => processAppeal(reg.id, 'rejected')}
                        className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white font-medium">
                        Reject Appeal
                      </button>
                    </div>
                  </div>
                )}

                {reg.appeal_status && reg.appeal_status !== 'pending' && (
                  <div className="mt-2 p-3 rounded-lg bg-gray-50">
                    <p className="text-xs text-gray-600">
                      Appeal {reg.appeal_status} — {reg.appeal_response || 'No response recorded'}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}