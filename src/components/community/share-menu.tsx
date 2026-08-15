'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Copy, Link2, Mail, Share2 } from 'lucide-react';

const XLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1200 1227" className={className} fill="currentColor" aria-hidden="true">
    <path d="M714.163 519.284 1160.89 0h-105.86L667.137 450.887 357.328 0H0l468.492 681.821L0 1226.37h105.866l409.625-476.152 327.181 476.152H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
  </svg>
);

const FacebookLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
  </svg>
);

const WhatsAppLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 360 362" className={className} fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M307.546 52.566C273.709 18.684 228.706.017 180.756 0 81.951 0 1.538 80.404 1.504 179.235c-.017 31.594 8.242 62.432 23.928 89.609L0 361.736l95.024-24.925c26.179 14.285 55.659 21.805 85.655 21.814h.077c98.788 0 179.21-80.413 179.244-179.244.017-47.898-18.608-92.926-52.454-126.807v-.008Zm-126.79 275.788h-.06c-26.73-.008-52.952-7.194-75.831-20.765l-5.44-3.231-56.391 14.791 15.05-54.981-3.542-5.638c-14.912-23.721-22.793-51.139-22.776-79.286.035-82.14 66.867-148.973 149.051-148.973 39.793.017 77.198 15.53 105.328 43.695 28.131 28.157 43.61 65.596 43.593 105.398-.035 82.149-66.867 148.982-148.982 148.982v.008Zm81.719-111.577c-4.478-2.243-26.497-13.073-30.606-14.568-4.108-1.496-7.09-2.243-10.073 2.243-2.982 4.487-11.568 14.577-14.181 17.559-2.613 2.991-5.226 3.361-9.704 1.117-4.477-2.243-18.908-6.97-36.02-22.226-13.313-11.878-22.304-26.54-24.916-31.027-2.613-4.486-.275-6.91 1.959-9.136 2.011-2.011 4.478-5.234 6.721-7.847 2.244-2.613 2.983-4.486 4.478-7.469 1.496-2.991.748-5.603-.369-7.847-1.118-2.243-10.073-24.289-13.812-33.253-3.636-8.732-7.331-7.546-10.073-7.692-2.613-.13-5.595-.155-8.586-.155-2.991 0-7.839 1.118-11.947 5.604-4.108 4.486-15.677 15.324-15.677 37.361s16.047 43.344 18.29 46.335c2.243 2.991 31.585 48.225 76.51 67.632 10.684 4.615 19.029 7.374 25.535 9.437 10.727 3.412 20.49 2.931 28.208 1.779 8.604-1.289 26.498-10.838 30.228-21.298 3.73-10.46 3.73-19.433 2.613-21.298-1.117-1.865-4.108-2.991-8.586-5.234l.008-.017Z" clipRule="evenodd" />
  </svg>
);

const TelegramLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 256 256" className={className} aria-hidden="true">
    <path fill="#229ED9" d="M128 0C94.06 0 61.48 13.494 37.5 37.49A128.038 128.038 0 0 0 0 128c0 33.934 13.5 66.514 37.5 90.51C61.48 242.506 94.06 256 128 256s66.52-13.494 90.5-37.49c24-23.996 37.5-56.576 37.5-90.51 0-33.934-13.5-66.514-37.5-90.51C194.52 13.494 161.94 0 128 0Z" />
    <path fill="#FFF" d="M57.94 126.648c37.32-16.256 62.2-26.974 74.64-32.152 35.56-14.786 42.94-17.354 47.76-17.441 1.06-.017 3.42.245 4.96 1.49 1.28 1.05 1.64 2.47 1.82 3.467.16.996.38 3.266.2 5.038-1.92 20.24-10.26 69.356-14.5 92.026-1.78 9.592-5.32 12.808-8.74 13.122-7.44.684-13.08-4.912-20.28-9.63-11.26-7.386-17.62-11.982-28.56-19.188-12.64-8.328-4.44-12.906 2.76-20.386 1.88-1.958 34.64-31.748 35.26-34.45.08-.338.16-1.598-.6-2.262-.74-.666-1.84-.438-2.64-.258-1.14.256-19.12 12.152-54 35.686-5.1 3.508-9.72 5.218-13.88 5.128-4.56-.098-13.36-2.584-19.9-4.708-8-2.606-14.38-3.984-13.82-8.41.28-2.304 3.46-4.662 9.52-7.072Z" />
  </svg>
);

const LinkedInLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 256 256" className={className} fill="currentColor" aria-hidden="true">
    <path d="M218.123 218.127h-37.931v-59.403c0-14.165-.253-32.4-19.728-32.4-19.756 0-22.779 15.434-22.779 31.369v60.43h-37.93V95.967h36.413v16.694h.51a39.907 39.907 0 0 1 35.928-19.733c38.445 0 45.533 25.288 45.533 58.186l-.016 67.013ZM56.955 79.27c-12.157.002-22.014-9.852-22.016-22.009-.002-12.157 9.851-22.014 22.008-22.016 12.157-.003 22.014 9.851 22.016 22.008A22.013 22.013 0 0 1 56.955 79.27m18.966 138.858H37.95V95.967h37.97v122.16ZM237.033.018H18.89C8.58-.098.125 8.161-.001 18.471v219.053c.122 10.315 8.576 18.582 18.89 18.474h218.144c10.336.128 18.823-8.139 18.966-18.474V18.454c-.147-10.33-8.635-18.588-18.966-18.453" />
  </svg>
);

interface ShareTarget {
  key: string;
  label: string;
  color: string;
  bg: string;
  icon: (cls: string) => React.ReactNode;
  href: (url: string, title: string) => string;
}

const TARGETS: ShareTarget[] = [
  {
    key: 'x',
    label: 'X',
    color: '#000000',
    bg: '#F5F5F5',
    icon: c => <XLogo className={c} />,
    href: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    color: '#FFFFFF',
    bg: '#0866FF',
    icon: c => <FacebookLogo className={c} />,
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    color: '#FFFFFF',
    bg: '#25D366',
    icon: c => <WhatsAppLogo className={c} />,
    href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    key: 'telegram',
    label: 'Telegram',
    color: '#FFFFFF',
    bg: '#229ED9',
    icon: c => <TelegramLogo className={c} />,
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    color: '#FFFFFF',
    bg: '#0A66C2',
    icon: c => <LinkedInLogo className={c} />,
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
];

export function ShareMenu({
  url,
  title,
  buttonClassName,
  align = 'right',
}: {
  url?: string;
  title: string;
  buttonClassName?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState<string | null>(url ?? null);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Resolve the share URL lazily (window is undefined during SSR).
  useEffect(() => {
    if (!href) setHref(url ?? window.location.href);
  }, [href, url]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const shareUrl = href ?? (typeof window !== 'undefined' ? window.location.href : '');

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const nativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, url: shareUrl });
      close();
    } catch {
      // user cancelled — keep menu open
    }
  };

  const openShare = (href: string) => {
    close();
    if (href.startsWith('mailto:')) {
      // mailto: cannot open in a popup (browsers block it / open a blank tab) —
      // navigate via a synthetic anchor click, the most reliable cross-browser
      // way to hand the URI to the OS mail handler.
      try {
        const a = document.createElement('a');
        a.href = href;
        a.rel = 'noopener noreferrer';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        window.location.href = href;
      }
      return;
    }
    const w = 620;
    const h = 520;
    const left = Math.max(0, (window.innerWidth - w) / 2);
    const top = Math.max(0, (window.innerHeight - h) / 2);
    window.open(href, '_blank', `noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`);
  };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Share this post"
        className={cn('inline-flex items-center gap-1.5 text-textSecondary hover:text-brand transition-colors', buttonClassName)}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        Share
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Share options"
          className={cn(
            'absolute z-50 mt-2 w-56 rounded-xl border border-borderSoft bg-surface p-2 shadow-xl shadow-black/10',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { void copyLink(); }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-textPrimary hover:bg-surface-elevated transition-colors"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2">
              {copied ? <Check className="h-3.5 w-3.5 text-success" aria-hidden /> : <Link2 className="h-3.5 w-3.5" aria-hidden />}
            </span>
            {copied ? 'Link copied!' : 'Copy link'}
          </button>

          {typeof navigator.share === 'function' && (
            <button
              type="button"
              role="menuitem"
              onClick={() => void nativeShare()}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-textPrimary hover:bg-surface-elevated transition-colors"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2">
                <Share2 className="h-3.5 w-3.5" aria-hidden />
              </span>
              More options…
            </button>
          )}

          <div className="my-1.5 h-px bg-borderSoft" aria-hidden />

          <div className="grid grid-cols-5 gap-1.5 px-1 pb-1">
            {TARGETS.map(t => (
              <button
                key={t.key}
                type="button"
                role="menuitem"
                title={t.label}
                aria-label={`Share on ${t.label}`}
                onClick={() => openShare(t.href(shareUrl, title))}
                className="flex h-9 items-center justify-center rounded-lg transition-transform hover:scale-105"
                style={{ background: t.bg, color: t.color }}
              >
                {t.icon('h-4 w-4')}
              </button>
            ))}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => openShare(`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${shareUrl}`)}`)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-textPrimary hover:bg-surface-elevated transition-colors"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2">
              <Mail className="h-3.5 w-3.5" aria-hidden />
            </span>
            Email
          </button>
        </div>
      )}
    </div>
  );
}
