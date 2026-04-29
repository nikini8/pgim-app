'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [showRoleSwitch, setShowRoleSwitch] = useState(false)
  const [stats, setStats] = useState({ courses: 0, applications: 0, exams: 0, portfolios: 0 })
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'admin') { router.push('/login'); return }
      setProfile(p)
      const [{ count: c1 }, { count: c2 }, { count: c3 }, { count: c4 }] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('applications').select('*', { count: 'exact', head: true }),
        supabase.from('exam_sessions').select('*', { count: 'exact', head: true }),
        supabase.from('portfolio_entries').select('*', { count: 'exact', head: true }),
      ])
      setStats({ courses: c1 || 0, applications: c2 || 0, exams: c3 || 0, portfolios: c4 || 0 })
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function switchRole(role: string) {
    sessionStorage.setItem('switched_role', role)
    sessionStorage.setItem('original_role', 'admin')
    if (role === 'examiner') router.push('/dashboard/examiner')
    else if (role === 'trainee') router.push('/dashboard/trainee')
    setShowRoleSwitch(false)
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {/* Role Switch Modal */}
      {showRoleSwitch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2" style={{ color: '#7a1515' }}>Switch Role View</h3>
            <p className="text-sm text-gray-500 mb-6">View the system from another role's perspective. You can switch back anytime.</p>
            <div className="flex flex-col gap-3 mb-6">
              {[
                { role: 'examiner', label: 'Examiner / Supervisor', icon: '📋', desc: 'Portfolio review, exam candidate access' },
                { role: 'trainee', label: 'Trainee / Candidate', icon: '🎓', desc: 'Course registration, logbook, exam portal' },
              ].map(r => (
                <button key={r.role} onClick={() => switchRole(r.role)}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-red-800 text-left transition">
                  <span className="text-3xl">{r.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{r.label}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowRoleSwitch(false)}
              className="w-full py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
              Cancel
            </button>
          </div>
        </div>
      )}

      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo-user-transparent-v1.png" alt="PGIM" width={45} height={45} className="rounded-full object-cover" />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {profile.full_name}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#c4a020' }}>Admin</span>
          <button onClick={() => setShowRoleSwitch(true)} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">⇄ Switch Role</button>
          <button onClick={handleSignOut} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">Sign Out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Admin Dashboard</h2>
        <p className="text-gray-500 mb-8">Manage courses, registrations, exams and reports</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Courses', value: stats.courses, icon: '📚' },
            { label: 'Applications', value: stats.applications, icon: '📝' },
            { label: 'Exam Sessions', value: stats.exams, icon: '📋' },
            { label: 'Portfolio Entries', value: stats.portfolios, icon: '📁' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {[
    { title: 'Manage Courses', desc: 'View admitted students, open/close registration', href: '/dashboard/admin/courses', icon: '📚' },
    { title: 'Applications', desc: 'View and manage candidate applications', href: '/dashboard/admin/applications', icon: '📝' },
    { title: 'Exam Sessions', desc: 'Create exams, publish results, process appeals', href: '/dashboard/admin/exams', icon: '📋' },
    { title: 'Portfolio Completion', desc: 'Monitor portfolio submissions across candidates', href: '/dashboard/admin/portfolio', icon: '📁' },
    { title: 'Reports & Analytics', desc: 'Enrolment, pass rates, portfolio completion', href: '/dashboard/admin/reports', icon: '📊' },
    { title: 'Audit Log', desc: 'View system activity and user action history', href: '/dashboard/admin/audit', icon: '🔍' },
    { title: 'Candidate Enrolment', desc: 'Create and manage candidate accounts', href: '/dashboard/admin/candidates', icon: '👤' },
  ].map(card => (
    <button key={card.title}
      onClick={() => router.push(card.href)}
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition flex items-start gap-4">
      <div className="text-3xl">{card.icon}</div>
      <div>
        <h3 className="font-semibold text-gray-800">{card.title}</h3>
        <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
      </div>
    </button>
  ))}
</div>
      </div>
    </div>
  )
}