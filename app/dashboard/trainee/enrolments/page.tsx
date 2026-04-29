'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import jsPDF from 'jspdf'

export default function EnrolmentsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [myApplications, setMyApplications] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      const { data: a } = await supabase.from('applications')
        .select('*, courses(id, name)')
        .eq('candidate_id', user.id)
        .eq('status', 'approved')
      setMyApplications(a || [])
    }
    load()
  }, [])

  function downloadCard(app: any) {
    const doc = new jsPDF()
    const ref = 'PGIM-' + app.id?.slice(-6).toUpperCase()
    doc.setDrawColor(122, 21, 21); doc.setLineWidth(2); doc.rect(10, 10, 190, 277)
    doc.setLineWidth(0.5); doc.rect(13, 13, 184, 271)
    doc.setFillColor(122, 21, 21); doc.rect(10, 10, 190, 35, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('POSTGRADUATE INSTITUTE OF MEDICINE', 105, 22, { align: 'center' })
    doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    doc.text('University of Colombo, Sri Lanka', 105, 30, { align: 'center' })
    doc.setFontSize(12); doc.setFont('helvetica', 'bold')
    doc.text('ADMISSION CARD', 105, 40, { align: 'center' })
    doc.setDrawColor(196, 160, 32); doc.setLineWidth(1); doc.line(20, 50, 190, 50)
    doc.setTextColor(122, 21, 21); doc.setFontSize(11)
    doc.text(`Reference No: ${ref}`, 105, 60, { align: 'center' })
    doc.setTextColor(0, 0, 0); doc.setFontSize(10)
    const details = [
      ['Candidate Name', profile.full_name],
      ['Email Address', profile.email],
      ['Course', app.courses?.name],
      ['Date Issued', new Date().toLocaleDateString('en-GB')],
      ['Status', 'ADMITTED'],
    ]
    let y = 75
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100)
      doc.text(label + ':', 25, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0)
      doc.text(value || '', 90, y)
      doc.setDrawColor(220, 220, 220); doc.line(25, y + 3, 185, y + 3)
      y += 15
    })
    doc.setFillColor(220, 252, 231); doc.roundedRect(70, y + 5, 70, 12, 3, 3, 'F')
    doc.setTextColor(21, 128, 61); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('✓ ADMITTED', 105, y + 13, { align: 'center' })
    doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('PGIM Information Management System © 2026', 105, 270, { align: 'center' })
    doc.save(`PGIM-Admission-${ref}.pdf`)
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/trainee')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back</button>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>My Enrolments</h2>
          <p className="text-sm text-gray-500 mt-1">Your enrolled courses and admission cards</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{myApplications.length}</div>
            <div className="text-xs text-gray-600 mt-1">Total Enrolments</div>
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="text-2xl font-bold text-green-700">{myApplications.length}</div>
            <div className="text-xs text-gray-600 mt-1">Admission Cards Available</div>
          </div>
        </div>

        {/* Enrolments List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#fdf5f5' }}>
            <h3 className="font-semibold text-gray-800">Enrolled Courses</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click "Download Admission Card" to get your PDF admission card</p>
          </div>

          {myApplications.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p className="text-4xl mb-3">🎓</p>
              <p className="text-sm font-medium">No enrolments yet</p>
              <p className="text-xs mt-1">Apply for a course to get started</p>
              <button onClick={() => router.push('/dashboard/trainee/courses')}
                className="mt-4 text-sm px-5 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                Browse Courses
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {myApplications.map((app, i) => (
                <div key={app.id} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #15803D, #166534)' }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{app.courses?.name}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Enrolled</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Paid</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => downloadCard(app)}
                    className="text-sm px-5 py-2.5 rounded-lg text-white font-semibold flex items-center gap-2" style={{ background: '#15803D' }}>
                    ⬇ Download Admission Card
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}