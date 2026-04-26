'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminExamsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])
  const [form, setForm] = useState({name:'', course_id:'', exam_date:''})
  const [adding, setAdding] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string|null>(null)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: s } = await supabase.from('exam_sessions').select('*, courses(name)').order('created_at', {ascending: false})
    setSessions(s || [])
    const { data: c } = await supabase.from('courses').select('*')
    setCourses(c || [])
  }

  async function loadRegistrations(sessionId: string) {
    setSelectedSession(sessionId)
    const { data: r } = await supabase.from('exam_registrations')
      .select('*, profiles(full_name, email)')
      .eq('exam_session_id', sessionId)
    setRegistrations(r || [])
  }

  async function addSession() {
    if (!form.name || !form.course_id) return
    setAdding(true)
    await supabase.from('exam_sessions').insert({...form, status:'upcoming'})
    setForm({name:'', course_id:'', exam_date:''})
    setAdding(false)
    loadData()
  }

  async function publishResult(regId: string, result: string) {
    await supabase.from('exam_registrations').update({result}).eq('id', regId)
    if (selectedSession) loadRegistrations(selectedSession)
  }

  async function processAppeal(regId: string) {
    await supabase.from('exam_registrations').update({appeal_status:'resolved'}).eq('id', regId)
    if (selectedSession) loadRegistrations(selectedSession)
  }

  return (
    <div className="min-h-screen" style={{background:'#f9f5f0'}}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{background:'linear-gradient(135deg, #7a1515, #4a0a0a)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-6" style={{color:'#7a1515'}}>Exam Sessions</h2>

        {/* Add Session */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Create Exam Session</h3>
          <div className="flex gap-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Session name" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm">
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={form.exam_date} onChange={e => setForm({...form, exam_date: e.target.value})}
              className="border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            <button onClick={addSession} disabled={adding}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium" style={{background:'#7a1515'}}>
              {adding ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sessions List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700">All Sessions</h3></div>
            {sessions.map(session => (
              <div key={session.id} onClick={() => loadRegistrations(session.id)}
                className={`px-6 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${selectedSession === session.id ? 'bg-orange-50' : ''}`}>
                <p className="font-medium text-gray-800 text-sm">{session.name}</p>
                <p className="text-xs text-gray-400">{session.courses?.name}</p>
                <p className="text-xs text-gray-400">{session.exam_date ? new Date(session.exam_date).toLocaleDateString() : 'Date TBD'}</p>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No sessions yet</p>}
          </div>

          {/* Registrations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100"><h3 className="font-semibold text-gray-700">Candidates {selectedSession ? '' : '— select a session'}</h3></div>
            {registrations.map(reg => (
              <div key={reg.id} className="px-6 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{reg.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{reg.profiles?.email}</p>
                    {reg.result && <span className={`text-xs px-2 py-0.5 rounded-full ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{reg.result}</span>}
                    {reg.appeal_status === 'pending' && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 ml-1">Appeal Pending</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    {!reg.result && (
                      <div className="flex gap-1">
                        <button onClick={() => publishResult(reg.id, 'pass')} className="text-xs px-2 py-1 rounded bg-green-600 text-white">Pass</button>
                        <button onClick={() => publishResult(reg.id, 'fail')} className="text-xs px-2 py-1 rounded bg-red-600 text-white">Fail</button>
                      </div>
                    )}
                    {reg.appeal_status === 'pending' && (
                      <button onClick={() => processAppeal(reg.id)} className="text-xs px-2 py-1 rounded text-white" style={{background:'#7a1515'}}>Resolve Appeal</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {selectedSession && registrations.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No candidates registered</p>}
          </div>
        </div>
      </div>
    </div>
  )
}