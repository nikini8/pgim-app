'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function TraineeDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
  const [applying, setApplying] = useState(false)
  const [isSwitched, setIsSwitched] = useState(false)
  const [toast, setToast] = useState('')
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
      const { data: c } = await supabase.from('courses').select('*').eq('registration_open', true)
      setCourses(c || [])
      const { data: a } = await supabase.from('applications').select('*, courses(name)').eq('candidate_id', user.id)
      setMyApplications(a || [])
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function applyToCourse(courseId: string) {
    if (!profile) return
    setApplying(true)
    await supabase.from('applications').insert({
      candidate_id: profile.id,
      course_id: courseId,
      status: 'pending',
      payment_status: 'unpaid'
    })
    const { data: a } = await supabase.from('applications').select('*, courses(name)').eq('candidate_id', profile.id)
    setMyApplications(a || [])
    setApplying(false)
    showToast('Application submitted successfully!')
  }

  async function mockPayment(appId: string, courseName: string) {
    await supabase.from('applications').update({ payment_status: 'paid', status: 'approved' }).eq('id', appId)
    const { data: a } = await supabase.from('applications').select('*, courses(name)').eq('candidate_id', profile.id)
    setMyApplications(a || [])
    showToast('Payment confirmed! Downloading admission card...')
    setTimeout(() => downloadAdmissionCard(courseName), 500)
  }

  function downloadAdmissionCard(courseName: string) {
    const content = `
POSTGRADUATE INSTITUTE OF MEDICINE
University of Colombo
=====================================
ADMISSION CARD
=====================================
Candidate Name : ${profile.full_name}
Email          : ${profile.email}
Course         : ${courseName}
Date Issued    : ${new Date().toLocaleDateString('en-GB')}
Status         : ADMITTED
=====================================
This admission card confirms your enrolment.
Please present this at the examination venue.
=====================================
PGIM Information Management System
    `
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admission-card-${profile.full_name.replace(' ', '-')}.txt`
    a.click()
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

  const appliedCourseIds = myApplications.map(a => a.course_id)

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
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {profile.full_name}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#c4a020' }}>Trainee</span>
          {isSwitched && (
            <button onClick={backToAdmin} className="text-xs px-3 py-1 rounded border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10">
              ← Back to Admin
            </button>
          )}
          <button onClick={handleSignOut} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">Sign Out</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Trainee Dashboard</h2>
        <p className="text-gray-500 mb-8">Manage your registrations, portfolio and exams</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'My Applications', value: myApplications.length, icon: '📝' },
            { label: 'Approved', value: myApplications.filter(a => a.status === 'approved').length, icon: '✅' },
            { label: 'Pending Payment', value: myApplications.filter(a => a.payment_status === 'unpaid').length, icon: '💳' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Available Courses */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Available Courses</h3>
          {courses.length === 0 && <p className="text-gray-400 text-sm">No courses open for registration</p>}
          <div className="flex flex-col gap-3">
            {courses.map(course => (
              <div key={course.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#f9f5f0' }}>
                <div>
                  <p className="font-medium text-gray-800">{course.name}</p>
                  <p className="text-xs text-gray-500">{course.description}</p>
                </div>
                {appliedCourseIds.includes(course.id) ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">Applied</span>
                ) : (
                  <button onClick={() => applyToCourse(course.id)} disabled={applying}
                    className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                    Apply Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* My Applications */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">My Applications</h3>
          {myApplications.length === 0 && <p className="text-gray-400 text-sm">No applications yet</p>}
          <div className="flex flex-col gap-3">
            {myApplications.map(app => (
              <div key={app.id} className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#f9f5f0' }}>
                <div>
                  <p className="font-medium text-gray-800">{app.courses?.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{app.payment_status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {app.payment_status === 'unpaid' && (
                    <button onClick={() => mockPayment(app.id, app.courses?.name)}
                      className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
                      💳 Pay & Get Admission Card
                    </button>
                  )}
                  {app.payment_status === 'paid' && (
                    <button onClick={() => downloadAdmissionCard(app.courses?.name)}
                      className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#15803D' }}>
                      ⬇ Admission Card
                    </button>
                  )}
                  <button onClick={() => router.push('/dashboard/trainee/portfolio')}
                    className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                    Portfolio
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => router.push('/dashboard/trainee/portfolio')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition flex items-start gap-4">
            <div className="text-3xl">📁</div>
            <div><h3 className="font-semibold text-gray-800">My Portfolio</h3><p className="text-sm text-gray-500 mt-1">Add and manage logbook entries</p></div>
          </button>
          <button onClick={() => router.push('/dashboard/trainee/exams')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition flex items-start gap-4">
            <div className="text-3xl">📋</div>
            <div><h3 className="font-semibold text-gray-800">My Exams</h3><p className="text-sm text-gray-500 mt-1">View and register for exams</p></div>
          </button>
        </div>
      </div>
    </div>
  )
}