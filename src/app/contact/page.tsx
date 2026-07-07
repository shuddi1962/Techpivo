"use client"

import { useState } from "react"
import { contactFormSchema, getFieldErrors, type ContactFormData } from "@/lib/validation"
import { sanitize, sanitizeEmail } from "@/lib/sanitize"

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [serverError, setServerError] = useState("")

  const validateField = (field: keyof ContactFormData, value: string) => {
    const fieldSchema = contactFormSchema.shape[field]
    const result = fieldSchema.safeParse(value)
    setErrors(prev => {
      const next = { ...prev }
      if (!result.success) next[field] = result.error.issues[0]?.message || "Invalid"
      else delete next[field]
      return next
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name as keyof ContactFormData, value)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setServerError("")

    const result = contactFormSchema.safeParse(formData)
    if (!result.success) {
      setErrors(getFieldErrors(result.error))
      setSubmitting(false)
      return
    }

    const sanitized = {
      name: sanitize(result.data.name),
      email: sanitizeEmail(result.data.email),
      subject: sanitize(result.data.subject || ""),
      message: sanitize(result.data.message),
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.errors) setErrors(data.errors)
        throw new Error(data.error || "Failed to send")
      }
      setDone(true)
    } catch (err: any) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="relative overflow-hidden mb-12 min-h-[320px] flex items-center">
        <img src="https://images.pexels.com/photos/8204327/pexels-photo-8204327.jpeg" alt="Customer service team" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 md:px-12 lg:px-16 py-16 text-white max-w-4xl">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
          <p className="text-lg text-white/80">We value your feedback and inquiries. Here is how you can reach the right team.</p>
        </div>
      </div>

      <div className="px-4 md:px-12 lg:px-16 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xl mb-4">📰</div>
          <h2 className="text-xl font-bold mb-3">Editorial Inquiries</h2>
          <p className="text-sm text-muted-foreground mb-4">For story tips, press releases, corrections, or content suggestions.</p>
          <a href="mailto:editorial@Techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">editorial@Techpivo.com</a>
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-xl mb-4">📢</div>
          <h2 className="text-xl font-bold mb-3">Advertising & Partnerships</h2>
          <p className="text-sm text-muted-foreground mb-4">Interested in advertising or partnership opportunities?</p>
          <a href="mailto:ads@Techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">ads@Techpivo.com</a>
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-3">Privacy & Legal</h2>
          <p className="text-sm text-muted-foreground mb-4">For privacy-related requests or legal inquiries.</p>
          <a href="mailto:legal@Techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">legal@Techpivo.com</a>
        </div>

        <div className="bg-card border rounded-2xl p-6">
          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-xl mb-4">💬</div>
          <h2 className="text-xl font-bold mb-3">General Feedback</h2>
          <p className="text-sm text-muted-foreground mb-4">Something on your mind? We read every message.</p>
          <a href="mailto:hello@Techpivo.com" className="inline-flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">hello@Techpivo.com</a>
        </div>
      </div>

      <section className="bg-card border rounded-2xl p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Send Us a Message</h2>
        {done ? (
          <div className="max-w-2xl mx-auto text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-lg font-medium">Message sent successfully!</p>
            <p className="text-sm text-muted-foreground mt-1">We will get back to you as soon as possible.</p>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none ${errors.name ? 'border-red-500' : ''}`} placeholder="Your name" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none ${errors.email ? 'border-red-500' : ''}`} placeholder="you@example.com" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input type="text" name="subject" value={formData.subject} onChange={handleChange} className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none ${errors.subject ? 'border-red-500' : ''}`} placeholder="How can we help?" />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea name="message" value={formData.message} onChange={handleChange} rows={5} className={`w-full bg-background border rounded-lg px-4 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none ${errors.message ? 'border-red-500' : ''}`} placeholder="Write your message..." />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message}</p>}
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <button type="submit" disabled={submitting || Object.keys(errors).length > 0} className="bg-accent text-white px-6 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm w-full sm:w-auto disabled:opacity-50">
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>
        )}
      </section>

      <div className="text-center text-sm text-muted-foreground">
        You can also write to us at: <span className="font-medium text-foreground">Techpivo Media, 123 Innovation Drive, San Francisco, CA 94105</span>
      </div>
      </div>
    </div>
  )
}
