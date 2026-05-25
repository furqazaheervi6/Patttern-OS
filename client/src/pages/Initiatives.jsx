import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';

const PILLAR_COLORS = {
  physical: '#22C55E', mental: '#60A5FA', financial: '#FBBF24',
  spiritual: '#C084FC', personal: '#94A3B8',
};

const STATUS_META = {
  active:    { label: 'Active',     color: '#22C55E' },
  paused:    { label: 'Paused',     color: '#FBBF24' },
  completed: { label: 'Completed',  color: '#60A5FA' },
};

const ARTIFACT_ICONS = { link: '🔗', doc: '📄', figma: '🎨', repo: '💻', note: '📝' };

function MilestoneRow({ milestone, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const statusColors = { pending: '#64748B', in_progress: '#FBBF24', completed: '#22C55E' };
  const color = statusColors[milestone.status] || '#64748B';

  const cycleStatus = async () => {
    const next = milestone.status === 'pending' ? 'in_progress' : milestone.status === 'in_progress' ? 'completed' : 'pending';
    await onUpdate(milestone.id, { status: next });
  };

  const saveTitle = async () => {
    if (title.trim() && title !== milestone.title) {
      await onUpdate(milestone.id, { title: title.trim() });
    }
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-bg/40 group transition-colors">
      <button onClick={cycleStatus} className="w-4 h-4 rounded-full border-2 transition-all shrink-0" style={{ borderColor: color, backgroundColor: milestone.status === 'completed' ? color : 'transparent' }} />
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
          className="flex-1 bg-transparent text-xs text-text-primary focus:outline-none border-b border-teal"
        />
      ) : (
        <span
          className={`flex-1 text-xs cursor-pointer ${milestone.status === 'completed' ? 'line-through text-text-muted' : 'text-text-primary'}`}
          onDoubleClick={() => setEditing(true)}
        >
          {milestone.title}
        </span>
      )}
      {milestone.target_date && <span className="text-[10px] text-text-muted font-mono shrink-0">{milestone.target_date}</span>}
      <button onClick={() => onDelete(milestone.id)} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 text-xs transition-all shrink-0">×</button>
    </div>
  );
}

