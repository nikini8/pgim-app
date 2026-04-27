'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function PortfolioPage() {
  const [profile, setProfile] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', competency_domain: '',
    course_id: '', entry_type: 'Clinical Case'
  })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const entryTypes = ['Clinical Case', 'Procedure', 'Learning Record', 'Teaching Session', 'Research']
  const domains = ['Clinical Reasoning', 'Procedural Skills', 'Communication', 'Professionalism', 'Research', 'Teaching & Learning', 'Leadership']

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'trainee') { router.push('/login'); return }
      setProfile(p)
      const { data: apps } = await supabase.from('applications')
        .select('*, courses(*)').eq('candidate_id', user.id).eq('status', 'approved')
      setEnrolledCourses(apps?.map((a: any) => a.courses).filter(Boolean) || [])
      const { data: e } = await supabase.from('portfolio_entries')
        .select('*, courses(name)').eq('candidate_id', user.id).order('created_at', { ascending: false })
      setEntries(e || [])
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  async function addEntry() {
    if (!form.title || !form.course_id || !form.competency_domain) return
    setSaving(true)
    await supabase.from('portfolio_entries').insert({
      ...form, candidate_id: profile.id, status: 'submitted'
    })
    const { data: e } = await supabase.from('portfolio_entries')
      .select('*, courses(name)').eq('candidate_id', profile.id).order('created_at', { ascending: false })
    setEntries(e || [])
    setForm({ title: '', description: '', competency_domain: '', course_id: '', entry_type: 'Clinical Case' })
    setShowForm(false)
    setSaving(false)
    showToast('Entry submitted to Trainer/Supervisor for review')
  }

  const filteredEntries = selectedCourse === 'all'
    ? entries
    : entries.filter(e => e.course_id === selectedCourse)

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2" style={{ background: '#15803D' }}>
          ✓ {toast}
        </div>
      )}

      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/trainee')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back</button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>e-Portfolio / Logbook</h2>
            <p className="text-sm text-gray-500 mt-1">Submit and track your portfolio entries per course</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
            + Add Entry
          </button>
        </div>

        {/* Course tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setSelectedCourse('all')}
            className="text-xs px-4 py-2 rounded-full font-medium transition"
            style={{ background: selectedCourse === 'all' ? '#7a1515' : 'white', color: selectedCourse === 'all' ? 'white' : '#4b5563', border: '1px solid #e5e7eb' }}>
            All ({entries.length})
          </button>
          {enrolledCourses.map((course: any) => (
            <button key={course.id} onClick={() => setSelectedCourse(course.id)}
              className="text-xs px-4 py-2 rounded-full font-medium transition"
              style={{ background: selectedCourse === course.id ? '#7a1515' : 'white', color: selectedCourse === course.id ? 'white' : '#4b5563', border: '1px solid #e5e7eb' }}>
              {course.name} ({entries.filter(e => e.course_id === course.id).length})
            </button>
          ))}
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-gray-700 mb-4">New Portfolio Entry</h3>
            {enrolledCourses.length === 0 && (
              <div className="p-3 rounded-lg bg-yellow-50 text-yellow-700 text-sm mb-4">
                ⚠ You must be enrolled and approved in a course before adding portfolio entries.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Entry Type</label>
                <select value={form.entry_type} onChange={e => setForm({ ...form, entry_type: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  {entryTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Course *</label>
                <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  <option value="">Select enrolled course</option>
                  {enrolledCourses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" placeholder="Entry title" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Competency Domain *</label>
                <select value={form.competency_domain} onChange={e => setForm({ ...form, competency_domain: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm">
                  <option value="">Select domain</option>
                  {domains.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2 text-sm" rows={3}
                  placeholder="Describe the case, procedure, or learning experience..." />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={addEntry} disabled={saving || !form.title || !form.course_id || !form.competency_domain}
                className="text-sm px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ background: '#7a1515' }}>
                {saving ? 'Submitting...' : 'Submit Entry'}
              </button>
              <button onClick={() => setShowForm(false)} className="text-sm px-5 py-2 rounded-lg border border-gray-300 text-gray-600">Cancel</button>
            </div>
          </div>
        )}

        {/* Entries */}
        <div className="flex flex-col gap-4">
          {filteredEntries.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 shadow-sm">
              No portfolio entries yet. Click "+ Add Entry" to get started.
            </div>
          )}
          {filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                      {entry.entry_type || 'Clinical Case'}
                    </span>
                    <span className="text-xs text-gray-400">{entry.courses?.name}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800">{entry.title}</h3>
                  <p className="text-xs text-gray-400 mt-1">Competency: {entry.competency_domain}</p>
                  <p className="text-sm text-gray-600 mt-2">{entry.description}</p>
                  {entry.status === 'submitted' && (
                    <p className="text-xs text-yellow-600 mt-2">⏳ Awaiting review by Trainer/Supervisor</p>
                  )}
                  {entry.examiner_feedback && (
                    <div className="mt-3 p-3 rounded-lg" style={{ background: '#f3ece8' }}>
                      <p className="text-xs font-medium" style={{ color: '#7a1515' }}>Trainer Feedback:</p>
                      <p className="text-sm text-gray-700 mt-1">{entry.examiner_feedback}</p>
                    </div>
                  )}
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ml-4 ${
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