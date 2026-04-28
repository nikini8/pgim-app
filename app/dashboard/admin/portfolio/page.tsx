'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AdminPortfolioPage() {
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: p } = await supabase.from('portfolio_entries')
      .select('*, profiles(full_name, email), courses(name)')
      .order('created_at', { ascending: false })
    setPortfolios(p || [])
    const { data: c } = await supabase.from('courses').select('*')
    setCourses(c || [])
    setLoading(false)
  }

  const filtered = selectedCourse === 'all'
    ? portfolios
    : portfolios.filter(p => p.course_id === selectedCourse)

  const stats = {
    total: filtered.length,
    approved: filtered.filter(p => p.status === 'approved').length,
    pending: filtered.filter(p => p.status === 'submitted').length,
    rejected: filtered.filter(p => p.status === 'rejected').length,
  }

  function exportCSV() {
    const rows = filtered.map(p =>
      `${p.profiles?.full_name},${p.profiles?.email},${p.courses?.name},${p.title},${p.entry_type || 'Clinical Case'},${p.competency_domain},${p.status}`)
    const csv = ['Candidate,Email,Course,Title,Type,Domain,Status', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'portfolio-completion.csv'; a.click()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>Portfolio Completion</h2>
            <p className="text-sm text-gray-500 mt-1">Monitor portfolio submissions across all candidates</p>
          </div>
          <button onClick={exportCSV} className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
            Export CSV
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Entries', value: stats.total, color: '#7a1515' },
            { label: 'Approved', value: stats.approved, color: '#15803D' },
            { label: 'Pending Review', value: stats.pending, color: '#B45309' },
            { label: 'Rejected', value: stats.rejected, color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-600 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Course Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setSelectedCourse('all')}
            className="text-xs px-4 py-2 rounded-full font-medium transition"
            style={{ background: selectedCourse === 'all' ? '#7a1515' : 'white', color: selectedCourse === 'all' ? 'white' : '#4b5563', border: '1px solid #e5e7eb' }}>
            All Courses ({portfolios.length})
          </button>
          {courses.map(course => (
            <button key={course.id} onClick={() => setSelectedCourse(course.id)}
              className="text-xs px-4 py-2 rounded-full font-medium transition"
              style={{ background: selectedCourse === course.id ? '#7a1515' : 'white', color: selectedCourse === course.id ? 'white' : '#4b5563', border: '1px solid #e5e7eb' }}>
              {course.name} ({portfolios.filter(p => p.course_id === course.id).length})
            </button>
          ))}
        </div>

        {/* Portfolio Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead style={{ background: '#f3ece8' }}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Candidate</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Course</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Entry Title</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Domain</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any, i: number) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-gray-800">{p.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{p.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{p.courses?.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-800">{p.title}</td>
                  <td className="px-6 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                      {p.entry_type || 'Clinical Case'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-600">{p.competency_domain}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'approved' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-600">{p.examiner_feedback || '—'}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No portfolio entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}