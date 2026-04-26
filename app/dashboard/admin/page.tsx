'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!data || data.role !== 'admin') { router.push('/login'); return }
      setProfile(data)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center" style={{background:'#f9f5f0'}}><p>Loading...</p></div>

  return (
    <div className="min-h-screen" style={{background:'#f9f5f0'}}>
      {/* Header */}
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{background:'linear-gradient(135deg, #7a1515, #4a0a0a)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div>
            <h1 className="font-bold text-lg">PGIM</h1>
            <p className="text-xs opacity-75">Information Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {profile.full_name}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{background:'#c4a020'}}>Admin</span>
          <button onClick={handleSignOut} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">Sign Out</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{color:'#7a1515'}}>Admin Dashboard</h2>
        <p className="text-gray-500 mb-8">Manage courses, registrations, exams and reports</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {label:'Total Courses', value:'3', icon:'📚'},
            {label:'Registrations', value:'12', icon:'📝'},
            {label:'Exam Sessions', value:'2', icon:'📋'},
            {label:'Active Trainees', value:'8', icon:'👨‍⚕️'},
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{color:'#7a1515'}}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {title:'Manage Courses', desc:'Open/close registration, add courses', href:'/dashboard/admin/courses', icon:'📚'},
            {title:'Applications', desc:'View and manage candidate applications', href:'/dashboard/admin/applications', icon:'📝'},
            {title:'Exam Sessions', desc:'Create and manage exam sessions', href:'/dashboard/admin/exams', icon:'📋'},
            {title:'Reports & Analytics', desc:'View enrolment, pass rates and more', href:'/dashboard/admin/reports', icon:'📊'},
          ].map(card => (
            <button key={card.title} onClick={() => router.push(card.href)}
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