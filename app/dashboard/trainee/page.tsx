'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import jsPDF from 'jspdf'

export default function TraineeDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [myApplications, setMyApplications] = useState<any[]>([])
  const [isSwitched, setIsSwitched] = useState(false)
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [admissionCard, setAdmissionCard] = useState<any>(null)
  const [form, setForm] = useState({ name: '', nic: '', slmc: '', phone: '' })
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSwitched(!!sessionStorage.getItem('switched_role'))
    }
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
      ref,
      name: form.name,
      nic: form.nic,
      slmc: form.slmc,
      email: profile.email,
      course: modal.name,
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    })
    setStep(4)
  }

  function downloadAdmissionCard() {
    if (!admissionCard) return
    const doc = new jsPDF()
    
    // Border
    doc.setDrawColor(122, 21, 21)
    doc.setLineWidth(2)
    doc.rect(10, 10, 190, 277)
    doc.setLineWidth(0.5)
    doc.rect(13, 13, 184, 271)
    
    // Header background
    doc.setFillColor(122, 21, 21)
    doc.rect(10, 10, 190, 35, 'F')
    
    // Logo placeholder circle
    doc.setFillColor(196, 160, 32)
    doc.circle(30, 27, 10, 'F')
    
    // Header text
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('POSTGRADUATE INSTITUTE OF MEDICINE', 105, 22, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('University of Colombo, Sri Lanka', 105, 30, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('ADMISSION CARD', 105, 40, { align: 'center' })
    
    // Divider
    doc.setDrawColor(196, 160, 32)
    doc.setLineWidth(1)
    doc.line(20, 50, 190, 50)
    
    // Reference number
    doc.setTextColor(122, 21, 21)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Reference No: ${admissionCard.ref}`, 105, 60, { align: 'center' })
    
    // Details
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    const details = [
      ['Candidate Name', admissionCard.name],
      ['Email Address', admissionCard.email],
      ['Course', admissionCard.course],
      ['Date Issued', admissionCard.date],
      ['Enrolment Status', 'ADMITTED'],
    ]
    let y = 75
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text(label + ':', 25, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(value || '', 90, y)
      doc.setDrawColor(220, 220, 220)
      doc.line(25, y + 3, 185, y + 3)
      y += 15
    })
    
    // Status badge
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(70, y + 5, 70, 12, 3, 3, 'F')
    doc.setTextColor(21, 128, 61)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('✓ ADMITTED', 105, y + 13, { align: 'center' })
    
    // Footer
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('This admission card confirms your enrolment at PGIM.', 105, 250, { align: 'center' })
    doc.text('Please present this card at the examination venue.', 105, 256, { align: 'center' })
    doc.text('PGIM Information Management System © 2026', 105, 270, { align: 'center' })
    
    doc.save(`PGIM-Admission-${admissionCard.ref}.pdf`)
  }

  function downloadExistingCard(app: any) {
    const doc = new jsPDF()
    const ref = 'PGIM-' + app.id?.slice(-6).toUpperCase()
    
    doc.setDrawColor(122, 21, 21)
    doc.setLineWidth(2)
    doc.rect(10, 10, 190, 277)
    doc.setLineWidth(0.5)
    doc.rect(13, 13, 184, 271)
    
    doc.setFillColor(122, 21, 21)
    doc.rect(10, 10, 190, 35, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('POSTGRADUATE INSTITUTE OF MEDICINE', 105, 22, { align: 'center' })
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('University of Colombo, Sri Lanka', 105, 30, { align: 'center' })
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('ADMISSION CARD', 105, 40, { align: 'center' })
    
    doc.setDrawColor(196, 160, 32)
    doc.setLineWidth(1)
    doc.line(20, 50, 190, 50)
    
    doc.setTextColor(122, 21, 21)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Reference No: ${ref}`, 105, 60, { align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    const details = [
      ['Candidate Name', profile.full_name],
      ['Email Address', profile.email],
      ['Course', app.courses?.name],
      ['Date Issued', new Date().toLocaleDateString('en-GB')],
      ['Enrolment Status', 'ADMITTED'],
    ]
    let y = 75
    details.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 100, 100)
      doc.text(label + ':', 25, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)
      doc.text(value || '', 90, y)
      doc.setDrawColor(220, 220, 220)
      doc.line(25, y + 3, 185, y + 3)
      y += 15
    })
    
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(70, y + 5, 70, 12, 3, 3, 'F')
    doc.setTextColor(21, 128, 61)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('✓ ADMITTED', 105, y + 13, { align: 'center' })
    
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('This admission card confirms your enrolment at PGIM.', 105, 250, { align: 'center' })
    doc.text('Please present this card at the examination venue.', 105, 256, { align: 'center' })
    doc.text('PGIM Information Management System © 2026', 105, 270, { align: 'center' })
    
    doc.save(`PGIM-Admission-${ref}.pdf`)
  }

  async function handleSignOut() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('switched_role')
      sessionStorage.removeItem('original_role')
    }
    await supabase.auth.signOut()
    router.push('/login')
  }

  function backToAdmin() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('switched_role')
      sessionStorage.removeItem('original_role')
    }
    router.push('/dashboard/admin')
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>

  const appliedCourseIds = myApplications.map(a => a.course_id)

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm" style={{ background: '#15803D' }}>
          ✓ {toast}
        </div>
      )}

      {/* Registration & Payment Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Step Indicator */}
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
                 step === 3 ? 'Mock Payment Gateway' :
                 'Registration Confirmed!'}
              </h3>
              {step < 4 && <p className="text-xs text-gray-400 mt-1">{modal.name}</p>}
            </div>

            <div className="p-6">

              {/* Step 1 — Personal Details */}
              {step === 1 && (
                <div>
                  <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 mb-5">
                    Please enter your personal details to register for this course.
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Full Name *</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                        placeholder="Dr. Amali Wijesinghe" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">NIC Number *</label>
                      <input value={form.nic} onChange={e => setForm({ ...form, nic: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                        placeholder="9XXXXXXXXV" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">SLMC Reg. No. *</label>
                      <input value={form.slmc} onChange={e => setForm({ ...form, slmc: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                        placeholder="SLMC-XXXXX" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone Number</label>
                      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800"
                        placeholder="+94 7X XXX XXXX" />
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700 mb-4">
                    ✓ Eligibility check passed — you meet the prerequisites for this course.
                  </div>
                  <div className="flex gap-3">
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                      Cancel
                    </button>
                    <button onClick={() => setStep(2)}
                      disabled={!form.name || !form.nic || !form.slmc}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                      style={{ background: '#7a1515' }}>
                      Next: Review Order →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 — Review */}
              {step === 2 && (
                <div>
                  <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Registration Summary</p>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Course</span>
                      <span className="text-sm font-semibold text-gray-800">{modal.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Candidate</span>
                      <span className="text-sm font-medium text-gray-800">{form.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">NIC</span>
                      <span className="text-sm font-medium text-gray-800">{form.nic}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">SLMC No.</span>
                      <span className="text-sm font-medium text-gray-800">{form.slmc}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Email</span>
                      <span className="text-sm font-medium text-gray-800">{profile.email}</span>
                    </div>
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                      <span className="font-semibold text-gray-800">Registration Fee</span>
                      <span className="font-bold text-xl" style={{ color: '#7a1515' }}>LKR 45,000</span>
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700 mb-4">
                    ℹ️ Clicking "Proceed to Payment" will redirect you to the mock payment gateway.
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                      ← Back
                    </button>
                    <button onClick={() => setStep(3)}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#7a1515' }}>
                      Proceed to Payment →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Payment */}
              {step === 3 && (
                <div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 mb-5 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>Simulated payment gateway — no real transaction occurs. This is a PoC demo.</span>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Card Holder Name</label>
                    <div className="mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-gray-50">
                      {form.name}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Card Number</label>
                    <div className="mt-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-gray-50 flex items-center justify-between">
                      <span>4111 1111 1111 1111</span>
                      <span className="text-blue-600 font-bold text-xs">VISA</span>
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
                    <button onClick={() => setStep(2)}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                      ← Back
                    </button>
                    <button onClick={confirmPayment}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#15803D' }}>
                      ✓ Confirm Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 — Confirmation + Admission Card */}
              {step === 4 && admissionCard && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="font-bold text-green-700 text-lg">Payment Successful!</p>
                    <p className="text-sm text-gray-500 mt-1">You are now enrolled in <strong>{admissionCard.course}</strong></p>
                  </div>

                  {/* Admission Card Preview */}
                  <div className="rounded-xl border-2 overflow-hidden mb-5" style={{ borderColor: '#7a1515' }}>
                    <div className="text-white text-center py-3" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
                      <p className="text-xs opacity-75 font-medium">POSTGRADUATE INSTITUTE OF MEDICINE</p>
                      <p className="font-bold">ADMISSION CARD</p>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex justify-between mb-2 pb-2 border-b border-gray-100">
                        <span className="text-xs text-gray-500">Reference No.</span>
                        <span className="text-xs font-bold" style={{ color: '#7a1515' }}>{admissionCard.ref}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Candidate Name</span>
                        <span className="text-xs font-medium text-gray-800">{admissionCard.name}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">NIC Number</span>
                        <span className="text-xs font-medium text-gray-800">{admissionCard.nic}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">SLMC Reg. No.</span>
                        <span className="text-xs font-medium text-gray-800">{admissionCard.slmc}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Course</span>
                        <span className="text-xs font-medium text-gray-800">{admissionCard.course}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Date Issued</span>
                        <span className="text-xs font-medium text-gray-800">{admissionCard.date}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className="text-xs font-bold text-green-700">✓ ADMITTED</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={downloadAdmissionCard}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#c4a020' }}>
                      ⬇ Download Admission Card
                    </button>
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="text-white px-8 py-4 flex items-center justify-between shadow" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
        <div className="flex items-center gap-3">
          <Image src="/logo-user-transparent-v1.png" alt="PGIM" width={45} height={45} className="rounded-full object-cover" />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Welcome, {profile.full_name}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#c4a020' }}>Trainee</span>
          {isSwitched && (
            <button onClick={backToAdmin} className="text-xs px-3 py-1 rounded border border-yellow-400 text-yellow-400 hover:bg-yellow-400/10">
              ← Back to Admin
            </button>
          )}
          <button onClick={handleSignOut} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">Sign Out</button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Trainee Dashboard</h2>
        <p className="text-gray-500 mb-8">Welcome, {profile.full_name}. Manage your registrations, portfolio and exams.</p>

        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Trainee Dashboard</h2>
        <p className="text-gray-500 mb-8">Welcome, {profile.full_name}. Manage your registrations, portfolio and exams.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Enrolled Courses', value: myApplications.filter(a => a.status === 'approved').length, icon: '🎓' },
            { label: 'Applications', value: myApplications.length, icon: '📝' },
            { label: 'Available Courses', value: courses.length, icon: '📚' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold" style={{ color: '#7a1515' }}>{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 4 Navigation Cards */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => router.push('/dashboard/trainee/courses')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#fdf5f5' }}>📚</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Course Registration</h3>
                <p className="text-sm text-gray-500 mt-1">Browse and apply for available postgraduate courses</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">{courses.length} courses open</span>
              <span className="text-xs font-semibold" style={{ color: '#7a1515' }}>Open →</span>
            </div>
          </button>

          <button onClick={() => router.push('/dashboard/trainee/courses')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#f0fdf4' }}>🎓</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">My Enrolments</h3>
                <p className="text-sm text-gray-500 mt-1">View enrolled courses and download admission cards</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                {myApplications.filter(a => a.status === 'approved').length} enrolled
              </span>
              <span className="text-xs font-semibold" style={{ color: '#7a1515' }}>Open →</span>
            </div>
          </button>

          <button onClick={() => router.push('/dashboard/trainee/portfolio')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#faf5ff' }}>📁</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">My e-Portfolio</h3>
                <p className="text-sm text-gray-500 mt-1">Submit and track logbook entries per course</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">Cases</span>
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">Procedures</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#7a1515' }}>Open →</span>
            </div>
          </button>

          <button onClick={() => router.push('/dashboard/trainee/exams')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: '#eff6ff' }}>📋</div>
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Examinations</h3>
                <p className="text-sm text-gray-500 mt-1">Register for exams, view results, submit appeals</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex gap-1">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Register</span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">Results</span>
              </div>
              <span className="text-xs font-semibold" style={{ color: '#7a1515' }}>Open →</span>
            </div>
          </button>
        </div>

        {/* Available Courses */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">📚 Available Courses</h3>
          {courses.length === 0 && <p className="text-gray-400 text-sm">No courses open for registration</p>}
          <div className="flex flex-col gap-3">
            {courses.map(course => (
              <div key={course.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100" style={{ background: '#f9f5f0' }}>
                <div>
                  <p className="font-medium text-gray-800">{course.name}</p>
                  <p className="text-xs text-gray-500">{course.description}</p>
                </div>
                {appliedCourseIds.includes(course.id) ? (
                  <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">✓ Enrolled</span>
                ) : (
                  <button onClick={() => openModal(course)}
                    className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                    Apply Now
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* My Enrolments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">📝 My Enrolments</h3>
          {myApplications.length === 0 && <p className="text-gray-400 text-sm">No enrolments yet</p>}
          <div className="flex flex-col gap-3">
            {myApplications.map(app => (
              <div key={app.id} className="p-4 rounded-lg border border-gray-100 flex items-center justify-between" style={{ background: '#f9f5f0' }}>
                <div>
                  <p className="font-medium text-gray-800">{app.courses?.name}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {app.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {app.payment_status}
                    </span>
                  </div>
                </div>
                {app.payment_status === 'paid' && (
                  <button onClick={() => downloadExistingCard(app)}
                    className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#15803D' }}>
                    ⬇ Admission Card
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={() => router.push('/dashboard/trainee/portfolio')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition flex items-start gap-4">
            <div className="text-3xl">📁</div>
            <div>
              <h3 className="font-semibold text-gray-800">My e-Portfolio</h3>
              <p className="text-sm text-gray-500 mt-1">Submit and track logbook entries per course</p>
            </div>
          </button>
          <button onClick={() => router.push('/dashboard/trainee/exams')}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-left hover:shadow-md transition flex items-start gap-4">
            <div className="text-3xl">📋</div>
            <div>
              <h3 className="font-semibold text-gray-800">Examinations</h3>
              <p className="text-sm text-gray-500 mt-1">Register for exams, view results, submit appeals</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}