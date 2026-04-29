'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import jsPDF from 'jspdf'

export default function TraineeCoursesPage() {
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
  const [modal, setModal] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [admissionCard, setAdmissionCard] = useState<any>(null)
  const [form, setForm] = useState({ name: '', nic: '', slmc: '', phone: '' })
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState<'available' | 'enrolled'>('available')
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      const { data: c } = await supabase.from('courses').select('*').eq('registration_open', true)
      setCourses(c || [])
      const { data: a } = await supabase.from('applications').select('*, courses(id, name)').eq('candidate_id', user.id)
      setMyApplications(a || [])
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openModal(course: any) {
    setModal(course)
    setStep(1)
    setForm({ name: profile?.full_name || '', nic: '', slmc: '', phone: '' })
    setAdmissionCard(null)
  }

  function closeModal() {
    setModal(null)
    setStep(1)
    setAdmissionCard(null)
  }

  async function confirmPayment() {
    if (!modal || !profile) return
    await supabase.from('applications').insert({
      candidate_id: profile.id,
      course_id: modal.id,
      status: 'approved',
      payment_status: 'paid'
    })
    await supabase.from('activity_log').insert({
      user_id: profile.id,
      action: `Enrolled in ${modal.name} — payment confirmed`
    })
    const { data: a } = await supabase.from('applications').select('*, courses(id, name)').eq('candidate_id', profile.id)
    setMyApplications(a || [])
    const ref = 'PGIM-' + Date.now().toString().slice(-6)
    setAdmissionCard({
      ref, name: form.name, nic: form.nic, slmc: form.slmc,
      email: profile.email, course: modal.name,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    })
    setStep(4)
  }

  function downloadAdmissionCard() {
    if (!admissionCard) return
    const doc = new jsPDF()
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
    doc.text(`Reference No: ${admissionCard.ref}`, 105, 60, { align: 'center' })
    doc.setTextColor(0, 0, 0); doc.setFontSize(10)
    const details = [
      ['Candidate Name', admissionCard.name], ['NIC Number', admissionCard.nic],
      ['SLMC Reg. No', admissionCard.slmc], ['Email Address', admissionCard.email],
      ['Course', admissionCard.course], ['Date Issued', admissionCard.date], ['Status', 'ADMITTED'],
    ]
    let y = 75
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100); doc.text(label + ':', 25, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(value || '', 90, y)
      doc.setDrawColor(220, 220, 220); doc.line(25, y + 3, 185, y + 3); y += 15
    })
    doc.setFillColor(220, 252, 231); doc.roundedRect(70, y + 5, 70, 12, 3, 3, 'F')
    doc.setTextColor(21, 128, 61); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('✓ ADMITTED', 105, y + 13, { align: 'center' })
    doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('PGIM Information Management System © 2026', 105, 270, { align: 'center' })
    doc.save(`PGIM-Admission-${admissionCard.ref}.pdf`)
  }

  function downloadExistingCard(app: any) {
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
      ['Candidate Name', profile.full_name], ['Email Address', profile.email],
      ['Course', app.courses?.name], ['Date Issued', new Date().toLocaleDateString('en-GB')], ['Status', 'ADMITTED'],
    ]
    let y = 75
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 100, 100); doc.text(label + ':', 25, y)
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0); doc.text(value || '', 90, y)
      doc.setDrawColor(220, 220, 220); doc.line(25, y + 3, 185, y + 3); y += 15
    })
    doc.setFillColor(220, 252, 231); doc.roundedRect(70, y + 5, 70, 12, 3, 3, 'F')
    doc.setTextColor(21, 128, 61); doc.setFont('helvetica', 'bold'); doc.setFontSize(11)
    doc.text('✓ ADMITTED', 105, y + 13, { align: 'center' })
    doc.setTextColor(100, 100, 100); doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('PGIM Information Management System © 2026', 105, 270, { align: 'center' })
    doc.save(`PGIM-Admission-${ref}.pdf`)
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>

  const appliedCourseIds = myApplications.map(a => a.course_id)
  const enrolledApps = myApplications.filter(a => a.status === 'approved')

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm" style={{ background: '#15803D' }}>
          ✓ {toast}
        </div>
      )}

      {/* Payment Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                {[1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
                      style={step >= s ? { background: '#7a1515' } : {}}>
                      {step > s ? '✓' : s}
                    </div>
                    {s < 4 && <div className={`h-0.5 w-8 ${step > s ? 'bg-red-800' : 'bg-gray-200'}`} />}
                  </div>
                ))}
                <span className="text-xs text-gray-400 ml-2">
                  {step === 1 ? 'Personal Details' : step === 2 ? 'Review Order' : step === 3 ? 'Payment' : 'Confirmed'}
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-800">
                {step === 1 ? 'Course Registration — Personal Details' :
                 step === 2 ? 'Review Your Registration' :
                 step === 3 ? 'Mock Payment Gateway' : 'Registration Confirmed!'}
              </h3>
              {step < 4 && <p className="text-xs text-gray-400 mt-1">{modal.name}</p>}
            </div>
            <div className="p-6">
              {step === 1 && (
                <div>
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-5">
                    Please enter your personal details to register for this course.
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name *</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800" placeholder="Dr. Amali Wijesinghe" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">NIC Number *</label>
                      <input value={form.nic} onChange={e => setForm({ ...form, nic: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800" placeholder="9XXXXXXXXV" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">SLMC Reg. No. *</label>
                      <input value={form.slmc} onChange={e => setForm({ ...form, slmc: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800" placeholder="SLMC-XXXXX" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone Number</label>
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800" placeholder="+94 7X XXX XXXX" />
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700 mb-4">
                    ✓ Eligibility check passed — you meet the prerequisites for this course.
                  </div>
                  <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">Cancel</button>
                    <button onClick={() => setStep(2)} disabled={!form.name || !form.nic || !form.slmc}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50" style={{ background: '#7a1515' }}>
                      Next: Review Order →
                    </button>
                  </div>
                </div>
              )}
              {step === 2 && (
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Registration Summary</p>
                    {[['Course', modal.name], ['Candidate', form.name], ['NIC', form.nic], ['SLMC No.', form.slmc], ['Email', profile.email]].map(([l, v]) => (
                      <div key={l} className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">{l}</span>
                        <span className="text-sm font-medium text-gray-800">{v}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                      <span className="font-semibold text-gray-800">Registration Fee</span>
                      <span className="font-bold text-xl" style={{ color: '#7a1515' }}>LKR 45,000</span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">← Back</button>
                    <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#7a1515' }}>Proceed to Payment →</button>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-5 flex items-center gap-2">
                    <span>⚠️</span><span>Simulated payment gateway — no real transaction occurs.</span>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Card Holder Name</label>
                    <div className="mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-gray-50">{form.name}</div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Card Number</label>
                    <div className="mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-gray-50 flex items-center justify-between">
                      <span>4111 1111 1111 1111</span><span className="text-blue-600 font-bold text-xs">VISA</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Expiry Date</label>
                      <div className="mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-gray-50">12/28</div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">CVV</label>
                      <div className="mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-gray-50">•••</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Total Amount Due</p>
                      <p className="font-bold text-xl" style={{ color: '#7a1515' }}>LKR 45,000</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Course</p>
                      <p className="text-xs font-medium text-gray-700">{modal.name}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">← Back</button>
                    <button onClick={confirmPayment} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#15803D' }}>✓ Confirm Payment</button>
                  </div>
                </div>
              )}
              {step === 4 && admissionCard && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="font-bold text-green-700 text-lg">Payment Successful!</p>
                    <p className="text-sm text-gray-500 mt-1">You are now enrolled in <strong>{admissionCard.course}</strong></p>
                  </div>
                  <div className="rounded-xl border-2 overflow-hidden mb-5" style={{ borderColor: '#7a1515' }}>
                    <div className="text-white text-center py-3" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
                      <p className="text-xs opacity-75 font-medium">POSTGRADUATE INSTITUTE OF MEDICINE</p>
                      <p className="font-bold">ADMISSION CARD</p>
                    </div>
                    <div className="p-4 bg-white">
                      {[['Reference No.', admissionCard.ref], ['Candidate', admissionCard.name], ['NIC', admissionCard.nic], ['Course', admissionCard.course], ['Date Issued', admissionCard.date]].map(([l, v], i) => (
                        <div key={l} className={`flex justify-between mb-2 ${i === 0 ? 'pb-2 border-b border-gray-100' : ''}`}>
                          <span className="text-xs text-gray-500">{l}</span>
                          <span className={`text-xs font-medium ${i === 0 ? 'font-bold' : 'text-gray-800'}`} style={i === 0 ? { color: '#7a1515' } : {}}>{v}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className="text-xs font-bold text-green-700">✓ ADMITTED</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={downloadAdmissionCard} className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#c4a020' }}>⬇ Download Admission Card</button>
                    <button onClick={closeModal} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: '#7a1515' }}>Courses</h2>
            <p className="text-sm text-gray-500 mt-1">Browse available courses and manage your enrolments</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {[
            { key: 'available', label: '📚 Available Courses', count: courses.length },
            { key: 'enrolled', label: '🎓 My Enrolments', count: enrolledApps.length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition"
              style={{
                background: activeTab === tab.key ? '#7a1515' : 'white',
                color: activeTab === tab.key ? 'white' : '#374151',
                border: '1px solid #e5e7eb'
              }}>
              {tab.label}
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#f3f4f6', color: activeTab === tab.key ? 'white' : '#6b7280' }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Available Courses Tab */}
        {activeTab === 'available' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {courses.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-3xl mb-2">📚</p>
                <p className="text-sm">No courses open for registration at the moment</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-50">
                {courses.map(course => (
                  <div key={course.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
                        {course.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{course.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{course.description}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium mt-1 inline-block">
                          Registration Open
                        </span>
                      </div>
                    </div>
                    {appliedCourseIds.includes(course.id) ? (
                      <span className="text-xs px-4 py-2 rounded-lg bg-green-100 text-green-700 font-semibold">✓ Enrolled</span>
                    ) : (
                      <button onClick={() => openModal(course)}
                        className="text-sm px-5 py-2 rounded-lg text-white font-semibold" style={{ background: '#7a1515' }}>
                        Apply Now
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Enrolments Tab */}
        {activeTab === 'enrolled' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {enrolledApps.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <p className="text-3xl mb-2">🎓</p>
                <p className="text-sm">No enrolments yet — apply for a course to get started</p>
                <button onClick={() => setActiveTab('available')}
                  className="mt-4 text-sm px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                  Browse Courses
                </button>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-gray-50">
                {enrolledApps.map(app => (
                  <div key={app.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #15803D, #166534)' }}>
                        ✓
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{app.courses?.name}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">enrolled</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">paid</span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => downloadExistingCard(app)}
                      className="text-sm px-5 py-2 rounded-lg text-white font-semibold flex items-center gap-2" style={{ background: '#15803D' }}>
                      ⬇ Admission Card
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}