'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const router = useRouter()

  useEffect(() => { loadLogs() }, [])

  async function loadLogs() {
    const { data } = await supabase
      .from('activity_log')
      .select('*, profiles(full_name, role)')
      .order('created_at', { ascending: false })
    setLogs(data || [])
    setLoading(false)
  }

  const filtered = logs.filter(log =>
    log.action?.toLowerCase().includes(filter.toLowerCase()) ||
    log.profiles?.full_name?.toLowerCase().includes(filter.toLowerCase())
  )

  function exportCSV() {
    const rows = logs.map(l => `${l.profiles?.full_name},${l.profiles?.role},${l.action},${new Date(l.created_at).toLocaleString()}`)
    const csv = ['User,Role,Action,Timestamp', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'audit-log.csv'; a.click()
  }

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo-user-transparent-v1.png" alt="PGIM" width={45} height={45} className="rounded-full object-cover" />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>Audit Log</h2>
            <p className="text-sm text-gray-500 mt-1">System activity and user action history</p>
          </div>
          <button onClick={exportCSV} className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <input value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search by user or action..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" />
          </div>

          <table className="w-full">
            <thead style={{ background: '#f3ece8' }}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Timestamp</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">User</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Role</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={log.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">{log.profiles?.full_name}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      log.profiles?.role === 'admin' ? 'bg-red-100 text-red-700' :
                      log.profiles?.role === 'examiner' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'}`}>
                      {log.profiles?.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">{log.action}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No activity logs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}