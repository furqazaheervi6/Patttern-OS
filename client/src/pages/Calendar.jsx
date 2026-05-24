import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, addWeeks, isSameDay, isSameMonth, isToday,
  parseISO, getHours, getMinutes,
} from 'date-fns';

// ── Constants ────────────────────────────────────────────

const GCAL_COLORS = {
  '1':'#7C9EF8','2':'#5CC8A0','3':'#C084FC','4':'#F87171',
  '5':'#FBBF24','6':'#FB923C','7':'#22D3EE','8':'#9CA3AF',
  '9':'#60A5FA','10':'#4ADE80','11':'#DC2626',
};

const PILLAR_COLORS = {
  physical: '#22C55E',
  mental: '#60A5FA',
  financial: '#FBBF24',
  spiritual: '#C084FC',
  personal: '#94A3B8',
};

const PILLAR_META = {
  physical:  { label: 'Physical',  hint: 'e.g. Work out 4x per week, sleep 8 hrs, run 5km', icon: '◉' },
  mental:    { label: 'Mental',    hint: 'e.g. Read 20 pages daily, learn a new skill, meditate', icon: '◈' },
  financial: { label: 'Financial', hint: 'e.g. Close 5 deals, hit $10k MRR, deep work 4hrs/day', icon: '◎' },
  spiritual: { label: 'Spiritual', hint: 'e.g. Journal daily, gratitude practice, reflect every evening', icon: '◯' },
  personal:  { label: 'Personal',  hint: 'e.g. Family time, hobbies, personal projects, travel', icon: '◇' },
};

// Google Calendar color IDs per pillar
const PILLAR_GCAL_COLOR = { physical: '10', mental: '9', financial: '5', spiritual: '3', personal: '8' };

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6 AM – 10 PM
const HOUR_H = 64;
const DAY_START = 6;

// ── Helpers ──────────────────────────────────────────────

const eventColor = e => e.colorId && GCAL_COLORS[e.colorId] ? GCAL_COLORS[e.colorId] : '#7A7A9A';
const eventStart = e => e.start.dateTime ? parseISO(e.start.dateTime) : parseISO(e.start.date + 'T00:00:00');
const eventEnd   = e => e.end.dateTime   ? parseISO(e.end.dateTime)   : parseISO(e.end.date   + 'T23:59:59');
const isAllDay   = e => !e.start.dateTime;
const eventsForDay = (evs, date) => evs.filter(e => isSameDay(eventStart(e), date));

function scoreColor(v) {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  return n >= 70 ? '#22C55E' : n >= 45 ? '#FBBF24' : '#F87171';
}

function parseCheckinRow(r) {
  if (!r) return null;
  const out = { ...r };
  for (const f of ['physical_score','mental_score','financial_score','spiritual_score','overall_score'])
    if (out[f] != null) out[f] = parseFloat(out[f]) || 0;
  return out;
}

function getMonthGrid(date) {
  const s = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const e = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  const days = []; let c = s;
  while (c <= e) { days.push(c); c = addDays(c, 1); }
  return days;
}

function loadPlan() {
  try { return JSON.parse(localStorage.getItem('patternos_dayplan') || '{}'); } catch { return {}; }
}
function savePlan(p) { localStorage.setItem('patternos_dayplan', JSON.stringify(p)); }

// ── EventPill (month grid) ────────────────────────────────

function EventPill({ event }) {
  const color = eventColor(event);
  const start = eventStart(event);
  return (
    <div title={event.summary} style={{
      background: color + '20', borderLeft: `2px solid ${color}`, color,
      padding: '1px 4px', borderRadius: '3px', fontSize: '0.58rem',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      marginBottom: '1px', lineHeight: '1.6',
    }}>
      {!isAllDay(event) && (
        <span style={{ opacity: 0.6, marginRight: '3px', fontFamily: 'DM Mono, monospace' }}>
          {format(start, 'h:mm')}
        </span>
      )}
      {event.summary || '(No title)'}
    </div>
  );
}

// ── GCalBlock (day view, time-positioned) ────────────────

function GCalBlock({ event }) {
  const color = eventColor(event);
  const s = eventStart(event);
  const e = eventEnd(event);
  const sh = getHours(s) + getMinutes(s) / 60;
  const eh = getHours(e) + getMinutes(e) / 60;
  const top = (sh - DAY_START) * HOUR_H;
  const height = Math.max((eh - sh) * HOUR_H, 26);
  return (
    <a
      href={event.htmlLink || '#'}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        position: 'absolute', top: `${top}px`, height: `${height}px`,
        left: '3px', right: '3px', zIndex: 1,
        background: color + '28', border: `1px solid ${color}60`,
        borderLeft: `3px solid ${color}`, borderRadius: '5px',
        padding: '3px 6px', overflow: 'hidden', cursor: 'pointer',
      }}
    >
      <p style={{ color, fontSize: '0.62rem', fontWeight: 600, lineHeight: 1.3, margin: 0 }}>
        {event.summary || '(No title)'}
      </p>
      {height > 38 && (
        <p style={{ color: '#5A5A72', fontSize: '0.54rem', fontFamily: 'DM Mono, monospace', margin: 0 }}>
          {format(s, 'h:mm a')} – {format(e, 'h:mm a')}
        </p>
      )}
      {height > 62 && event.location && (
        <p style={{ color: '#4A4A68', fontSize: '0.54rem', margin: '2px 0 0' }}>◎ {event.location}</p>
      )}
    </a>
  );
}

// ── PlanBlock (day view, AI-generated) ───────────────────

