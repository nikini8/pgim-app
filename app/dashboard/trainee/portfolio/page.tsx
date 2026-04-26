'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function PortfolioPage() {
  const [profile, setProfile] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({title:'', description:'', competency_domain:'', course_id:''})
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: e } = await supabase.from('portfolio_entries').select('*, courses(name)').eq('candidate_id', user.id).order('created_at', {ascending: false})
      setEntries(e || [])
      const { data: c } = await supabase.from('courses').select('*')
      setCourses(c || [])
    }
    load()
  }, [])

  async function addEntry() {
    if (!form.title || !form.course_id) return
    setSaving(true)
    await supabase.from('portfolio_entries').insert({
      ...form,
      candidate_id: profile.id,
      status: 'submitted'
    })
    const { data: e } = await supabase.from('portfolio_entries').select('*, courses(name)').eq('candidate_id', profile.id).order('created_at', {ascending: false})
    setEntries(e || [])
    setForm({title:'', description:'', competency_domain:'', course_id:''})
    setShowForm(false)
    setSaving(false)
  }

  const domains = ['Clinical Skills', 'Communication', 'Professionalism', 'Research', 'Teaching', 'Leadership']

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen" style={{background:'#f9f5f0'}}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{background:'linear-gradient(135deg, #7a1515, #4a0a0a)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/trainee')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{color:'#7a1515'}}>My e-Portfolio</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{background:'#7a1515'}}>
            + Add Entry
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-gray-700 mb-4">New Portfolio Entry</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Entry title" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Course</label>
                <select value={form.course_id} onChange={e => setForm({...form, course_id: e.target.value})}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Competency Domain</label>
                <select value={form.competency_domain} onChange={e => setForm({...form, competency_domain: e.target.value})}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  <option value="">Select domain</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" rows={2} placeholder="Describe the entry..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addEntry} disabled={saving}
                className="text-sm px-5 py-2 rounded-lg text-white font-medium" style={{background:'#7a1515'}}>
                {saving ? 'Saving...' : 'Submit Entry'}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm px-5 py-2 rounded-lg border border-gray-300 text-gray-600">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {entries.length === 0 && <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">No portfolio entries yet. Click "Add Entry" to get started.</div>}
          {entries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">{entry.courses?.name} • {entry.competency_domain}</p>
                  <p className="text-sm text-gray-600 mt-2">{entry.description}</p>
                  {entry.examiner_feedback && (
                    <div className="mt-3 p-3 rounded-lg" style={{background:'#f3ece8'}}>
                      <p className="text-xs font-medium" style={{color:'#7a1515'}}>Examiner Feedback:</p>
                      <p className="text-sm text-gray-700 mt-1">{entry.examiner_feedback}</p>
                    </div>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  entry.status === 'approved' ? 'bg-green-100 text-green-700' :
                  entry.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'}`}>
                  {entry.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}