'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import jsPDF from 'jspdf'

export default function TraineeExamsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [examSessions, setExamSessions] = useState<any[]>([])
  const [myRegistrations, setMyRegistrations] = useState<any[]>([])
  const [appealText, setAppealText] = useState<{ [key: string]: string }>({})
  const [toast, setToast] = useState('')
  const [modal, setModal] = useState<any>(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', nic: '', slmc: '', phone: '' })
  const [admissionSlip, setAdmissionSlip] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) { router.push('/login'); return }
      setProfile(p)
      loadData(user.id)
    }
    load()
  }, [])

  async function loadData(userId: string) {
    const { data: e } = await supabase.from('exam_sessions')
      .select('*, courses(name)').order('created_at', { ascending: false })
    setExamSessions(e || [])
    const { data: r } = await supabase.from('exam_registrations')
      .select('*, exam_sessions(name, exam_date, courses(name))')
      .eq('candidate_id', userId)
    setMyRegistrations(r || [])
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function openModal(exam: any) {
    setModal(exam)
    setStep(1)
    setForm({ name: profile?.full_name || '', nic: '', slmc: '', phone: '' })
    setAdmissionSlip(null)
  }

  function closeModal() {
    setModal(null)
    setStep(1)
    setAdmissionSlip(null)
  }

  async function confirmPayment() {
    if (!modal || !profile) return
    await supabase.from('exam_registrations').insert({
      candidate_id: profile.id,
      exam_session_id: modal.id,
    })
    await supabase.from('activity_log').insert({
      user_id: profile.id,
      action: `Registered and paid for exam: ${modal.name}`
    })
    await loadData(profile.id)
    const ref = 'PGIM-EX-' + Date.now().toString().slice(-6)
    setAdmissionSlip({
      ref,
      name: form.name,
      nic: form.nic,
      slmc: form.slmc,
      exam: modal.name,
      course: modal.courses?.name,
      date: modal.exam_date ? new Date(modal.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD',
      issued: new Date().toLocaleDateString('en-GB'),
    })
    setStep(4)
  }

  function downloadSlip() {
    if (!admissionSlip) return
    const doc = new jsPDF()

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
    doc.text('EXAM ADMISSION SLIP', 105, 40, { align: 'center' })

    doc.setDrawColor(196, 160, 32)
    doc.setLineWidth(1)
    doc.line(20, 50, 190, 50)

    doc.setTextColor(122, 21, 21)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Reference No: ${admissionSlip.ref}`, 105, 60, { align: 'center' })

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    const details = [
      ['Candidate Name', admissionSlip.name],
      ['NIC Number', admissionSlip.nic],
      ['SLMC Reg. No', admissionSlip.slmc],
      ['Exam Session', admissionSlip.exam],
      ['Course', admissionSlip.course],
      ['Exam Date', admissionSlip.date],
      ['Date Issued', admissionSlip.issued],
      ['Status', 'REGISTERED'],
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
    doc.text('✓ REGISTERED', 105, y + 13, { align: 'center' })

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Present this slip at the examination venue.', 105, 258, { align: 'center' })
    doc.text('PGIM Information Management System © 2026', 105, 264, { align: 'center' })

    doc.save(`PGIM-Exam-Slip-${admissionSlip.ref}.pdf`)
  }

  async function submitAppeal(regId: string) {
    const text = appealText[regId]
    if (!text) return
    await supabase.from('exam_registrations').update({
      appeal_status: 'pending',
      appeal_text: text
    }).eq('id', regId)
    await loadData(profile.id)
    showToast('Appeal submitted successfully')
    setAppealText(prev => ({ ...prev, [regId]: '' }))
  }

  if (!profile) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>

  const registeredExamIds = myRegistrations.map(r => r.exam_session_id)

  return (
    <div className="min-h-screen" style={{ background: '#f9f5f0' }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 text-white px-5 py-3 rounded-xl shadow-lg font-medium text-sm" style={{ background: '#15803D' }}>
          ✓ {toast}
        </div>
      )}

      {/* Exam Registration Payment Modal */}
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
                  {step === 1 ? 'Personal Details' : step === 2 ? 'Review' : step === 3 ? 'Payment' : 'Confirmed'}
                </span>
              </div>
              <h3 className="font-bold text-lg text-gray-800">
                {step === 1 ? 'Exam Registration — Personal Details' :
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
                    Please confirm your personal details for this exam registration.
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
                  <div className="flex gap-3">
                    <button onClick={closeModal}
                      className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm font-medium">
                      Cancel
                    </button>
                    <button onClick={() => setStep(2)}
                      disabled={!form.name || !form.nic || !form.slmc}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                      style={{ background: '#7a1515' }}>
                      Next: Review →
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
                      <span className="text-sm text-gray-600">Exam Session</span>
                      <span className="text-sm font-semibold text-gray-800">{modal.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Course</span>
                      <span className="text-sm font-medium text-gray-800">{modal.courses?.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">Exam Date</span>
                      <span className="text-sm font-medium text-gray-800">
                        {modal.exam_date ? new Date(modal.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}
                      </span>
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
                    <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                      <span className="font-semibold text-gray-800">Exam Fee</span>
                      <span className="font-bold text-xl" style={{ color: '#7a1515' }}>LKR 5,000</span>
                    </div>
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
                    <span>Simulated payment gateway — no real transaction occurs.</span>
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
                      <p className="font-bold text-xl" style={{ color: '#7a1515' }}>LKR 5,000</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Exam</p>
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

              {/* Step 4 — Confirmation + Admission Slip */}
              {step === 4 && admissionSlip && (
                <div>
                  <div className="text-center mb-5">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="font-bold text-green-700 text-lg">Registration Confirmed!</p>
                    <p className="text-sm text-gray-500 mt-1">You are registered for <strong>{admissionSlip.exam}</strong></p>
                  </div>

                  {/* Admission Slip Preview */}
                  <div className="rounded-xl border-2 overflow-hidden mb-5" style={{ borderColor: '#7a1515' }}>
                    <div className="text-white text-center py-3" style={{ background: 'linear-gradient(135deg, #7a1515, #4a0a0a)' }}>
                      <p className="text-xs opacity-75 font-medium">POSTGRADUATE INSTITUTE OF MEDICINE</p>
                      <p className="font-bold">EXAM ADMISSION SLIP</p>
                    </div>
                    <div className="p-4 bg-white">
                      <div className="flex justify-between mb-2 pb-2 border-b border-gray-100">
                        <span className="text-xs text-gray-500">Reference No.</span>
                        <span className="text-xs font-bold" style={{ color: '#7a1515' }}>{admissionSlip.ref}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Candidate</span>
                        <span className="text-xs font-medium text-gray-800">{admissionSlip.name}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">NIC</span>
                        <span className="text-xs font-medium text-gray-800">{admissionSlip.nic}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Exam Session</span>
                        <span className="text-xs font-medium text-gray-800">{admissionSlip.exam}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-xs text-gray-500">Exam Date</span>
                        <span className="text-xs font-medium text-gray-800">{admissionSlip.date}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className="text-xs font-bold text-green-700">✓ REGISTERED</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={downloadSlip}
                      className="flex-1 py-2.5 rounded-lg text-white text-sm font-medium" style={{ background: '#c4a020' }}>
                      ⬇ Download Admission Slip
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
          <Image src="/logo.png" alt="PGIM" width={45} height={45} />
          <div><h1 className="font-bold text-lg">PGIM</h1><p className="text-xs opacity-75">Information Management System</p></div>
        </div>
        <button onClick={() => router.push('/dashboard/trainee')} className="text-xs px-3 py-1 rounded border border-white/30 hover:bg-white/10">← Back</button>
      </header>

      <div className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-2xl font-bold mb-2" style={{ color: '#7a1515' }}>Examinations</h2>
        <p className="text-gray-500 mb-6">Register for exams, view results and submit appeals</p>

        {/* Available Exams */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">📋 Available Exam Sessions</h3>
          {examSessions.length === 0 && (
            <p className="text-gray-400 text-sm">No exam sessions available yet</p>
          )}
          <div className="flex flex-col gap-3">
            {examSessions.map(exam => (
              <div key={exam.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100" style={{ background: '#f9f5f0' }}>
                <div>
                  <p className="font-medium text-gray-800">{exam.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {exam.courses?.name} • {exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date TBD'}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-1 inline-block font-medium">
                    {exam.status}
                  </span>
                </div>
                {registeredExamIds.includes(exam.id) ? (
                  <span className="text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">
                    ✓ Registered
                  </span>
                ) : (
                  <button onClick={() => openModal(exam)}
                    className="text-xs px-4 py-2 rounded-lg text-white font-medium" style={{ background: '#7a1515' }}>
                    Register & Pay
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* My Results */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-800 mb-4">📊 My Exam Results</h3>
          {myRegistrations.length === 0 && (
            <p className="text-gray-400 text-sm">No exam registrations yet</p>
          )}
          <div className="flex flex-col gap-4">
            {myRegistrations.map(reg => (
              <div key={reg.id} className="p-5 rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-800">{reg.exam_sessions?.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{reg.exam_sessions?.courses?.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {!reg.result ? (
                      <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                        ⏳ Results not published yet
                      </span>
                    ) : (
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${reg.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {reg.result === 'pass' ? '✓ Pass' : '✗ Fail'}
                      </span>
                    )}
                    {reg.appeal_status && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                        Appeal: {reg.appeal_status}
                      </span>
                    )}
                    {reg.appeal_response && (
                      <p className="text-xs text-gray-500 mt-1 text-right max-w-48">Response: {reg.appeal_response}</p>
                    )}
                  </div>
                </div>

                {/* Appeal Section */}
                {reg.result === 'fail' && !reg.appeal_status && (
                  <div className="mt-3 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-700 mb-1">📩 Submit Appeal / Rechecking Request</p>
                    <p className="text-xs text-gray-500 mb-3">
                      You may appeal this result within 14 days. Provide clear grounds for your appeal.
                    </p>
                    <textarea
                      value={appealText[reg.id] || ''}
                      onChange={e => setAppealText(prev => ({ ...prev, [reg.id]: e.target.value }))}
                      placeholder="Describe the grounds for your appeal..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 mb-3" rows={3} />
                    <button onClick={() => submitAppeal(reg.id)}
                      disabled={!appealText[reg.id]}
                      className="text-xs px-5 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                      style={{ background: '#7a1515' }}>
                      Submit Appeal
                    </button>
                  </div>
                )}

                {reg.appeal_status && reg.appeal_status !== 'pending' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className={`p-3 rounded-lg text-xs ${reg.appeal_status === 'upheld' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <p className="font-semibold">Appeal {reg.appeal_status === 'upheld' ? 'Upheld ✓' : 'Rejected ✗'}</p>
                      {reg.appeal_response && <p className="mt-1">{reg.appeal_response}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}