"use client";

import { useState } from "react";
import { contactFormSchema, getFieldErrors, type ContactFormData } from "@/lib/validation";
import { sanitize, sanitizeEmail } from "@/lib/sanitize";

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState("");

  const validateField = (field: keyof ContactFormData, value: string) => {
    const fieldSchema = contactFormSchema.shape[field];
    const result = fieldSchema.safeParse(value);
    setErrors(prev => {
      const next = { ...prev };
      if (!result.success) next[field] = result.error.issues[0]?.message || "Invalid";
      else delete next[field];
      return next;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name as keyof ContactFormData, value);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setServerError("");

    const result = contactFormSchema.safeParse(formData);
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      setSubmitting(false);
      return;
    }

    const sanitized = {
      name: sanitize(result.data.name),
      email: sanitizeEmail(result.data.email),
      subject: sanitize(result.data.subject || ""),
      message: sanitize(result.data.message),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitized),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        throw new Error(data.error || "Failed to send");
      }
      setDone(true);
    } catch (err: any) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="bg-card border rounded-2xl p-8 my-8" id="contact-form">
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
  );
}