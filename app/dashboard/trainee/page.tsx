'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function TraineeDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
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
      const { data: c } = await supabase.from('courses').select('*').eq('registration_open', true)
      setCourses(c || [])
      const { data: a } = await supabase.from('applications').select('*, courses(id, name)').eq('candidate_id', user.id)
      setMyApplications(a || [])
    }
    load()
  }, [])

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

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
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
        <p className="text-gray-500 mb-8">Welcome, {profile.full_name}. Manage your registrations, portfolio and exams.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Enrolled Courses', value: myApplications.filter(a => a.status === 'approved').length, icon: '🎓' },
            { label: 'Applications', value: myApplications.length, icon: '📝' },
            { label: 'Available Courses', value: courses.length, icon: '📚' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 4 Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Course Registration */}
          <button onClick={() => router.push('/dashboard/trainee/courses')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#fdf5f5' }}>📚</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Course Registration</h3>
                <p className="text-sm text-gray-500 mt-1">Browse and apply for available postgraduate courses</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">{courses.length} courses open</span>
            </div>
          </button>

          {/* My Enrolments */}
          <button onClick={() => router.push('/dashboard/trainee/courses?tab=enrolled')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#f0fdf4' }}>🎓</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">My Enrolments</h3>
                <p className="text-sm text-gray-500 mt-1">View enrolled courses and download admission cards</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                {myApplications.filter(a => a.status === 'approved').length} enrolled
              </span>
            </div>
          </button>

          {/* My e-Portfolio */}
          <button onClick={() => router.push('/dashboard/trainee/portfolio')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#faf5ff' }}>📁</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">My e-Portfolio</h3>
                <p className="text-sm text-gray-500 mt-1">Submit and track logbook entries per course</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">Cases</span>
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">Procedures</span>
              </div>
            </div>
          </button>

          {/* Examinations */}
          <button onClick={() => router.push('/dashboard/trainee/exams')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#eff6ff' }}>📋</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Examinations</h3>
                <p className="text-sm text-gray-500 mt-1">Register for exams, view results, submit appeals</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Register</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Results</span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}