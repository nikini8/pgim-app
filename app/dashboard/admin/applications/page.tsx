'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { loadApplications() }, [])

  async function loadApplications() {
    const { data } = await supabase
      .from('applications')
      .select(`*, profiles(full_name, email), courses(name)`)
      .order('created_at', {ascending: false})
    setApplications(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('applications').update({status}).eq('id', id)
    loadApplications()
  }

  function exportCSV() {
    const rows = applications.map(a => `${a.profiles?.full_name},${a.profiles?.email},${a.courses?.name},${a.status},${a.payment_status}`)
    const csv = ['Name,Email,Course,Status,Payment', ...rows].join('\n')
    const blob = new Blob([csv], {type: 'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'applications.csv'; a.click()
  }

  return (
    <div className="min-h-screen" style={{background:'#f9f5f0'}}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{background:'linear-gradient(135deg, #7a1515, #4a0a0a)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo-user-transparent-v1.png" alt="PGIM" width={45} height={45} className="rounded-full object-cover" />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{color:'#7a1515'}}>Applications</h2>
          <button onClick={exportCSV} className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{background:'#c4a020'}}>
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead style={{background:'#f3ece8'}}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Candidate</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Course</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Payment</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app, i) => (
                <tr key={app.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800">{app.profiles?.full_name}</p>
                    <p className="text-xs text-gray-400">{app.profiles?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.courses?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      app.status === 'approved' ? 'bg-green-100 text-green-700' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {app.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => updateStatus(app.id, 'approved')}
                      className="text-xs px-3 py-1 rounded bg-green-600 text-white">Approve</button>
                    <button onClick={() => updateStatus(app.id, 'rejected')}
                      className="text-xs px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                  </td>
                </tr>
              ))}
              {!loading && applications.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No applications yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}