function InitiativeCard({ initiative, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [milestones, setMilestones] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [newArtifact, setNewArtifact] = useState({ title: '', type: 'link', url: '' });
  const [addingArtifact, setAddingArtifact] = useState(false);
  const pillarColor = PILLAR_COLORS[initiative.pillar_emphasis] || '#64748B';
  const status = STATUS_META[initiative.status] || STATUS_META.active;

  const loadDetails = useCallback(async () => {
    if (!open) return;
    const [ms, as] = await Promise.all([
      axios.get(`/api/initiatives/${initiative.id}/milestones`).then(r => r.data).catch(() => []),
      axios.get(`/api/initiatives/${initiative.id}/artifacts`).then(r => r.data).catch(() => []),
    ]);
    setMilestones(ms);
    setArtifacts(as);
  }, [open, initiative.id]);

  useEffect(() => { loadDetails(); }, [loadDetails]);

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    await axios.post(`/api/initiatives/${initiative.id}/milestones`, { title: newMilestone.trim(), sequence: milestones.length });
    setNewMilestone('');
    loadDetails();
  };

  const updateMilestone = async (id, updates) => {
    await axios.patch(`/api/initiatives/${initiative.id}/milestones/${id}`, updates);
    loadDetails();
  };

  const deleteMilestone = async (id) => {
    await axios.delete(`/api/initiatives/${initiative.id}/milestones/${id}`);
    loadDetails();
  };

  const addArtifact = async () => {
    if (!newArtifact.title.trim()) return;
    await axios.post(`/api/initiatives/${initiative.id}/artifacts`, newArtifact);
    setNewArtifact({ title: '', type: 'link', url: '' });
    setAddingArtifact(false);
    loadDetails();
  };

  const done = milestones.filter(m => m.status === 'completed').length;
  const pct = milestones.length ? Math.round((done / milestones.length) * 100) : 0;

  return (
    <div className="card" style={{ borderColor: open ? pillarColor + '25' : undefined }}>
      {/* Header */}
      <button className="w-full flex items-start gap-4" onClick={() => setOpen(!open)}>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pillarColor }} />
            <p className="font-display font-semibold text-sm text-text-primary">{initiative.name}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.color + '15' }}>{status.label}</span>
          </div>
          {initiative.description && <p className="text-xs text-text-muted leading-relaxed ml-4">{initiative.description}</p>}
          <div className="flex items-center gap-4 ml-4 mt-2">
            {initiative.target_date && <span className="text-[10px] text-text-muted font-mono">Due {initiative.target_date}</span>}
            {milestones.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-24 h-1 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pillarColor }} />
                </div>
                <span className="text-[10px] text-text-muted">{done}/{milestones.length}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {initiative.milestone_count > 0 && (
            <span className="text-[10px] text-text-muted">{initiative.milestone_count} milestones</span>
          )}
          <span className="text-text-muted text-xs transition-transform duration-200" style={{ transform: open ? 'rotate(90deg)' : '' }}>›</span>
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="mt-5 pt-5 border-t border-border space-y-5 fade-in">
          {/* Status + pillar controls */}
          <div className="flex items-center gap-3">
            {Object.entries(STATUS_META).map(([k, v]) => (
              <button
                key={k}
                onClick={() => onUpdate(initiative.id, { status: k })}
                className="text-[10px] px-2 py-1 rounded-lg border transition-all"
                style={initiative.status === k
                  ? { color: v.color, borderColor: v.color + '40', background: v.color + '12' }
                  : { color: '#5A5A72', borderColor: '#252540' }
                }
              >
                {v.label}
              </button>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              {Object.keys(PILLAR_COLORS).map((p) => (
                <button
                  key={p}
                  onClick={() => onUpdate(initiative.id, { pillar_emphasis: p })}
                  className="w-4 h-4 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: PILLAR_COLORS[p],
                    borderColor: initiative.pillar_emphasis === p ? '#fff' : 'transparent',
                    opacity: initiative.pillar_emphasis === p ? 1 : 0.35,
                  }}
                  title={p}
                />
              ))}
            </div>
          </div>

          {/* Milestones */}
          <div>
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Milestones</p>
            {milestones.length > 0 && (
              <div className="space-y-0.5 mb-2">
                {milestones.map(m => (
                  <MilestoneRow key={m.id} milestone={m} onUpdate={updateMilestone} onDelete={deleteMilestone} />
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
                placeholder="+ Add milestone"
                className="flex-1 px-3 py-2 rounded-xl text-xs border border-border bg-bg text-text-primary placeholder-text-muted focus:outline-none focus:border-teal"
              />
              <button onClick={addMilestone} disabled={!newMilestone.trim()} className="px-3 py-2 rounded-xl text-xs text-teal border border-teal/30 hover:bg-teal/10 disabled:opacity-40 transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Artifacts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Artifacts</p>
              <button onClick={() => setAddingArtifact(!addingArtifact)} className="text-[10px] text-teal hover:underline">+ Link</button>
            </div>
            {artifacts.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {artifacts.map(a => (
                  <a key={a.id} href={a.url || '#'} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-bg/30 text-xs text-text-muted hover:text-text-primary transition-colors">
                    <span>{ARTIFACT_ICONS[a.type] || '🔗'}</span>
                    <span>{a.title}</span>
                  </a>
                ))}
              </div>
            )}
            {addingArtifact && (
              <div className="flex gap-2 mt-2 fade-in">
                <select value={newArtifact.type} onChange={(e) => setNewArtifact(p => ({ ...p, type: e.target.value }))} className="px-2 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary w-24">
                  {Object.keys(ARTIFACT_ICONS).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={newArtifact.title} onChange={(e) => setNewArtifact(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-teal" />
                <input value={newArtifact.url} onChange={(e) => setNewArtifact(p => ({ ...p, url: e.target.value }))} placeholder="URL (optional)" className="flex-1 px-3 py-2 rounded-xl border border-border bg-bg text-xs text-text-primary placeholder-text-muted focus:outline-none focus:border-teal" />
                <button onClick={addArtifact} className="px-3 py-2 rounded-xl text-xs text-teal border border-teal/30 hover:bg-teal/10 transition-colors">Save</button>
              </div>
            )}
          </div>

          {/* Delete */}
          <div className="flex justify-end pt-2">
            <button onClick={() => onDelete(initiative.id)} className="text-xs text-text-muted hover:text-red-400 transition-colors">Archive initiative</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddInitiativeModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', pillar_emphasis: 'financial', target_date: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await axios.post('/api/initiatives', form);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,14,28,0.92)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 slide-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-text-primary">New Initiative</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary text-xl">×</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Name</label>
            <input autoFocus type="text" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. PatternOS v2 Launch" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal" />
          </div>
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Description (optional)</label>
            <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What does completing this look like?" rows={2} className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-teal resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Primary Pillar</label>
              <select value={form.pillar_emphasis} onChange={(e) => setForm(p => ({ ...p, pillar_emphasis: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary">
                {Object.keys(PILLAR_COLORS).map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1.5">Target Date</label>
              <input type="date" value={form.target_date} onChange={(e) => setForm(p => ({ ...p, target_date: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-border bg-bg text-sm text-text-primary" />
            </div>
          </div>
          <button type="submit" disabled={saving || !form.name.trim()} className="w-full py-3 rounded-xl font-display font-bold text-sm disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}>
            {saving ? 'Creating…' : 'Create Initiative'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Initiatives() {
  const { user } = useAuth();
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState('active');

  const load = useCallback(async () => {
    try {
      const r = await axios.get('/api/initiatives');
      setInitiatives(r.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateInitiative = async (id, updates) => {
    await axios.patch(`/api/initiatives/${id}`, updates);
    load();
  };

  const deleteInitiative = async (id) => {
    await axios.delete(`/api/initiatives/${id}`);
    load();
  };

  const filtered = initiatives.filter(i => filter === 'all' || i.status === filter);
  const isOperator = user?.mode === 'operator';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="pl-10 lg:pl-0 mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-bold text-xl text-text-primary tracking-tight">Initiatives</h1>
            {isOperator && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ color: '#8B0000', background: 'rgba(139,0,0,0.12)', border: '1px solid rgba(139,0,0,0.2)' }}>
                Operator
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted mt-1">
            {isOperator
              ? 'Track your execution graph — every initiative becomes fuel for your day plan.'
              : 'Long-arc goals broken into milestones and artifacts. Each block in your day plan traces back here.'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}
        >
          + New Initiative
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-5">
        {[['active', 'Active'], ['all', 'All'], ['completed', 'Completed'], ['paused', 'Paused']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={filter === v ? { background: 'rgba(139,0,0,0.12)', color: '#C9C9C9', border: '1px solid rgba(139,0,0,0.2)' } : { color: '#5A5A72' }}
          >
            {l}
            {v !== 'all' && <span className="ml-1.5 text-[10px] opacity-60">{initiatives.filter(i => i.status === v).length}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="card animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-14">
          <p className="text-2xl mb-3">◈</p>
          <p className="text-sm font-display font-semibold text-text-primary">No {filter === 'all' ? '' : filter} initiatives</p>
          <p className="text-xs text-text-muted mt-1.5 mb-5">
            {isOperator
              ? 'Create an initiative to give your day plan context. Every deep-work block will trace back here.'
              : 'Initiatives are long-arc projects broken into milestones. Create one to start tracking.'}
          </p>
          <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl text-xs font-semibold" style={{ background: 'linear-gradient(135deg, #8B0000, #B22222)', color: '#D4D4D8' }}>
            + Create First Initiative
          </button>
        </div>
      ) : (
        <div className="space-y-3 fade-in">
          {filtered.map(i => (
            <InitiativeCard key={i.id} initiative={i} onUpdate={updateInitiative} onDelete={deleteInitiative} />
          ))}
        </div>
      )}

      {showAdd && <AddInitiativeModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}
