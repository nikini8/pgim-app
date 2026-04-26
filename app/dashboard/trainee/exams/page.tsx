'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function TraineeExamsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [examSessions, setExamSessions] = useState<any[]>([])
  const [myRegistrations, setMyRegistrations] = useState<any[]>([])
  const [registering, setRegistering] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: e } = await supabase.from('exam_sessions').select('*, courses(name)').order('created_at', {ascending: false})
      setExamSessions(e || [])
      const { data: r } = await supabase.from('exam_registrations').select('*, exam_sessions(name, courses(name))').eq('candidate_id', user.id)
      setMyRegistrations(r || [])
    }
    load()
  }, [])

  async function registerForExam(examId: string) {
    if (!profile) return
    setRegistering(true)
    await supabase.from('exam_registrations').insert({
      candidate_id: profile.id,
      exam_session_id: examId,
    })
    const { data: r } = await supabase.from('exam_registrations').select('*, exam_sessions(name, courses(name))').eq('candidate_id', profile.id)
    setMyRegistrations(r || [])
    setRegistering(false)
  }

  async function submitAppeal(regId: string) {
    await supabase.from('exam_registrations').update({appeal_status: 'pending'}).eq('id', regId)
    const { data: r } = await supabase.from('exam_registrations').select('*, exam_sessions(name, courses(name))').eq('candidate_id', profile.id)
    setMyRegistrations(r || [])
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  const registeredExamIds = myRegistrations.map(r => r.exam_session_id)

  return (
    <div className="min-h-screen" style={{background:'#f9f5f0'}}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{background:'linear-gradient(135deg, #7a1515, #4a0a0a)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/trainee')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-6" style={{color:'#7a1515'}}>My Exams</h2>

        {/* Available Exams */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Available Exam Sessions</h3>
          {examSessions.length === 0 && <p className="text-gray-400 text-sm">No exam sessions available</p>}
          <div className="flex flex-col gap-3">
            {examSessions.map(exam => (
              <div key={exam.id} className="flex items-center justify-between p-4 rounded-lg" style={{background:'#f9f5f0'}}>
                <div>
                  <p className="font-medium text-gray-800">{exam.name}</p>
                  <p className="text-xs text-gray-500">{exam.courses?.name} • {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString() : 'Date TBD'}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${exam.status === 'upcoming' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{exam.status}</span>
                </div>
                {registeredExamIds.includes(exam.id) ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">Registered</span>
                ) : (
                  <button onClick={() => registerForExam(exam.id)} disabled={registering}
                    className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{background:'#7a1515'}}>
                    Register & Pay
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* My Results */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">My Exam Results</h3>
          {myRegistrations.length === 0 && <p className="text-gray-400 text-sm">No exam registrations yet</p>}
          <div className="flex flex-col gap-3">
            {myRegistrations.map(reg => (
              <div key={reg.id} className="flex items-center justify-between p-4 rounded-lg" style={{background:'#f9f5f0'}}>
                <div>
                  <p className="font-medium text-gray-800">{reg.exam_sessions?.name}</p>
                  <p className="text-xs text-gray-500">{reg.exam_sessions?.courses?.name}</p>
                  {reg.result && (
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : reg.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {reg.result === 'pass' ? '✓ Pass' : reg.result === 'fail' ? '✗ Fail' : 'Result Pending'}
                    </span>
                  )}
                  {reg.appeal_status && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 ml-2">Appeal: {reg.appeal_status}</span>}
                </div>
                <div className="flex gap-2">
                  {reg.result === 'fail' && !reg.appeal_status && (
                    <button onClick={() => submitAppeal(reg.id)}
                      className="text-xs px-3 py-1 rounded border font-medium" style={{borderColor:'#7a1515', color:'#7a1515'}}>
                      Submit Appeal
                    </button>
                  )}
                  {!reg.result && <span className="text-xs text-gray-400">Admission card will be sent</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}