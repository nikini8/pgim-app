'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function ReportsPage() {
  const [stats, setStats] = useState({courses:0, applications:0, approved:0, exams:0, portfolios:0, passed:0, failed:0})
  const [applications, setApplications] = useState<any[]>([])
  const [examRegs, setExamRegs] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: courses } = await supabase.from('courses').select('*')
    const { data: apps } = await supabase.from('applications').select('*, profiles(full_name, email), courses(name)')
    const { data: exams } = await supabase.from('exam_registrations').select('*, profiles(full_name), exam_sessions(name, courses(name))')
    const { data: ports } = await supabase.from('portfolio_entries').select('*, profiles(full_name), courses(name)')
    setApplications(apps || [])
    setExamRegs(exams || [])
    setPortfolios(ports || [])
    setStats({
      courses: courses?.length || 0,
      applications: apps?.length || 0,
      approved: apps?.filter(a => a.status === 'approved').length || 0,
      exams: exams?.length || 0,
      portfolios: ports?.length || 0,
      passed: exams?.filter(e => e.result === 'pass').length || 0,
      failed: exams?.filter(e => e.result === 'fail').length || 0,
    })
  }

  function exportCSV(data: any[], filename: string, headers: string[], rows: (item: any) => string) {
    const csv = [headers.join(','), ...data.map(rows)].join('\n')
    const blob = new Blob([csv], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
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
        <h2 className="text-2xl font-bold mb-6" style={{color:'#7a1515'}}>Reports & Analytics</h2>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {label:'Total Courses', value: stats.courses, icon:'📚'},
            {label:'Total Applications', value: stats.applications, icon:'📝'},
            {label:'Approved', value: stats.approved, icon:'✅'},
            {label:'Exam Registrations', value: stats.exams, icon:'📋'},
            {label:'Portfolio Entries', value: stats.portfolios, icon:'📁'},
            {label:'Passed', value: stats.passed, icon:'🎓'},
            {label:'Failed', value: stats.failed, icon:'❌'},
            {label:'Pass Rate', value: stats.exams > 0 ? Math.round((stats.passed/stats.exams)*100)+'%' : 'N/A', icon:'📊'},
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{color:'#7a1515'}}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Enrolment Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Enrolment Summary Report</h3>
            <button onClick={() => exportCSV(applications, 'enrolment.csv', ['Name','Email','Course','Status','Payment'],
              a => `${a.profiles?.full_name},${a.profiles?.email},${a.courses?.name},${a.status},${a.payment_status}`)}
              className="text-xs px-3 py-1.5 rounded-lg text-white" style={{background:'#c4a020'}}>Export CSV</button>
          </div>
          <table className="w-full">
            <thead style={{background:'#f3ece8'}}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Candidate</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Course</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Payment</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, i) => (
                <tr key={app.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm">{app.profiles?.full_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{app.courses?.name}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{app.status}</span></td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{app.payment_status}</span></td>
                </tr>
              ))}
              {applications.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No applications yet</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Exam Results Report */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Exam Results Report</h3>
            <button onClick={() => exportCSV(examRegs, 'exam-results.csv', ['Candidate','Exam','Course','Result'],
              r => `${r.profiles?.full_name},${r.exam_sessions?.name},${r.exam_sessions?.courses?.name},${r.result || 'pending'}`)}
              className="text-xs px-3 py-1.5 rounded-lg text-white" style={{background:'#c4a020'}}>Export CSV</button>
          </div>
          <table className="w-full">
            <thead style={{background:'#f3ece8'}}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Candidate</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Exam Session</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Result</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Appeal</th>
              </tr>
            </thead>
            <tbody>
              {examRegs.map((reg, i) => (
                <tr key={reg.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm">{reg.profiles?.full_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{reg.exam_sessions?.name}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : reg.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{reg.result || 'pending'}</span></td>
                  <td className="px-6 py-3 text-xs text-gray-500">{reg.appeal_status || '—'}</td>
                </tr>
              ))}
              {examRegs.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No exam registrations yet</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Portfolio Completion */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Portfolio Completion Status</h3>
            <button onClick={() => exportCSV(portfolios, 'portfolio.csv', ['Candidate','Course','Title','Status'],
              p => `${p.profiles?.full_name},${p.courses?.name},${p.title},${p.status}`)}
              className="text-xs px-3 py-1.5 rounded-lg text-white" style={{background:'#c4a020'}}>Export CSV</button>
          </div>
          <table className="w-full">
            <thead style={{background:'#f3ece8'}}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Candidate</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Course</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Entry Title</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {portfolios.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-sm">{p.profiles?.full_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{p.courses?.name}</td>
                  <td className="px-6 py-3 text-sm">{p.title}</td>
                  <td className="px-6 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'approved' ? 'bg-green-100 text-green-700' : p.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></td>
                </tr>
              ))}
              {portfolios.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-sm">No portfolio entries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}