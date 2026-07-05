'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Globe, Users, Clock, Video, ChevronRight } from 'lucide-react';

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
  created_at: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/community/events')
      .then(r => r.json())
      .then(d => {
        setEvents(d.events || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const typeColors: Record<string, string> = {
    meetup: 'bg-blue-500/10 text-blue-500',
    conference: 'bg-purple-500/10 text-purple-500',
    hackathon: 'bg-orange-500/10 text-orange-500',
    webinar: 'bg-green-500/10 text-green-500',
    workshop: 'bg-yellow-500/10 text-yellow-500',
    launch: 'bg-red-500/10 text-red-500',
    other: 'bg-gray-500/10 text-gray-500',
  };

  const typeIcons: Record<string, string> = {
    meetup: '🤝',
    conference: '🎤',
    hackathon: '💻',
    webinar: '📹',
    workshop: '🛠',
    launch: '🚀',
    other: '📅',
  };

  const filtered = filter === 'all' ? events : events.filter(e => e.event_type === filter);
  const upcoming = filtered.filter(e => new Date(e.start_date) >= new Date());
  const past = filtered.filter(e => new Date(e.start_date) < new Date());

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Link href="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Community
        </Link>

        <div className="text-center mb-8">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold">Tech Events</h1>
          <p className="text-muted-foreground mt-1">Conferences, meetups, hackathons, and launches</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {['all', 'conference', 'meetup', 'hackathon', 'webinar', 'workshop', 'launch'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {type === 'all' ? 'All Events' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {upcoming.map(event => (
                    <Card key={event.id} className="hover:shadow-lg transition-all">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{typeIcons[event.event_type] || '📅'}</div>
                          <Badge className={typeColors[event.event_type]}>{event.event_type}</Badge>
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{event.description}</p>
                        )}
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(event.start_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            <Clock className="h-3.5 w-3.5 ml-2" />
                            <span>{new Date(event.start_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.is_virtual && (
                            <div className="flex items-center gap-2">
                              <Video className="h-3.5 w-3.5" />
                              <span>Virtual Event</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            <span>{event.current_participants}{event.max_participants ? `/${event.max_participants}` : ''} attending</span>
                          </div>
                        </div>
                        {event.url && (
                          <a href={event.url} target="_blank" rel="noopener noreferrer">
                            <Button className="w-full mt-4" variant="outline">
                              <Globe className="h-4 w-4 mr-2" /> Visit Event
                            </Button>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 text-muted-foreground">Past Events</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {past.map(event => (
                    <Card key={event.id} className="opacity-60">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="text-3xl">{typeIcons[event.event_type] || '📅'}</div>
                          <Badge variant="outline">{event.event_type}</Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{event.title}</h3>
                        <div className="text-sm text-muted-foreground">
                          {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Events Found</h3>
                  <p className="text-muted-foreground">Events will appear here once they are scheduled.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
