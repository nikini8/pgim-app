'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [stats, setStats] = useState({ courses: 0, applications: 0, approved: 0, exams: 0, portfolios: 0, passed: 0, failed: 0 })
  const [applications, setApplications] = useState<any[]>([])
  const [examSessions, setExamSessions] = useState<any[]>([])
  const [examRegs, setExamRegs] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [activeReport, setActiveReport] = useState<string>('enrolment')
  const [drillDown, setDrillDown] = useState<any>(null)
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedSession, setSelectedSession] = useState<string>('all')
  const [courses, setCourses] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: coursesData } = await supabase.from('courses').select('*')
    const { data: apps } = await supabase.from('applications').select('*, profiles(full_name, email), courses(id, name)')
    const { data: sessions } = await supabase.from('exam_sessions').select('*, courses(name)')
    const { data: exams } = await supabase.from('exam_registrations').select('*, profiles(full_name, email), exam_sessions(id, name, exam_date, courses(name))')
    const { data: ports } = await supabase.from('portfolio_entries').select('*, profiles(full_name, email), courses(id, name)')
    setCourses(coursesData || [])
    setApplications(apps || [])
    setExamSessions(sessions || [])
    setExamRegs(exams || [])
    setPortfolios(ports || [])
    setStats({
      courses: coursesData?.length || 0,
      applications: apps?.length || 0,
      approved: apps?.filter((a: any) => a.status === 'approved').length || 0,
      exams: exams?.length || 0,
      portfolios: ports?.length || 0,
      passed: exams?.filter((e: any) => e.result === 'pass').length || 0,
      failed: exams?.filter((e: any) => e.result === 'fail').length || 0,
    })
  }

  function exportCSV(data: any[], filename: string, headers: string[], rows: (item: any) => string) {
    const csv = [headers.join(','), ...data.map(rows)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  }

  function exportPDF(title: string, headers: string[], rows: any[][], filename: string) {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.setTextColor(122, 21, 21)
    doc.text('PGIM Information Management System', 14, 15)
    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(title, 14, 25)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 32)
    autoTable(doc, {
      startY: 38,
      head: [headers],
      body: rows,
      headStyles: { fillColor: [122, 21, 21], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 245, 240] },
      styles: { fontSize: 9, cellPadding: 3 },
    })
    doc.save(filename)
  }

  const filteredApps = selectedCourse === 'all'
    ? applications
    : applications.filter(a => a.courses?.id === selectedCourse)

  const filteredExamRegs = selectedSession === 'all'
    ? examRegs
    : examRegs.filter(r => r.exam_sessions?.id === selectedSession)

  const passRate = filteredExamRegs.filter(r => r.result).length > 0
    ? Math.round((filteredExamRegs.filter(r => r.result === 'pass').length / filteredExamRegs.filter(r => r.result).length) * 100)
    : 0

  const reports = [
    { key: 'enrolment', label: 'Enrolment Summary', icon: '📝' },
    { key: 'examindex', label: 'Exam Index List', icon: '📋' },
    { key: 'passrate', label: 'Pass Rate Report', icon: '📊' },
    { key: 'portfolio', label: 'Portfolio Completion', icon: '📁' },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Reports & Analytics</h2>
        <p className="text-gray-500 mb-6">System-wide reporting and data export</p>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Courses', value: stats.courses, icon: '📚', color: '#7a1515' },
            { label: 'Total Enrolments', value: stats.approved, icon: '✅', color: '#15803D' },
            { label: 'Exam Registrations', value: stats.exams, icon: '📋', color: '#1D4ED8' },
            { label: 'Overall Pass Rate', value: stats.exams > 0 ? Math.round((stats.passed / stats.exams) * 100) + '%' : 'N/A', icon: '🎓', color: '#B45309' },
            { label: 'Portfolio Entries', value: stats.portfolios, icon: '📁', color: '#7C3AED' },
            { label: 'Passed', value: stats.passed, icon: '✓', color: '#15803D' },
            { label: 'Failed', value: stats.failed, icon: '✗', color: '#DC2626' },
            { label: 'Applications', value: stats.applications, icon: '📝', color: '#0F766E' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="text-xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-gray-600 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Report Tabs */}
        <div className="flex gap-2 mb-6">
          {reports.map(r => (
            <button key={r.key} onClick={() => { setActiveReport(r.key); setDrillDown(null) }}
              className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
              style={{
                background: activeReport === r.key ? '#7a1515' : 'white',
                color: activeReport === r.key ? 'white' : '#374151',
                border: '1px solid #e5e7eb',
                boxShadow: activeReport === r.key ? '0 2px 8px rgba(122,21,21,0.3)' : 'none'
              }}>
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        {/* Report 1: Enrolment Summary */}
        {activeReport === 'enrolment' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Enrolment Summary Report</h3>
                <p className="text-xs text-gray-500 mt-0.5">Candidates registered per course — click a row to drill down</p>
              </div>
              <div className="flex gap-2 items-center">
                <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800">
                  <option value="all">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => exportCSV(filteredApps, 'enrolment.csv',
                  ['Name', 'Email', 'Course', 'Status', 'Payment'],
                  (a: any) => `${a.profiles?.full_name},${a.profiles?.email},${a.courses?.name},${a.status},${a.payment_status}`)}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
                  CSV
                </button>
                <button onClick={() => exportPDF('Enrolment Summary Report',
                  ['Name', 'Email', 'Course', 'Status', 'Payment'],
                  filteredApps.map(a => [a.profiles?.full_name, a.profiles?.email, a.courses?.name, a.status, a.payment_status]),
                  'enrolment.pdf')}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                  PDF
                </button>
              </div>
            </div>

            {/* Drill-down detail */}
            {drillDown && (
              <div className="px-6 py-4 border-b border-gray-100" style={{ background: '#fdf5f5' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">Drill-down: {drillDown.profiles?.full_name}</h4>
                  <button onClick={() => setDrillDown(null)} className="text-xs text-gray-400 hover:text-gray-600">✕ Close</button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-400">Full Name</p>
                    <p className="text-sm font-medium text-gray-800">{drillDown.profiles?.full_name}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-400">Email</p>
                    <p className="text-sm font-medium text-gray-800">{drillDown.profiles?.email}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-400">Course</p>
                    <p className="text-sm font-medium text-gray-800">{drillDown.courses?.name}</p>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-400">Enrolment Status</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${drillDown.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {drillDown.status} / {drillDown.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <table className="w-full">
              <thead style={{ background: '#f3ece8' }}>
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Candidate</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Course</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Payment</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app: any, i: number) => (
                  <tr key={app.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-orange-50 cursor-pointer`}
                    onClick={() => setDrillDown(app)}>
                    <td className="px-6 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 font-medium">{app.profiles?.full_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{app.courses?.name}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {app.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-blue-600 font-medium">View →</span>
                    </td>
                  </tr>
                ))}
                {filteredApps.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No applications yet</td></tr>}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Total: {filteredApps.length} records • Approved: {filteredApps.filter(a => a.status === 'approved').length}</p>
            </div>
          </div>
        )}

        {/* Report 2: Exam Index List */}
        {activeReport === 'examindex' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Exam Index List</h3>
                <p className="text-xs text-gray-500 mt-0.5">Candidates scheduled per examination session</p>
              </div>
              <div className="flex gap-2 items-center">
                <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800">
                  <option value="all">All Sessions</option>
                  {examSessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => exportCSV(filteredExamRegs, 'exam-index.csv',
                  ['Candidate', 'Email', 'Exam Session', 'Course', 'Exam Date'],
                  (r: any) => `${r.profiles?.full_name},${r.profiles?.email},${r.exam_sessions?.name},${r.exam_sessions?.courses?.name},${r.exam_sessions?.exam_date || 'TBD'}`)}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
                  CSV
                </button>
                <button onClick={() => exportPDF('Exam Index List',
                  ['#', 'Candidate', 'Email', 'Exam Session', 'Course', 'Date'],
                  filteredExamRegs.map((r, i) => [i + 1, r.profiles?.full_name, r.profiles?.email, r.exam_sessions?.name, r.exam_sessions?.courses?.name, r.exam_sessions?.exam_date ? new Date(r.exam_sessions.exam_date).toLocaleDateString('en-GB') : 'TBD']),
                  'exam-index.pdf')}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                  PDF
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead style={{ background: '#f3ece8' }}>
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Candidate</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Exam Session</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Course</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Exam Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Result</th>
                </tr>
              </thead>
              <tbody>
                {filteredExamRegs.map((reg: any, i: number) => (
                  <tr key={reg.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-3 text-sm text-gray-500">{i + 1}</td>
                    <td className="px-6 py-3 text-sm text-gray-800 font-medium">{reg.profiles?.full_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-700">{reg.exam_sessions?.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{reg.exam_sessions?.courses?.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {reg.exam_sessions?.exam_date ? new Date(reg.exam_sessions.exam_date).toLocaleDateString('en-GB') : 'TBD'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : reg.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                        {reg.result ? `${reg.score ? reg.score + '/100 — ' : ''}${reg.result.toUpperCase()}` : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredExamRegs.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-sm">No exam registrations yet</td></tr>}
              </tbody>
            </table>
            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">Total registered: {filteredExamRegs.length}</p>
            </div>
          </div>
        )}

        {/* Report 3: Pass Rate Report */}
        {activeReport === 'passrate' && (
          <div>
            {/* Pass Rate Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Sat Exam', value: examRegs.filter(r => r.result).length, color: '#1D4ED8' },
                { label: 'Passed', value: stats.passed, color: '#15803D' },
                { label: 'Failed', value: stats.failed, color: '#DC2626' },
                { label: 'Pass Rate', value: stats.exams > 0 ? Math.round((stats.passed / examRegs.filter(r => r.result).length || 1) * 100) + '%' : 'N/A', color: '#7a1515' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 text-center">
                  <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-gray-600 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Pass Rate by Session */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Pass Rate Report — By Exam Session</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Results summary per examination session</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportCSV(
                    examSessions.map(s => {
                      const regs = examRegs.filter(r => r.exam_sessions?.id === s.id && r.result)
                      const passed = regs.filter(r => r.result === 'pass').length
                      return { session: s.name, course: s.courses?.name, total: regs.length, passed, failed: regs.length - passed, rate: regs.length > 0 ? Math.round((passed / regs.length) * 100) + '%' : 'N/A' }
                    }),
                    'pass-rate.csv',
                    ['Session', 'Course', 'Total', 'Passed', 'Failed', 'Pass Rate'],
                    (r: any) => `${r.session},${r.course},${r.total},${r.passed},${r.failed},${r.rate}`)}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
                    CSV
                  </button>
                  <button onClick={() => {
                    const rows = examSessions.map(s => {
                      const regs = examRegs.filter(r => r.exam_sessions?.id === s.id && r.result)
                      const passed = regs.filter(r => r.result === 'pass').length
                      return [s.name, s.courses?.name, regs.length, passed, regs.length - passed, regs.length > 0 ? Math.round((passed / regs.length) * 100) + '%' : 'N/A']
                    })
                    exportPDF('Pass Rate Report', ['Session', 'Course', 'Total', 'Passed', 'Failed', 'Pass Rate'], rows, 'pass-rate.pdf')
                  }}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                    PDF
                  </button>
                </div>
              </div>
              <table className="w-full">
                <thead style={{ background: '#f3ece8' }}>
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Exam Session</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Course</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Registered</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Results Published</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Passed</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Failed</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {examSessions.map((session: any, i: number) => {
                    const sessionRegs = examRegs.filter(r => r.exam_sessions?.id === session.id)
                    const published = sessionRegs.filter(r => r.result)
                    const passed = published.filter(r => r.result === 'pass').length
                    const failed = published.filter(r => r.result === 'fail').length
                    const rate = published.length > 0 ? Math.round((passed / published.length) * 100) : null
                    return (
                      <tr key={session.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-3 text-sm text-gray-800 font-medium">{session.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{session.courses?.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{sessionRegs.length}</td>
                        <td className="px-6 py-3 text-sm text-gray-700">{published.length}</td>
                        <td className="px-6 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{passed}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{failed}</span>
                        </td>
                        <td className="px-6 py-3">
                          {rate !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                                <div className="h-2 rounded-full" style={{ width: `${rate}%`, background: rate >= 60 ? '#15803D' : '#DC2626' }} />
                              </div>
                              <span className="text-xs font-bold" style={{ color: rate >= 60 ? '#15803D' : '#DC2626' }}>{rate}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No results yet</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {examSessions.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-sm">No exam sessions yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report 4: Portfolio Completion */}
        {activeReport === 'portfolio' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">Portfolio Completion Status</h3>
                <p className="text-xs text-gray-500 mt-0.5">Per-course portfolio completion overview</p>
              </div>
              <div className="flex gap-2 items-center">
                <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs text-gray-800">
                  <option value="all">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => {
                  const filtered = selectedCourse === 'all' ? portfolios : portfolios.filter(p => p.courses?.id === selectedCourse)
                  exportCSV(filtered, 'portfolio.csv',
                    ['Candidate', 'Email', 'Course', 'Title', 'Type', 'Domain', 'Grade', 'Status'],
                    (p: any) => `${p.profiles?.full_name},${p.profiles?.email},${p.courses?.name},${p.title},${p.entry_type || 'Clinical Case'},${p.competency_domain},${p.grade || 'Not graded'},${p.status}`)
                }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
                  CSV
                </button>
                <button onClick={() => {
                  const filtered = selectedCourse === 'all' ? portfolios : portfolios.filter(p => p.courses?.id === selectedCourse)
                  exportPDF('Portfolio Completion Status',
                    ['Candidate', 'Course', 'Title', 'Type', 'Grade', 'Status'],
                    filtered.map(p => [p.profiles?.full_name, p.courses?.name, p.title, p.entry_type || 'Clinical Case', p.grade || 'Not graded', p.status]),
                    'portfolio.pdf')
                }}
                  className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                  PDF
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead style={{ background: '#f3ece8' }}>
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Candidate</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Course</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Entry Title</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Domain</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Grade</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {(selectedCourse === 'all' ? portfolios : portfolios.filter(p => p.courses?.id === selectedCourse))
                  .map((p: any, i: number) => (
                    <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-3 text-sm text-gray-800 font-medium">{p.profiles?.full_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{p.courses?.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-700">{p.title}</td>
                      <td className="px-6 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                          {p.entry_type || 'Clinical Case'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-600">{p.competency_domain}</td>
                      <td className="px-6 py-3">
                        {p.grade ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.grade === 'Excellent' ? 'bg-green-100 text-green-700' :
                            p.grade === 'Good' ? 'bg-blue-100 text-blue-700' :
                            p.grade === 'Satisfactory' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'}`}>
                            {p.grade}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Not graded</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.status === 'approved' ? 'bg-green-100 text-green-700' :
                          p.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'}`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                {portfolios.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-sm">No portfolio entries yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}