'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Users, Clock, ArrowLeft, Sparkles, ExternalLink, Check, CalendarCheck, Presentation, Handshake, Terminal, Video, Wrench, Rocket, CalendarDays } from 'lucide-react';
import { JsonLd } from '@/components/ui/jsonld';
import { breadcrumbSchema, eventListSchema, eventSchema } from '@/lib/jsonld';
import { createClient } from '@/lib/supabase/client';
import PageIntro from '@/components/pages/page-intro';
import { CommunityHero } from '@/components/community/community-hero';

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  location: string | null;
  url: string | null;
  start_date: string;
  end_date: string | null;
  is_virtual: boolean;
  max_participants: number | null;
  current_participants: number;
  image_url: string | null;
}

const typeConfig: Record<string, { label: string; gradient: string; badge: string; icon: any }> = {
  conference: { label: 'Conference', gradient: 'from-violet-500 to-purple-600', badge: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800', icon: Presentation },
  meetup: { label: 'Meetup', gradient: 'from-blue-500 to-cyan-500', badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800', icon: Handshake },
  hackathon: { label: 'Hackathon', gradient: 'from-orange-500 to-red-500', badge: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800', icon: Terminal },
  webinar: { label: 'Webinar', gradient: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', icon: Video },
  workshop: { label: 'Workshop', gradient: 'from-amber-500 to-yellow-500', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800', icon: Wrench },
  launch: { label: 'Launch', gradient: 'from-pink-500 to-rose-500', badge: 'bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-200 dark:border-pink-800', icon: Rocket },
  other: { label: 'Event', gradient: 'from-slate-500 to-gray-500', badge: 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800', icon: CalendarDays },
};

const filterTabs = [
  { key: 'all', label: 'All Events', icon: CalendarDays },
  { key: 'conference', label: 'Conferences', icon: Presentation },
  { key: 'meetup', label: 'Meetups', icon: Handshake },
  { key: 'hackathon', label: 'Hackathons', icon: Terminal },
  { key: 'webinar', label: 'Webinars', icon: Video },
  { key: 'workshop', label: 'Workshops', icon: Wrench },
  { key: 'launch', label: 'Launches', icon: Rocket },
];

function getTimeUntil(date: Date): string {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return 'Now';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [myRsvps, setMyRsvps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [rsvpBusy, setRsvpBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/community/events');
      const d = await res.json();
      setEvents(d.events || []);
      setMyRsvps(d.my_rsvps || []);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
    const supabase = createClient();
    const channel = supabase
      .channel(`events_page_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_events' }, () => loadEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_rsvps' }, () => loadEvents())
      .subscribe();
    const poll = setInterval(loadEvents, 30000);
    const onFocus = () => loadEvents();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(channel);
    };
  }, [loadEvents]);

  const toggleRsvp = async (eventId: string) => {
    setRsvpBusy(eventId);
    setMessage(null);
    const isGoing = myRsvps.includes(eventId);
    try {
      const res = await fetch('/api/community/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, action: isGoing ? 'cancel' : 'rsvp' }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage(d.error || 'Something went wrong — please sign in and try again.');
        return;
      }
      setMyRsvps(prev => isGoing ? prev.filter(id => id !== eventId) : [...prev, eventId]);
      setEvents(prev => prev.map(e =>
        e.id === eventId
          ? { ...e, current_participants: Math.max(0, e.current_participants + (isGoing ? -1 : 1)) }
          : e
      ));
      setMessage(isGoing ? 'RSVP cancelled.' : 'You are going! See you there.');
    } catch {
      setMessage('Network error — please try again.');
    } finally {
      setRsvpBusy(null);
    }
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);
  const now = new Date();
  const upcoming = filtered.filter(e => new Date(e.start_date) >= now).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const past = filtered.filter(e => new Date(e.start_date) < now).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  return (
    <>
      <JsonLd data={breadcrumbSchema([
        { name: "Home", url: "https://techpivo.com" },
        { name: "Community", url: "https://techpivo.com/community" },
        { name: "Events" },
      ])} />
      {upcoming.length > 0 && (
        <JsonLd data={eventListSchema(upcoming.map(e => ({
          name: e.title,
          startDate: e.start_date,
          url: e.url,
        })))} />
      )}
      <div className="min-h-screen bg-background">
      <PageIntro slug="community-events" />
      {/* Hero */}
      <CommunityHero
        badge="Community Events"
        title="Tech Events"
        subtitle="Conferences, meetups, hackathons, workshops and product launches — all in one place."
        icon={<Sparkles className="h-3.5 w-3.5" />}
        backHref="/community"
        backLabel="Back to Community"
        imageUrl={events[0]?.image_url || null}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filterTabs.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filter === t.key
                    ? 'bg-foreground text-background shadow-lg shadow-foreground/10 scale-105'
                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl bg-muted/40 animate-pulse overflow-hidden">
                <div className="h-2 w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <section className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-7 w-1 rounded-full bg-gradient-to-b from-amber-500 to-orange-500" />
                  <h2 className="text-xl font-bold font-[family-name:var(--font-syne)]">Upcoming Events</h2>
                  <span className="text-sm text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">{upcoming.length}</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {upcoming.map(event => {
                    const cfg = typeConfig[event.event_type] || typeConfig.other;
                    const Icon = cfg.icon;
                    const startDate = new Date(event.start_date);
                    const isGoing = myRsvps.includes(event.id);
                    return (
                      <div key={event.id} className="group relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm hover:shadow-xl hover:shadow-amber-500/5 hover:border-amber-500/30 transition-all duration-300 overflow-hidden">
                        {event.image_url && (
                          <div className="relative h-40 overflow-hidden">
                            <img
                              src={event.image_url}
                              alt={event.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                            <span className="absolute top-3 right-3 text-xs font-semibold bg-amber-500/90 text-white px-2.5 py-1 rounded-full backdrop-blur-sm whitespace-nowrap">
                              in {getTimeUntil(startDate)}
                            </span>
                          </div>
                        )}
                        <div className={`${event.image_url ? '' : 'h-1.5 w-full bg-gradient-to-r'} ${event.image_url ? '' : cfg.gradient}`} />
                        <div className="p-5 md:p-6">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.badge}`}>
                              <Icon className="h-3.5 w-3.5" />
                              {cfg.label}
                            </span>
                            {!event.image_url && (
                              <span className="text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full whitespace-nowrap">
                                in {getTimeUntil(startDate)}
                              </span>
                            )}
                          </div>

                          {/* Title & Description */}
                          <h3 className="font-semibold text-lg leading-snug mb-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                              {event.description}
                            </p>
                          )}

                          {/* Details */}
                          <div className="space-y-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2.5">
                              <Calendar className="h-4 w-4 text-amber-500/70 flex-shrink-0" />
                              <span>{formatDate(startDate)}</span>
                              <Clock className="h-4 w-4 text-amber-500/70 flex-shrink-0 ml-1" />
                              <span>{formatTime(startDate)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-2.5">
                                <MapPin className="h-4 w-4 text-amber-500/70 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2.5">
                              <Users className="h-4 w-4 text-amber-500/70 flex-shrink-0" />
                              <span>{event.current_participants}{event.max_participants ? ` / ${event.max_participants}` : ''} going</span>
                              {event.is_virtual && (
                                <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">Virtual</span>
                              )}
                            </div>
                          </div>

                          {/* CTA */}
                          <div className="mt-5 flex gap-2">
                            <button
                              onClick={() => toggleRsvp(event.id)}
                              disabled={rsvpBusy === event.id}
                              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-60 ${
                                isGoing
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-300/50 hover:bg-emerald-500/25'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/20'
                              }`}
                            >
                              {isGoing ? <Check className="h-4 w-4" /> : <CalendarCheck className="h-4 w-4" />}
                              {rsvpBusy === event.id ? 'Working...' : isGoing ? 'Going — Cancel' : 'RSVP'}
                            </button>
                            {event.url && (
                              <a
                                href={event.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border border-border/60 hover:bg-muted/50 transition-all duration-200"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Past */}
            {past.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-7 w-1 rounded-full bg-gradient-to-b from-muted-foreground/40 to-muted-foreground/20" />
                  <h2 className="text-xl font-bold font-[family-name:var(--font-syne)] text-muted-foreground">Past Events</h2>
                  <span className="text-sm text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full">{past.length}</span>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {past.map(event => {
                    const cfg = typeConfig[event.event_type] || typeConfig.other;
                    const startDate = new Date(event.start_date);
                    return (
                      <div key={event.id} className="rounded-2xl border border-border/40 bg-card/50 opacity-65 hover:opacity-90 transition-opacity duration-200 overflow-hidden">
                        <div className={`h-1 w-full bg-gradient-to-r ${cfg.gradient} opacity-40`} />
                        <div className="p-5">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badge} opacity-70`}>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-muted-foreground">{formatDate(startDate)}</span>
                          </div>
                          <h3 className="font-semibold mb-1">{event.title}</h3>
                          {event.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Empty state */}
            {upcoming.length === 0 && past.length === 0 && (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted/50 mb-6">
                  <Calendar className="h-10 w-10 text-muted-foreground/60" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Events Yet</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Events will appear here once they are scheduled. Check back soon!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </>
  );
}