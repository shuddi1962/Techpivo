'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams }     from 'next/navigation'

function UnsubscribeForm() {
  const params = useSearchParams()
  const email  = params.get('email') || ''
  const [status, setStatus] = useState<'loading'|'ok'|'err'>('loading')

  useEffect(() => {
    if (!email) { setStatus('err'); return }
    fetch(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`)
      .then(r => setStatus(r.ok ? 'ok' : 'err'))
      .catch(()  => setStatus('err'))
  }, [email])

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        {status === 'loading' && (
          <p style={{ color: '#94A3B8' }}>Processing your unsubscribe request...</p>
        )}
        {status === 'ok' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#F0F4FF' }}>
              You have been unsubscribed
            </h1>
            <p style={{ color: '#64748B', margin: '0 0 24px' }}>
              {email} has been removed from all Techpivo newsletters.
            </p>
            <a href="/" style={{ color: '#F59E0B', textDecoration: 'none', fontWeight: 500 }}>
              ← Back to Techpivo
            </a>
          </>
        )}
        {status === 'err' && (
          <>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', color: '#F0F4FF' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#64748B', margin: '0 0 16px' }}>
              Please email <a href="mailto:hello@techpivo.com" style={{ color: '#F59E0B' }}>hello@techpivo.com</a> to unsubscribe manually.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}><p style={{ color: '#94A3B8' }}>Loading...</p></div>}>
      <UnsubscribeForm />
    </Suspense>
  )
}
