'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newCourse, setNewCourse] = useState({name:'', description:''})
  const [adding, setAdding] = useState(false)
  const router = useRouter()

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    const { data } = await supabase.from('courses').select('*').order('created_at', {ascending: false})
    setCourses(data || [])
    setLoading(false)
  }

  async function toggleRegistration(id: string, current: boolean) {
    await supabase.from('courses').update({registration_open: !current}).eq('id', id)
    loadCourses()
  }

  async function addCourse() {
    if (!newCourse.name) return
    setAdding(true)
    await supabase.from('courses').insert({...newCourse, registration_open: false})
    setNewCourse({name:'', description:''})
    setAdding(false)
    loadCourses()
  }

  return (
    <div className="min-h-screen" style={{background:'#f9f5f0'}}>
      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{background:'linear-gradient(135deg, #7a1515, #4a0a0a)'}}>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div>
            <h1 className="font-bold text-lg">PGIM</h1>
            <p className="text-xs opacity-75">Information Management System</p>
          </div>
        </div>
        <button onClick={() => router.push('/dashboard/admin')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back to Dashboard</button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-6" style={{color:'#7a1515'}}>Manage Courses</h2>

        {/* Add Course */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6 border border-gray-100">
          <h3 className="font-semibold text-gray-700 mb-4">Add New Course</h3>
          <div className="flex gap-3">
            <input value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})}
              placeholder="Course name" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            <input value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})}
              placeholder="Description" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm" />
            <button onClick={addCourse} disabled={adding}
              className="px-5 py-2 rounded-lg text-white text-sm font-medium" style={{background:'#7a1515'}}>
              {adding ? 'Adding...' : 'Add Course'}
            </button>
          </div>
        </div>

        {/* Course List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead style={{background:'#f3ece8'}}>
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Course Name</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Description</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Registration</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course, i) => (
                <tr key={course.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{course.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{course.description}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${course.registration_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {course.registration_open ? 'Open' : 'Closed'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleRegistration(course.id, course.registration_open)}
                      className="text-xs px-3 py-1 rounded border font-medium transition"
                      style={{borderColor:'#7a1515', color:'#7a1515'}}>
                      {course.registration_open ? 'Close Registration' : 'Open Registration'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <p className="text-center py-8 text-gray-400">Loading...</p>}
        </div>
      </div>
    </div>
  )
}