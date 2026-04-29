'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<any>(null)
  const [admittedStudents, setAdmittedStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newCourse, setNewCourse] = useState({ name: '', description: '' })
  const [adding, setAdding] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [toast, setToast] = useState('')
  const router = useRouter()

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false })
    setCourses(data || [])
    setLoading(false)
  }

  async function loadStudents(courseId: string) {
    const { data } = await supabase.from('applications')
      .select('*, profiles(full_name, email)')
      .eq('course_id', courseId)
      .eq('status', 'approved')
    setAdmittedStudents(data || [])
  }

  async function selectCourse(course: any) {
    setSelectedCourse(course)
    await loadStudents(course.id)
  }

  async function toggleRegistration(id: string, current: boolean) {
    await supabase.from('courses').update({ registration_open: !current }).eq('id', id)
    showToast(current ? 'Registration closed' : 'Registration opened')
    loadCourses()
    if (selectedCourse?.id === id) {
      setSelectedCourse({ ...selectedCourse, registration_open: !current })
    }
  }

  async function addCourse() {
    if (!newCourse.name) return
    setAdding(true)
    await supabase.from('courses').insert({ ...newCourse, registration_open: false })
    setNewCourse({ name: '', description: '' })
    setAdding(false)
    setShowAddForm(false)
    showToast('Course added successfully')
    loadCourses()
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function exportCSV() {
    const rows = admittedStudents.map(s => `${s.profiles?.full_name},${s.profiles?.email},${selectedCourse?.name},${s.payment_status}`)
    const csv = ['Name,Email,Course,Payment Status', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${selectedCourse?.name}-students.csv`; a.click()
  }

  function exportPDF() {
    const doc = new jsPDF()
    doc.setFontSize(16); doc.setTextColor(122, 21, 21)
    doc.text('PGIM Information Management System', 14, 15)
    doc.setFontSize(12); doc.setTextColor(0, 0, 0)
    doc.text(`Admitted Students - ${selectedCourse?.name}`, 14, 25)
    doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 32)
    autoTable(doc, {
      startY: 38,
      head: [['#', 'Name', 'Email', 'Payment Status']],
      body: admittedStudents.map((s, i) => [
        i + 1,
        s.profiles?.full_name || '',
        s.profiles?.email || '',
        s.payment_status || ''
      ]),
      headStyles: { fillColor: [122, 21, 21], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 245, 240] },
      styles: { fontSize: 9, cellPadding: 3 },
    })
    doc.save(`${selectedCourse?.name}-students.pdf`)
  }

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm" style={{ background: '#15803D' }}>
          ✓ {toast}
        </div>
      )}

      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>Manage Courses</h2>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="text-sm px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
            + Add New Course
          </button>
        </div>

        {showAddForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
            <h3 className="font-semibold text-gray-700 mb-4">Add New Course</h3>
            <div className="flex gap-3">
              <input value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })}
                placeholder="Course name" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800" />
              <input value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                placeholder="Description" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-800" />
              <button onClick={addCourse} disabled={adding || !newCourse.name}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: '#7a1515' }}>
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => { setShowAddForm(false); setNewCourse({ name: '', description: '' }) }}
                className="px-5 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-semibold text-gray-700 text-sm">All Courses</h3>
              </div>
              {loading && <p className="text-center py-6 text-gray-400 text-sm">Loading...</p>}
              {courses.map(course => (
                <div key={course.id} onClick={() => selectCourse(course)}
                  className="px-4 py-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition"
                  style={{ borderLeft: selectedCourse?.id === course.id ? '4px solid #7a1515' : '4px solid transparent', background: selectedCourse?.id === course.id ? '#fdf5f5' : '' }}>
                  <p className="font-medium text-gray-800 text-sm">{course.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{course.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.registration_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {course.registration_open ? 'Open' : 'Closed'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); toggleRegistration(course.id, course.registration_open) }}
                      className="text-xs px-2 py-1 rounded border font-medium"
                      style={{ borderColor: '#7a1515', color: '#7a1515' }}>
                      {course.registration_open ? 'Close' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}
              {!loading && courses.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No courses yet</p>}
            </div>
          </div>

          <div className="col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">
                  {selectedCourse ? `Admitted Students — ${selectedCourse.name}` : 'Select a course to view students'}
                </h3>
                {selectedCourse && admittedStudents.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={exportCSV}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#c4a020' }}>
                      Export CSV
                    </button>
                    <button onClick={exportPDF}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                      Export PDF
                    </button>
                  </div>
                )}
              </div>

              {!selectedCourse && (
                <div className="p-12 text-center text-gray-400">
                  <p className="text-4xl mb-3">📚</p>
                  <p className="text-sm">Click a course on the left to view admitted students</p>
                </div>
              )}

              {selectedCourse && admittedStudents.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  <p className="text-4xl mb-3">👥</p>
                  <p className="text-sm">No admitted students for this course yet</p>
                </div>
              )}

              {selectedCourse && admittedStudents.length > 0 && (
                <table className="w-full">
                  <thead style={{ background: '#f3ece8' }}>
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">#</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Name</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Email</th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admittedStudents.map((student, i) => (
                      <tr key={student.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-3 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-800">{student.profiles?.full_name}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{student.profiles?.email}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {student.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}