import React from 'react';
import { useCalendar } from '../hooks/useCalendar.js';
import { formatEventTime } from '../utils/formatters.js';

export default function CalendarWidget() {
  const { events, status, loading } = useCalendar();

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm text-text-primary">Upcoming Events</h3>
        {status.authorized && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-physical/10 text-physical border border-physical/20">
            Live
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-text-muted text-xs">
          <span className="animate-spin mr-2">⟳</span> Loading...
        </div>
      ) : !status.credentials_exist ? (
        <div className="flex flex-col items-center justify-center h-32 text-center">
          <p className="text-text-muted text-xs">Google Calendar not set up.</p>
          <a href="/settings" className="text-xs text-mental mt-1 hover:underline">
            Connect in Settings →
          </a>
        </div>
      ) : !status.authorized ? (
        <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
          <p className="text-text-muted text-xs">Authorization needed.</p>
          <a
            href="/api/google/auth"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-xs py-1"
          >
            Connect Google Calendar
          </a>
        </div>
      ) : events.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-text-muted text-xs">No upcoming events in 7 days.</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '220px' }}>
          {events.map((event) => (
            <div
              key={event.id}
              className="px-3 py-2 rounded-lg border border-border bg-bg/50 hover:border-mental/30 transition-colors"
            >
              <p className="text-xs font-mono text-text-primary truncate">{event.summary}</p>
              <p className="text-xs text-text-muted mt-0.5">{formatEventTime(event)}</p>
              {event.location && (
                <p className="text-xs text-text-muted truncate mt-0.5">📍 {event.location}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