function PlanBlock({ block }) {
  const color = PILLAR_COLORS[block.pillar] || '#8B0000';
  const [sh, sm] = block.start.split(':').map(Number);
  const [eh, em] = block.end.split(':').map(Number);
  const top = ((sh + sm / 60) - DAY_START) * HOUR_H;
  const height = Math.max(((eh + em / 60) - (sh + sm / 60)) * HOUR_H, 28);
  const ds = block.date.replace(/-/g, '');
  const ss = block.start.replace(':', '') + '00';
  const es = block.end.replace(':', '') + '00';
  const gcalUrl = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(block.title)}&dates=${ds}T${ss}/${ds}T${es}&details=${encodeURIComponent(block.description || '')}`;

  return (
    <a
      href={gcalUrl}
      target="_blank"
      rel="noreferrer"
      title={`Add to Google Calendar: ${block.title}`}
      style={{
        display: 'block', textDecoration: 'none',
        position: 'absolute', top: `${top}px`, height: `${height}px`,
        left: '3px', right: '3px', zIndex: 1,
        background: color + '28', border: `1px solid ${color}65`,
        borderLeft: `3px solid ${color}`, borderRadius: '5px',
        padding: '3px 7px', overflow: 'hidden', cursor: 'pointer',
        boxShadow: `0 1px 4px ${color}18`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1px' }}>
        <span style={{ color, fontSize: '0.5rem', flexShrink: 0 }}>
          {PILLAR_META[block.pillar]?.icon || '◎'}
        </span>
        <p style={{ color, fontSize: '0.62rem', fontWeight: 700, lineHeight: 1.3, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {block.title}
        </p>
      </div>
      {height > 40 && (
        <p style={{ color: '#6A6A84', fontSize: '0.54rem', fontFamily: 'DM Mono, monospace', margin: 0 }}>
          {block.start} – {block.end}
        </p>
      )}
      {height > 68 && block.description && (
        <p style={{ color: '#5A5A7A', fontSize: '0.56rem', margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden' }}>
          {block.description}
        </p>
      )}
      {height > 90 && (
        <p style={{ color: color + '80', fontSize: '0.5rem', margin: '3px 0 0', fontFamily: 'DM Mono, monospace' }}>
          ↗ Add to Google Cal
        </p>
      )}
    </a>
  );
}

// ── DayView ──────────────────────────────────────────────

function DayView({ date, events, planBlocks }) {
  const gridRef = useRef(null);
  const dayEvs = eventsForDay(events, date).filter(e => !isAllDay(e));
  const allDayEvs = eventsForDay(events, date).filter(isAllDay);
  const dateKey = format(date, 'yyyy-MM-dd');
  const blocks = planBlocks[dateKey] || [];
  const isCurrentDay = isToday(date);
  const now = new Date();
  const nowTop = isCurrentDay ? (now.getHours() + now.getMinutes() / 60 - DAY_START) * HOUR_H : -1;

  const totalPlanHours = blocks.reduce((s, b) => {
    const [sh, sm] = b.start.split(':').map(Number);
    const [eh, em] = b.end.split(':').map(Number);
    return s + (eh + em / 60) - (sh + sm / 60);
  }, 0);

  // Pillar breakdown for plan
  const pillarCounts = blocks.reduce((acc, b) => {
    const p = b.pillar;
    if (p && PILLAR_COLORS[p]) acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  useEffect(() => {
    if (!gridRef.current) return;
    const scrollTo = isCurrentDay && nowTop > 0 ? Math.max(0, nowTop - 100) : (7 - DAY_START) * HOUR_H;
    gridRef.current.scrollTop = scrollTo;
  }, [isCurrentDay, nowTop]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      {/* All-day events */}
      {allDayEvs.length > 0 && (
        <div style={{ padding: '5px 16px', borderBottom: '1px solid #1E1E35', display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0, background: 'rgba(18,18,34,0.6)' }}>
          <span style={{ fontSize: '0.5rem', color: '#4A4A68', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'center', marginRight: '4px' }}>All Day</span>
          {allDayEvs.map(e => {
            const color = eventColor(e);
            return (
              <a key={e.id} href={e.htmlLink || '#'} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                <span style={{ fontSize: '0.62rem', padding: '2px 10px', borderRadius: '20px', background: color + '20', color, border: `1px solid ${color}40` }}>{e.summary}</span>
              </a>
            );
          })}
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 1fr', borderBottom: '1px solid #1E1E35', flexShrink: 0, background: 'rgba(20,20,36,0.97)' }}>
        <div />
        <div style={{ padding: '8px 14px', borderLeft: '1px solid #1E1E35' }}>
          <p style={{ fontSize: '0.52rem', color: '#4A4A68', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', margin: 0 }}>Google Calendar</p>
          <p style={{ fontSize: '0.62rem', color: '#6A6A84', margin: '2px 0 0' }}>{dayEvs.length} event{dayEvs.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ padding: '8px 14px', borderLeft: '1px solid #1E1E35' }}>
          <p style={{ fontSize: '0.52rem', color: '#4A4A68', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', margin: 0 }}>AI Day Plan</p>
          {blocks.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.58rem', color: '#C9C9C9', fontFamily: 'DM Mono, monospace' }}>{blocks.length} blocks · {Math.round(totalPlanHours * 10) / 10}h</span>
              {Object.entries(pillarCounts).map(([p, n]) => (
                <span key={p} style={{ fontSize: '0.5rem', color: PILLAR_COLORS[p], fontFamily: 'DM Mono, monospace', background: PILLAR_COLORS[p] + '15', padding: '1px 5px', borderRadius: '10px', border: `1px solid ${PILLAR_COLORS[p]}30` }}>
                  {PILLAR_META[p]?.icon} {n}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.62rem', color: '#3A3A55', margin: '2px 0 0' }}>Click ✦ Plan My Day to generate</p>
          )}
        </div>
      </div>

      {/* Time grid — flex layout for reliable rendering */}
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', position: 'relative', height: `${HOURS.length * HOUR_H}px`, minWidth: 0 }}>

          {/* Time labels column */}
          <div style={{ width: '52px', flexShrink: 0, position: 'relative', pointerEvents: 'none' }}>
            {HOURS.map(h => (
              <div key={h} style={{
                position: 'absolute', top: `${(h - DAY_START) * HOUR_H}px`, right: '8px',
                fontSize: '0.52rem', color: '#3A3A55', fontFamily: 'DM Mono, monospace',
                transform: 'translateY(-8px)', textAlign: 'right', width: '40px',
              }}>
                {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            ))}
          </div>

          {/* Google Calendar column */}
          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #1E1E35', minWidth: 0 }}>
            {HOURS.map(h => (
              <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START) * HOUR_H}px`, left: 0, right: 0, height: '1px', background: '#1A1A30', pointerEvents: 'none' }} />
            ))}
            {dayEvs.map(e => <GCalBlock key={e.id} event={e} />)}
          </div>

          {/* AI Plan column */}
          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #1E1E35', minWidth: 0 }}>
            {HOURS.map(h => (
              <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START) * HOUR_H}px`, left: 0, right: 0, height: '1px', background: '#1A1A30', pointerEvents: 'none' }} />
            ))}
            {HOURS.map(h => (
              <div key={`hh${h}`} style={{ position: 'absolute', top: `${(h - DAY_START) * HOUR_H + HOUR_H / 2}px`, left: 0, right: 0, height: '1px', background: '#141428', pointerEvents: 'none' }} />
            ))}
            {blocks.length === 0 && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', width: '80%' }}>
                <p style={{ fontSize: '0.6rem', color: '#2A2A45', fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em' }}>✦ Plan not yet generated</p>
              </div>
            )}
            {blocks.map((b, i) => <PlanBlock key={`${b.date}-${b.start}-${i}`} block={b} />)}
          </div>

          {/* Current time indicator */}
          {isCurrentDay && nowTop >= 0 && (
            <div style={{ position: 'absolute', left: '52px', right: 0, top: `${nowTop}px`, height: '2px', background: '#8B0000', zIndex: 3, opacity: 0.9, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: '-5px', top: '-4px', width: '9px', height: '9px', borderRadius: '50%', background: '#8B0000' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Month Day Cell ────────────────────────────────────────

function DayCell({ date, currentMonth, events, checkin, hasNotion, hasPlan, selected, onSelect }) {
  const dayEvs = eventsForDay(events, date);
  const inMonth = isSameMonth(date, currentMonth);
  const today = isToday(date);
  const isSelected = isSameDay(date, selected);
  const overall = checkin ? parseFloat(checkin.overall_score) : null;

  return (
    <div onClick={() => onSelect(date)} style={{
      minHeight: '82px', padding: '5px',
      borderBottom: '1px solid #1E1E35', borderRight: '1px solid #1E1E35',
      cursor: 'pointer',
      background: isSelected ? 'rgba(139,0,0,0.1)' : today ? 'rgba(139,0,0,0.04)' : 'transparent',
      transition: 'background 0.12s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{
          width: '21px', height: '21px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '50%', fontSize: '0.68rem',
          fontFamily: today ? 'Cinzel, Georgia, serif' : 'DM Mono, monospace',
          fontWeight: today ? 700 : 400,
          color: today ? '#D4D4D8' : inMonth ? '#8A8AA8' : '#3A3A55',
          background: today ? '#8B0000' : 'transparent', flexShrink: 0,
        }}>
          {format(date, 'd')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {hasPlan && <span style={{ fontSize: '0.45rem', color: '#FBBF24', opacity: 0.9 }}>✦</span>}
          {overall != null && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: scoreColor(overall) || '#3A3A55', opacity: 0.85 }} />}
          {hasNotion && <span style={{ fontSize: '0.45rem', color: '#8B0000', opacity: 0.7 }}>◎</span>}
        </div>
      </div>
      <div>
        {dayEvs.slice(0, 2).map(e => <EventPill key={e.id} event={e} />)}
        {dayEvs.length > 2 && <span style={{ fontSize: '0.52rem', color: '#4A4A68', paddingLeft: '4px' }}>+{dayEvs.length - 2} more</span>}
      </div>
    </div>
  );
}

// ── Week Grid ─────────────────────────────────────────────

function WeekGrid({ weekDays, events, selected, onSelect }) {
  const gridRef = useRef(null);
  const now = new Date();
  const nowTop = (now.getHours() + now.getMinutes() / 60 - DAY_START) * HOUR_H;
  const isCurrentWeek = weekDays.some(d => isToday(d));

  useEffect(() => {
    if (gridRef.current && isCurrentWeek) gridRef.current.scrollTop = Math.max(0, nowTop - 120);
  }, [isCurrentWeek, nowTop]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(7, 1fr)', borderBottom: '1px solid #1E1E35', flexShrink: 0, background: 'rgba(20,20,36,0.97)' }}>
        <div />
        {weekDays.map(d => {
          const today = isToday(d);
          return (
            <div key={d.toISOString()} onClick={() => onSelect(d)}
              style={{ padding: '8px 4px', textAlign: 'center', cursor: 'pointer', borderLeft: '1px solid #1E1E35', background: isSameDay(d, selected) ? 'rgba(139,0,0,0.07)' : 'transparent' }}>
              <p style={{ fontSize: '0.52rem', color: '#4A4A68', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '3px' }}>{format(d, 'EEE')}</p>
              <span style={{ width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontFamily: today ? 'Cinzel, Georgia, serif' : 'DM Mono, monospace', fontWeight: today ? 700 : 400, color: today ? '#D4D4D8' : '#7A7A94', background: today ? '#8B0000' : 'transparent' }}>
                {format(d, 'd')}
              </span>
            </div>
          );
        })}
      </div>
      <div ref={gridRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', position: 'relative', height: `${HOURS.length * HOUR_H}px` }}>
          {/* Time labels */}
          <div style={{ width: '44px', flexShrink: 0, position: 'relative', pointerEvents: 'none' }}>
            {HOURS.map(h => (
              <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START) * HOUR_H}px`, right: '6px', fontSize: '0.52rem', color: '#3A3A55', fontFamily: 'DM Mono, monospace', transform: 'translateY(-8px)', textAlign: 'right', width: '36px' }}>
                {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            ))}
          </div>
          {/* Day columns */}
          {weekDays.map((day, col) => {
            const dayEvs = eventsForDay(events, day).filter(e => !isAllDay(e));
            return (
              <div key={day.toISOString()} onClick={() => onSelect(day)} style={{ flex: 1, position: 'relative', borderLeft: '1px solid #1E1E35', background: isSameDay(day, selected) ? 'rgba(139,0,0,0.03)' : 'transparent', minWidth: 0, cursor: 'pointer' }}>
                {HOURS.map(h => <div key={h} style={{ position: 'absolute', top: `${(h - DAY_START) * HOUR_H}px`, left: 0, right: 0, height: '1px', background: '#1A1A32', pointerEvents: 'none' }} />)}
                {dayEvs.map(e => {
                  const s = eventStart(e); const en = eventEnd(e);
                  const sh = getHours(s) + getMinutes(s) / 60;
                  const eh = getHours(en) + getMinutes(en) / 60;
                  const top = Math.max(0, (sh - DAY_START) * HOUR_H);
                  const height = Math.max((eh - sh) * HOUR_H, 22);
                  const color = eventColor(e);
                  return (
                    <a key={e.id} href={e.htmlLink || '#'} target="_blank" rel="noreferrer" onClick={ev => ev.stopPropagation()}
                      style={{ display: 'block', textDecoration: 'none', position: 'absolute', left: '2px', right: '2px', top: `${top}px`, height: `${height}px`, zIndex: 1,
                        background: color + '22', border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`, borderRadius: '4px', padding: '2px 4px', overflow: 'hidden' }}>
                      <p style={{ fontSize: '0.58rem', color, fontWeight: 500, lineHeight: 1.3, margin: 0 }}>{e.summary || '(No title)'}</p>
                      {height > 34 && <p style={{ fontSize: '0.52rem', color: color + 'AA', fontFamily: 'DM Mono, monospace', margin: 0 }}>{format(s, 'h:mm')}</p>}
                    </a>
                  );
                })}
              </div>
            );
          })}
          {isCurrentWeek && nowTop >= 0 && (
            <div style={{ position: 'absolute', left: '44px', right: 0, top: `${nowTop}px`, height: '2px', background: '#8B0000', zIndex: 2, opacity: 0.9, pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', left: '-4px', top: '-3px', width: '8px', height: '8px', borderRadius: '50%', background: '#8B0000' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Day Panel (month/week sidebar) ────────────────────────

function DayPanel({ date, events, checkin, goals, notionEntry, onViewDay }) {
  const dayEvs = eventsForDay(events, date);
  const allDayEvs = dayEvs.filter(isAllDay);
  const timedEvs = dayEvs.filter(e => !isAllDay(e)).sort((a, b) => eventStart(a) - eventStart(b));
  const gcalUrl = `https://calendar.google.com/calendar/r/day/${format(date, 'yyyy/M/d')}`;
  const newEventUrl = `https://calendar.google.com/calendar/r/eventedit?dates=${format(date, 'yyyyMMdd')}T090000/${format(date, 'yyyyMMdd')}T100000`;

  return (
    <div style={{ width: '255px', flexShrink: 0, borderLeft: '1px solid #252540', display: 'flex', flexDirection: 'column', background: 'rgba(20,20,36,0.5)' }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #252540', flexShrink: 0 }}>
        <p style={{ fontSize: '0.52rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '2px' }}>{format(date, 'EEEE')}</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '2rem', fontWeight: 700, color: isToday(date) ? '#C9302C' : '#C9C9C9', lineHeight: 1 }}>{format(date, 'd')}</span>
          <span style={{ fontSize: '0.7rem', color: '#5A5A72' }}>{format(date, 'MMM yyyy')}</span>
        </div>
        <button onClick={onViewDay} style={{ marginTop: '8px', width: '100%', padding: '6px', borderRadius: '7px', border: '1px solid rgba(139,0,0,0.3)', background: 'rgba(139,0,0,0.08)', color: '#C9302C', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', cursor: 'pointer', fontWeight: 600 }}>
          ✦ Plan My Day
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
        {checkin && (
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '0.5rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>Check-In</p>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[{k:'physical_score',l:'P'},{k:'mental_score',l:'M'},{k:'financial_score',l:'F'},{k:'spiritual_score',l:'S'}].map(({k,l}) => checkin[k] != null && (
                <div key={k} style={{ fontSize: '0.58rem', padding: '2px 7px', borderRadius: '20px', background: (scoreColor(checkin[k])||'#3A3A55')+'22', color: scoreColor(checkin[k])||'#5A5A72', fontFamily: 'DM Mono, monospace', border: `1px solid ${(scoreColor(checkin[k])||'#3A3A55')}40` }}>{l} {checkin[k]}</div>
              ))}
            </div>
          </div>
        )}
        {notionEntry && (
          <div style={{ marginBottom: '12px', padding: '7px 10px', borderRadius: '7px', background: 'rgba(139,0,0,0.07)', border: '1px solid rgba(139,0,0,0.18)' }}>
            <p style={{ fontSize: '0.5rem', color: '#8B0000', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '2px' }}>◎ Journal</p>
            <p style={{ fontSize: '0.65rem', color: '#8A8AA8', lineHeight: 1.4 }}>{notionEntry.title}</p>
          </div>
        )}
        {allDayEvs.length > 0 && (
          <div style={{ marginBottom: '10px' }}>
            <p style={{ fontSize: '0.5rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '5px' }}>All Day</p>
            {allDayEvs.map(e => <a key={e.id} href={e.htmlLink||'#'} target="_blank" rel="noreferrer" style={{ textDecoration:'none', display:'block', marginBottom:'3px' }}><EventPill event={e} /></a>)}
          </div>
        )}
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontSize: '0.5rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>
            Events{timedEvs.length > 0 ? ` · ${timedEvs.length}` : ''}
          </p>
          {timedEvs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {timedEvs.map(e => {
                const color = eventColor(e); const s = eventStart(e); const en = eventEnd(e);
                return (
                  <a key={e.id} href={e.htmlLink||gcalUrl} target="_blank" rel="noreferrer" style={{ textDecoration:'none' }}>
                    <div style={{ padding: '7px 10px', borderRadius: '7px', background: color+'14', borderLeft: `3px solid ${color}` }}>
                      <p style={{ fontSize: '0.66rem', color: '#C9C9C9', fontWeight: 500, marginBottom: '2px', lineHeight: 1.3 }}>{e.summary||'(No title)'}</p>
                      <p style={{ fontSize: '0.56rem', color: '#5A5A72', fontFamily: 'DM Mono, monospace' }}>{format(s,'h:mm a')} – {format(en,'h:mm a')}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : <p style={{ fontSize: '0.6rem', color: '#3A3A55', fontStyle: 'italic' }}>No events scheduled</p>}
        </div>
        {goals.length > 0 && (
          <div>
            <p style={{ fontSize: '0.5rem', color: '#4A4A68', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>Goals</p>
            {goals.slice(0, 4).map((g, i) => (
              <div key={i} style={{ fontSize: '0.6rem', color: '#6A6A84', display: 'flex', gap: '5px', lineHeight: 1.4, marginBottom: '4px' }}>
                <span style={{ color: PILLAR_COLORS[g.domain] || '#8B0000', fontSize: '0.45rem', marginTop: '3px', flexShrink: 0 }}>◎</span>
                {g.title}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '10px 14px 12px', borderTop: '1px solid #252540', display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0 }}>
        <a href={newEventUrl} target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', padding:'7px 12px', borderRadius:'7px', fontSize:'0.6rem', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter, sans-serif', fontWeight:600, background:'linear-gradient(135deg, #8B0000, #B22222)', color:'#D4D4D8', textDecoration:'none' }}>
          + Schedule Event
        </a>
        <a href={gcalUrl} target="_blank" rel="noreferrer" style={{ display:'block', textAlign:'center', padding:'5px 12px', borderRadius:'7px', fontSize:'0.56rem', letterSpacing:'0.06em', textTransform:'uppercase', fontFamily:'Inter, sans-serif', border:'1px solid #252540', color:'#4A4A68', textDecoration:'none' }}>
          Open in Google Cal ↗
        </a>
      </div>
    </div>
  );
}

// ── Goal Setup Modal ──────────────────────────────────────

function GoalSetupModal({ missingPillars, onComplete, onSkip }) {
  const [goalText, setGoalText] = useState(() =>
    Object.fromEntries([...missingPillars, 'personal'].map(p => [p, '']))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    const filled = missingPillars.filter(p => goalText[p]?.trim());
    if (filled.length === 0) { onSkip(); return; }
    setSaving(true);
    setError(null);
    try {
      const allPillars = [...missingPillars, 'personal'];
      const toSave = allPillars.filter(p => goalText[p]?.trim());
      for (const pillar of toSave) {
        await axios.post('/api/goals', {
          title: goalText[pillar].trim(),
          domain: pillar,
          metric: 'consistency',
          target_value: 30,
          target_label: 'days',
          priority: pillar === 'personal' ? 'medium' : 'high',
          category: 'habit',
        });
      }
      onComplete();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(22,22,38,0.99)', border: '1px solid #2E2E48',
        borderRadius: '16px', padding: '28px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
      }}>
        <div style={{ marginBottom: '20px' }}>
          <p style={{ fontSize: '0.5rem', color: '#8B0000', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', marginBottom: '8px' }}>✦ Before we plan your day</p>
          <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Define Your Goals First
          </h2>
          <p style={{ fontSize: '0.72rem', color: '#5A5A72', lineHeight: 1.7 }}>
            PatternOS builds your schedule around your goals. Set at least one goal per pillar so the AI can create a day that actually moves you forward.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          {missingPillars.map(pillar => {
            const meta = PILLAR_META[pillar];
            const color = PILLAR_COLORS[pillar];
            return (
              <div key={pillar}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', color, marginBottom: '6px' }}>
                  <span>{meta.icon}</span> {meta.label}
                </label>
                <input
                  type="text"
                  value={goalText[pillar]}
                  onChange={e => setGoalText(prev => ({ ...prev, [pillar]: e.target.value }))}
                  placeholder={meta.hint}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: `1px solid ${goalText[pillar]?.trim() ? color + '50' : '#2E2E48'}`,
                    background: '#0E0E1C', color: '#C9C9C9', fontSize: '0.75rem',
                    fontFamily: 'Inter, sans-serif', outline: 'none',
                    transition: 'border-color 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = color + '80'}
                  onBlur={e => e.target.style.borderColor = goalText[pillar]?.trim() ? color + '50' : '#2E2E48'}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
              </div>
            );
          })}

          {/* Optional: Personal / Other */}
          <div style={{ borderTop: '1px solid #252540', paddingTop: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', color: PILLAR_COLORS.personal, marginBottom: '6px' }}>
              <span>{PILLAR_META.personal.icon}</span> Personal / Other
              <span style={{ fontSize: '0.5rem', color: '#4A4A68', marginLeft: '4px', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <input
              type="text"
              value={goalText['personal'] || ''}
              onChange={e => setGoalText(prev => ({ ...prev, personal: e.target.value }))}
              placeholder={PILLAR_META.personal.hint}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px',
                border: `1px solid ${goalText['personal']?.trim() ? PILLAR_COLORS.personal + '50' : '#252540'}`,
                background: '#0E0E1C', color: '#C9C9C9', fontSize: '0.75rem',
                fontFamily: 'Inter, sans-serif', outline: 'none',
                transition: 'border-color 0.15s ease',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = PILLAR_COLORS.personal + '80'}
              onBlur={e => e.target.style.borderColor = goalText['personal']?.trim() ? PILLAR_COLORS.personal + '50' : '#252540'}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: '0.65rem', color: '#F87171', marginBottom: '12px', fontFamily: 'DM Mono, monospace' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #8B0000, #B22222)',
              color: '#D4D4D8', border: 'none', fontSize: '0.65rem',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save Goals & Generate Plan'}
          </button>
          <button
            onClick={onSkip}
            style={{
              padding: '10px 14px', borderRadius: '10px',
              background: 'transparent', color: '#4A4A68',
              border: '1px solid #252540', fontSize: '0.65rem',
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Not Connected ─────────────────────────────────────────

function NotConnected() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
      <div style={{ fontSize: '2rem', marginBottom: '16px', opacity: 0.3 }}>◎</div>
      <h2 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px' }}>Google Calendar</h2>
      <p style={{ fontSize: '0.72rem', color: '#5A5A72', lineHeight: 1.7, marginBottom: '24px' }}>
        Connect your Google Calendar to see events, plan goal blocks, and schedule your days with AI.
      </p>
      <a href="/api/google/auth" style={{ display:'inline-block', padding:'10px 24px', borderRadius:'8px', fontSize:'0.65rem', letterSpacing:'0.1em', textTransform:'uppercase', fontFamily:'Inter, sans-serif', fontWeight:600, background:'linear-gradient(135deg, #8B0000, #B22222)', color:'#D4D4D8', textDecoration:'none' }}>
        Connect Google Calendar
      </a>
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────

export default function CalendarPage() {
  const [view, setView] = useState('month');
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [notionEntries, setNotionEntries] = useState([]);
  const [goals, setGoals] = useState([]);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [planBlocks, setPlanBlocks] = useState(loadPlan);
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [planMenuOpen, setPlanMenuOpen] = useState(false);
  const [goalSetup, setGoalSetup] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null); // { created, total, needsReauth }
  const planMenuRef = useRef(null);

  useEffect(() => {
    const fn = e => { if (planMenuRef.current && !planMenuRef.current.contains(e.target)) setPlanMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const getRange = useCallback(() => {
    if (view === 'day') return { start: selected, end: addDays(selected, 1) };
    if (view === 'month') return {
      start: startOfWeek(startOfMonth(current), { weekStartsOn: 0 }),
      end: endOfWeek(endOfMonth(current), { weekStartsOn: 0 }),
    };
    const s = startOfWeek(current, { weekStartsOn: 0 });
    return { start: s, end: endOfWeek(current, { weekStartsOn: 0 }) };
  }, [view, current, selected]);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const statusRes = await axios.get('/api/google/status');
      const auth = statusRes.data.authorized;
      setAuthorized(auth);
      if (auth) {
        const { start, end } = getRange();
        const [evRes, ciRes, notRes, goalRes] = await Promise.allSettled([
          axios.get('/api/google/events', { params: { start: format(start, 'yyyy-MM-dd'), end: format(end, 'yyyy-MM-dd') } }),
          axios.get('/api/checkin/history?days=90'),
          axios.get('/api/notion/entries'),
          axios.get('/api/goals'),
        ]);
        if (evRes.status === 'fulfilled') setEvents(evRes.value.data.events || []);
        if (ciRes.status === 'fulfilled') setCheckins((Array.isArray(ciRes.value.data) ? ciRes.value.data : []).map(parseCheckinRow));
        if (notRes.status === 'fulfilled') setNotionEntries(Array.isArray(notRes.value.data) ? notRes.value.data : []);
        if (goalRes.status === 'fulfilled') {
          const all = Array.isArray(goalRes.value.data) ? goalRes.value.data : [];
          setGoals(all.filter(g => (g.active===true||g.active===1||g.active==='1'||g.active==='t') && !g.completed));
        }
        setLastSync(new Date());
      }
    } catch {}
    finally { setLoading(false); }
  }, [getRange]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Listen for plan actions dispatched by ChatBot
  useEffect(() => {
    const handler = (e) => {
      const { actions } = e.detail || {};
      if (!Array.isArray(actions)) return;
      setPlanBlocks(prev => {
        const next = { ...prev };
        for (const act of actions) {
          const { action, date } = act;
          if (!date) continue;
          if (!next[date]) next[date] = [];
          if (action === 'add') {
            const block = { date, start: act.start, end: act.end, title: act.title, pillar: act.pillar || 'personal', description: act.description || '', priority: act.priority || 'medium' };
            next[date] = [...next[date].filter(b => !(b.start === act.start)), block];
          } else if (action === 'remove') {
            next[date] = next[date].filter(b => b.start !== act.start);
          } else if (action === 'update') {
            next[date] = next[date].map(b => {
              if (b.start !== act.start) return b;
              return { ...b, start: act.newStart || b.start, end: act.newEnd || b.end, title: act.title || b.title, description: act.description || b.description };
            });
          }
          if (next[date].length === 0) delete next[date];
        }
        savePlan(next);
        return next;
      });
    };
    window.addEventListener('patternos:planactions', handler);
    return () => window.removeEventListener('patternos:planactions', handler);
  }, []);

  const generatePlan = useCallback(async (dates) => {
    setPlanning(true); setPlanError(null); setPlanMenuOpen(false); setGoalSetup(null);
    try {
      const dateSet = new Set(dates);
      const relevantEvents = events.filter(e => dateSet.has(format(eventStart(e), 'yyyy-MM-dd')));
      const res = await axios.post('/api/calendar/plan', {
        dates,
        existingEvents: relevantEvents,
        goals,
        checkin: checkins[0] || null,
        history: checkins.slice(0, 7),
      });
      const { schedule } = res.data;
      if (!Array.isArray(schedule) || schedule.length === 0) {
        setPlanError('No schedule returned. Try again.');
        return;
      }
      // Group blocks by date and merge into state
      const grouped = {};
      for (const block of schedule) {
        const d = block.date;
        if (!grouped[d]) grouped[d] = [];
        grouped[d].push(block);
      }
      setPlanBlocks(prev => {
        const next = { ...prev, ...grouped };
        savePlan(next);
        return next;
      });
    } catch (err) {
      setPlanError(err.response?.data?.error || err.message);
    } finally { setPlanning(false); }
  }, [events, goals, checkins]);

  // Check goals before generating — gate by pillar coverage
  const initiateGenerate = useCallback((dates) => {
    setPlanMenuOpen(false);
    const coveredPillars = new Set(goals.map(g => g.domain));
    const required = ['physical', 'mental', 'financial', 'spiritual'];
    const missing = required.filter(p => !coveredPillars.has(p));
    if (missing.length > 0) {
      setGoalSetup({ dates, missing });
    } else {
      generatePlan(dates);
    }
  }, [goals, generatePlan]);

  const clearPlan = (date) => {
    const key = format(date, 'yyyy-MM-dd');
    setPlanBlocks(prev => { const n = { ...prev }; delete n[key]; savePlan(n); return n; });
  };

  const syncPlanToGCal = async (date) => {
    const key = format(date, 'yyyy-MM-dd');
    const blocks = planBlocks[key] || [];
    if (blocks.length === 0) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await axios.post('/api/google/events/batch', { events: blocks, timeZone: tz });
      setSyncResult({ created: res.data.created, total: res.data.total });
      // Refresh calendar events to show newly created ones
      setTimeout(() => fetchData(true), 1500);
    } catch (err) {
      if (err.response?.data?.needs_reauth) {
        setSyncResult({ needsReauth: true });
      } else {
        setSyncResult({ error: err.response?.data?.error || err.message });
      }
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  };

  const goBack = () => {
    if (view === 'month') setCurrent(d => addMonths(d, -1));
    else if (view === 'week') setCurrent(d => addWeeks(d, -1));
    else setSelected(d => addDays(d, -1));
  };
  const goFwd = () => {
    if (view === 'month') setCurrent(d => addMonths(d, 1));
    else if (view === 'week') setCurrent(d => addWeeks(d, 1));
    else setSelected(d => addDays(d, 1));
  };
  const goToday = () => { const n = new Date(); setCurrent(n); setSelected(n); };
  const openDay = (date) => { setSelected(date); setView('day'); };

  const monthDays = getMonthGrid(current);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(current, { weekStartsOn: 0 }), i));

  const headerLabel = view === 'day'
    ? format(selected, 'EEEE, MMMM d · yyyy')
    : view === 'month' ? format(current, 'MMMM yyyy')
    : `${format(weekDays[0], 'MMM d')} – ${format(weekDays[6], 'MMM d, yyyy')}`;

  const checkinForDay = d => checkins.find(c => c.date && isSameDay(parseISO(c.date), d)) || null;
  const notionForDay  = d => notionEntries.find(e => e.date && isSameDay(parseISO(e.date), d)) || null;
  const hasPlanForDay = d => (planBlocks[format(d, 'yyyy-MM-dd')] || []).length > 0;

  const selectedKey = format(selected, 'yyyy-MM-dd');
  const hasPlan = (planBlocks[selectedKey] || []).length > 0;

  const planMenuOptions = [
    { label: `This Day (${format(selected, 'MMM d')})`, dates: [format(selected, 'yyyy-MM-dd')] },
    { label: `Tomorrow (${format(addDays(new Date(), 1), 'MMM d')})`, dates: [format(addDays(new Date(), 1), 'yyyy-MM-dd')] },
    { label: 'Next 3 Days', dates: Array.from({length:3}, (_,i) => format(addDays(new Date(), i), 'yyyy-MM-dd')) },
    { label: 'This Week', dates: Array.from({length:7}, (_,i) => format(addDays(new Date(), i), 'yyyy-MM-dd')) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #252540', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, background: 'rgba(20,20,36,0.9)', backdropFilter: 'blur(12px)' }}>

        {view === 'day' && (
          <button onClick={() => setView('month')} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #252540', background: 'transparent', color: '#7A7A94', cursor: 'pointer', fontSize: '0.6rem', letterSpacing: '0.06em', flexShrink: 0 }}>
            ‹ Month
          </button>
        )}

        {view !== 'day' && (
          <div style={{ marginRight: 'auto' }}>
            <h1 style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: '0.9rem', fontWeight: 700, color: '#C9C9C9', letterSpacing: '0.12em', textTransform: 'uppercase', lineHeight: 1 }}>Calendar</h1>
            {lastSync && <p style={{ fontSize: '0.5rem', color: '#3A3A55', fontFamily: 'DM Mono, monospace', marginTop: '1px' }}>synced {format(lastSync, 'h:mm a')} · auto 30s</p>}
          </div>
        )}
        {view === 'day' && <div style={{ flex: 1 }} />}

        <button onClick={goToday} style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', border: '1px solid #252540', color: '#7A7A94', background: 'transparent', cursor: 'pointer', flexShrink: 0 }}>Today</button>

        <div style={{ display: 'flex', gap: '3px' }}>
          {['‹', '›'].map((a, i) => (
            <button key={i} onClick={i === 0 ? goBack : goFwd} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #252540', background: 'transparent', color: '#7A7A94', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a}</button>
          ))}
        </div>

        <span style={{ fontFamily: 'Cinzel, Georgia, serif', fontSize: view === 'day' ? '0.9rem' : '0.82rem', fontWeight: 600, color: '#C9C9C9', letterSpacing: '0.06em', minWidth: view === 'day' ? '260px' : '160px' }}>
          {headerLabel}
        </span>

        {view !== 'day' && (
          <div style={{ display: 'flex', gap: '2px', border: '1px solid #252540', borderRadius: '7px', padding: '2px', background: 'rgba(28,28,46,0.6)' }}>
            {['month', 'week'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '0.56rem', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif', border: 'none', cursor: 'pointer', background: view === v ? 'rgba(139,0,0,0.2)' : 'transparent', color: view === v ? '#C9C9C9' : '#4A4A68', transition: 'all 0.15s ease' }}>{v}</button>
            ))}
          </div>
        )}

        {/* Plan button */}
        <div style={{ position: 'relative', flexShrink: 0 }} ref={planMenuRef}>
          <button
            onClick={() => setPlanMenuOpen(v => !v)}
            disabled={planning}
            style={{
              padding: view === 'day' ? '7px 16px' : '5px 12px',
              borderRadius: '7px', border: view === 'day' ? 'none' : '1px solid rgba(139,0,0,0.35)',
              background: view === 'day'
                ? (planning ? 'rgba(139,0,0,0.3)' : 'linear-gradient(135deg, #8B0000, #B22222)')
                : 'rgba(139,0,0,0.1)',
              color: view === 'day' ? '#D4D4D8' : '#C9302C',
              fontSize: view === 'day' ? '0.64rem' : '0.58rem',
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif',
              fontWeight: 600, cursor: planning ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', opacity: planning ? 0.7 : 1,
            }}
          >
            {planning ? (
              <><span style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid #D4D4D860', borderTopColor: '#D4D4D8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Planning…</>
            ) : (
              <>✦ {view === 'day' ? 'Plan My Day' : 'Plan'} ▾</>
            )}
          </button>
          {planMenuOpen && !planning && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '230px', background: 'rgba(20,20,36,0.99)', border: '1px solid #252540', borderRadius: '10px', padding: '6px', zIndex: 200, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              {planMenuOptions.map((opt, i) => (
                <button key={i} onClick={() => initiateGenerate(opt.dates)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,0,0,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '7px', fontSize: '0.65rem', color: '#C9C9C9', letterSpacing: '0.04em', fontFamily: 'Inter, sans-serif' }}>
                  {opt.label}
                </button>
              ))}
              {hasPlan && view === 'day' && (
                <>
                  <div style={{ height: '1px', background: '#252540', margin: '4px 6px' }} />
                  <button onClick={() => { clearPlan(selected); setPlanMenuOpen(false); }}
                    style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: '7px', fontSize: '0.65rem', color: '#F87171', fontFamily: 'Inter, sans-serif' }}>
                    Clear Plan for This Day
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Re-plan button — day view only, when plan already exists */}
        {view === 'day' && hasPlan && !planning && (
          <button
            onClick={() => { clearPlan(selected); initiateGenerate([format(selected, 'yyyy-MM-dd')]); }}
            title="Clear and regenerate today's plan"
            style={{
              padding: '5px 12px', borderRadius: '7px',
              border: '1px solid rgba(251,191,36,0.3)',
              background: 'rgba(251,191,36,0.07)',
              color: '#FBBF24', fontSize: '0.58rem',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: 'Inter, sans-serif', fontWeight: 600,
              cursor: 'pointer', flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.14)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(251,191,36,0.07)'}
          >
            ↺ Re-plan
          </button>
        )}

        {authorized && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
            <span style={{ fontSize: '0.52rem', color: '#22C55E', fontFamily: 'DM Mono, monospace' }}>Live</span>
          </div>
        )}
      </div>

      {/* Pillar legend (day view) */}
      {view === 'day' && (
        <div style={{ padding: '5px 16px', borderBottom: '1px solid #1E1E35', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, background: 'rgba(16,16,30,0.7)', flexWrap: 'wrap' }}>
          {Object.entries(PILLAR_COLORS).map(([pillar, color]) => (
            <div key={pillar} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color }} />
              <span style={{ fontSize: '0.54rem', color: '#5A5A72', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>{pillar}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '2px', border: '2px solid #7A7A9A', background: '#7A7A9A28' }} />
            <span style={{ fontSize: '0.54rem', color: '#5A5A72', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'DM Mono, monospace' }}>Google Cal</span>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(planError || planning) && (
              <span style={{ fontSize: '0.56rem', color: planError ? '#F87171' : '#FBBF24', fontFamily: 'DM Mono, monospace' }}>
                {planError ? `Error: ${planError}` : 'Generating with Claude…'}
              </span>
            )}
            {syncResult && (
              <span style={{ fontSize: '0.56rem', fontFamily: 'DM Mono, monospace', color: syncResult.needsReauth ? '#FBBF24' : syncResult.error ? '#F87171' : '#22C55E' }}>
                {syncResult.needsReauth ? '⚠ Re-connect Google Cal for write access' : syncResult.error ? `Sync error: ${syncResult.error}` : `✓ ${syncResult.created}/${syncResult.total} synced to Google Cal`}
              </span>
            )}
            {hasPlan && !planning && (
              <button
                onClick={() => syncPlanToGCal(selected)}
                disabled={syncing}
                title="Sync today's plan to Google Calendar"
                style={{
                  padding: '3px 10px', borderRadius: '5px', border: '1px solid rgba(34,197,94,0.35)',
                  background: syncing ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.08)',
                  color: '#22C55E', fontSize: '0.55rem', letterSpacing: '0.08em',
                  textTransform: 'uppercase', fontFamily: 'Inter, sans-serif',
                  fontWeight: 600, cursor: syncing ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px', opacity: syncing ? 0.6 : 1,
                }}
              >
                {syncing ? (
                  <><span style={{ display: 'inline-block', width: '8px', height: '8px', border: '1.5px solid #22C55E60', borderTopColor: '#22C55E', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Syncing…</>
                ) : '↑ Sync to Google Cal'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Body */}
      {!loading && !authorized ? <NotConnected /> : loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: '0.65rem', color: '#3A3A55', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }}>Loading calendar…</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {view === 'day' ? (
            <DayView date={selected} events={events} planBlocks={planBlocks} />
          ) : (
            <>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {view === 'month' ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1E1E35', flexShrink: 0, background: 'rgba(20,20,36,0.97)' }}>
                      {WEEK_LABELS.map(d => (
                        <div key={d} style={{ padding: '8px 6px', fontSize: '0.55rem', color: '#4A4A68', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace', textAlign: 'center', borderRight: '1px solid #1E1E35' }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1 }}>
                      {monthDays.map(d => (
                        <DayCell key={d.toISOString()} date={d} currentMonth={current} events={events} checkin={checkinForDay(d)} hasNotion={!!notionForDay(d)} hasPlan={hasPlanForDay(d)} selected={selected} onSelect={openDay} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <WeekGrid weekDays={weekDays} events={events} selected={selected} onSelect={openDay} />
                )}
              </div>
              <DayPanel date={selected} events={events} checkin={checkinForDay(selected)} goals={goals} notionEntry={notionForDay(selected)} onViewDay={() => openDay(selected)} />
            </>
          )}
        </div>
      )}

      {/* Goal Setup Modal */}
      {goalSetup && (
        <GoalSetupModal
          missingPillars={goalSetup.missing}
          onComplete={async () => {
            await fetchData(true);
            generatePlan(goalSetup.dates);
          }}
          onSkip={() => {
            generatePlan(goalSetup.dates);
          }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
