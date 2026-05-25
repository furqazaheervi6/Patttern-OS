const express = require('express');
const router = express.Router();
const { execute, query } = require('../db/database');
const { optionalAuth } = require('../middleware/auth');

// ── Pattern library ───────────────────────────────────────────────────────────
const PATTERNS = [
  {
    id: 'yc-application',
    name: 'YC Application Sprint',
    description: 'Everything you need to submit a compelling YC application: founder story, product demo, metrics, and video. 8-week intensive.',
    category: 'operator',
    duration_weeks: 8,
    pillar_emphasis: 'financial',
    domain: 'product',
    icon: '🚀',
    milestones: [
      { title: 'Define core problem and unique insight', sequence: 1, estimated_days: 3 },
      { title: 'Write founder story — why us, why now', sequence: 2, estimated_days: 3 },
      { title: 'Nail the one-liner and YC pitch sentence', sequence: 3, estimated_days: 2 },
      { title: 'Build MVP or record product walkthrough', sequence: 4, estimated_days: 14 },
      { title: 'Get 5 real users and document their results', sequence: 5, estimated_days: 10 },
      { title: 'Compile revenue/growth metrics', sequence: 6, estimated_days: 3 },
      { title: 'Draft YC application answers (full pass)', sequence: 7, estimated_days: 5 },
      { title: 'Record 1-minute YC video', sequence: 8, estimated_days: 3 },
      { title: 'External review and critique session', sequence: 9, estimated_days: 3 },
      { title: 'Final polish and submit', sequence: 10, estimated_days: 2 },
    ],
  },
  {
    id: 'mvp-launch',
    name: 'MVP Product Launch',
    description: 'Zero to live product in 6 weeks. Spec → build → beta → launch. Designed for solo founders and small teams.',
    category: 'operator',
    duration_weeks: 6,
    pillar_emphasis: 'mental',
    domain: 'product',
    icon: '⚡',
    milestones: [
      { title: 'Define core user problem and solution hypothesis', sequence: 1, estimated_days: 2 },
      { title: 'Write product spec (1-page, no fluff)', sequence: 2, estimated_days: 3 },
      { title: 'Design wireframes for core flow', sequence: 3, estimated_days: 4 },
      { title: 'Build auth + core feature v1', sequence: 4, estimated_days: 10 },
      { title: 'Internal alpha — test all happy paths', sequence: 5, estimated_days: 3 },
      { title: 'Recruit 10 beta users and onboard them', sequence: 6, estimated_days: 5 },
      { title: 'Collect and triage beta feedback', sequence: 7, estimated_days: 4 },
      { title: 'Ship critical fixes from beta feedback', sequence: 8, estimated_days: 5 },
      { title: 'Set up payments and analytics', sequence: 9, estimated_days: 3 },
      { title: 'Public launch (Product Hunt / community post)', sequence: 10, estimated_days: 2 },
    ],
  },
  {
    id: 'b2b-outreach',
    name: 'B2B Revenue Sprint',
    description: '30-day structured outreach to close your first $10K MRR. Prospect → qualify → demo → close.',
    category: 'operator',
    duration_weeks: 4,
    pillar_emphasis: 'financial',
    domain: 'revenue',
    icon: '💰',
    milestones: [
      { title: 'Define ICP (Ideal Customer Profile)', sequence: 1, estimated_days: 2 },
      { title: 'Build target list of 100 prospects', sequence: 2, estimated_days: 3 },
      { title: 'Write cold outreach sequence (3-touch)', sequence: 3, estimated_days: 2 },
      { title: 'Send first 50 outreach messages', sequence: 4, estimated_days: 3 },
      { title: 'Follow up and book 10 discovery calls', sequence: 5, estimated_days: 5 },
      { title: 'Run discovery calls — identify top 3 pains', sequence: 6, estimated_days: 5 },
      { title: 'Build and deliver 5 tailored demos', sequence: 7, estimated_days: 5 },
      { title: 'Send proposals to qualified prospects', sequence: 8, estimated_days: 3 },
      { title: 'Close first paying customer', sequence: 9, estimated_days: 5 },
      { title: 'Get testimonial and referral from first customer', sequence: 10, estimated_days: 2 },
    ],
  },
  {
    id: 'fitness-protocol',
    name: '30-Day Fitness Protocol',
    description: 'Structured physical transformation over 30 days. Training, nutrition, sleep optimization — all logged as pillar blocks.',
    category: 'personal',
    duration_weeks: 4,
    pillar_emphasis: 'physical',
    domain: 'health',
    icon: '🏋️',
    milestones: [
      { title: 'Set baseline — weigh in and record measurements', sequence: 1, estimated_days: 1 },
      { title: 'Design weekly training split (3-5 days)', sequence: 2, estimated_days: 1 },
      { title: 'Set nutrition targets (calories, protein)', sequence: 3, estimated_days: 1 },
      { title: 'Complete week 1 training (all sessions)', sequence: 4, estimated_days: 7 },
      { title: 'Complete week 2 training + nutrition tracking', sequence: 5, estimated_days: 7 },
      { title: 'Mid-point check — review and adjust program', sequence: 6, estimated_days: 1 },
      { title: 'Complete week 3 training with progressive overload', sequence: 7, estimated_days: 7 },
      { title: 'Complete week 4 — peak intensity week', sequence: 8, estimated_days: 7 },
      { title: 'Final measurements and progress photos', sequence: 9, estimated_days: 1 },
      { title: 'Plan next protocol based on results', sequence: 10, estimated_days: 1 },
    ],
  },
  {
    id: 'spiritual-intensive',
    name: 'Spiritual Intensive (30-Day)',
    description: 'A structured 30-day program for deepening conviction, consistency, and alignment. Quran, dhikr, prayer, and reflection as first-class daily blocks.',
    category: 'personal',
    duration_weeks: 4,
    pillar_emphasis: 'spiritual',
    domain: 'conviction',
    icon: '🌙',
    milestones: [
      { title: 'Set daily Fajr consistency target (5/7 days)', sequence: 1, estimated_days: 1 },
      { title: 'Begin Quran reading plan (define daily target)', sequence: 2, estimated_days: 1 },
      { title: 'Establish dhikr routine after each salah', sequence: 3, estimated_days: 3 },
      { title: 'Complete week 1 — track alignment score daily', sequence: 4, estimated_days: 7 },
      { title: 'Week 2 — add evening reflection journal', sequence: 5, estimated_days: 7 },
      { title: 'Mid-point review — what habits are holding?', sequence: 6, estimated_days: 1 },
      { title: 'Week 3 — deepen one practice (tahajjud, extra Quran)', sequence: 7, estimated_days: 7 },
      { title: 'Week 4 — integrate and stabilize all practices', sequence: 8, estimated_days: 7 },
      { title: 'Document insights and patterns from 30 days', sequence: 9, estimated_days: 1 },
      { title: 'Set ongoing maintenance plan', sequence: 10, estimated_days: 1 },
    ],
  },
  {
    id: 'content-authority',
    name: 'Content Authority Build',
    description: 'Build a credible public presence over 6 weeks. Writing, distribution, and audience growth for founders who need deal flow and inbound.',
    category: 'operator',
    duration_weeks: 6,
    pillar_emphasis: 'mental',
    domain: 'pipeline',
    icon: '✍️',
    milestones: [
      { title: 'Define content POV — one unique angle no one owns', sequence: 1, estimated_days: 2 },
      { title: 'Choose primary platform and posting cadence', sequence: 2, estimated_days: 1 },
      { title: 'Write and publish 5 foundational posts', sequence: 3, estimated_days: 7 },
      { title: 'Engage with 50 relevant accounts in target space', sequence: 4, estimated_days: 7 },
      { title: 'Write first long-form piece (newsletter or essay)', sequence: 5, estimated_days: 5 },
      { title: 'Set up email list and publish first issue', sequence: 6, estimated_days: 3 },
      { title: 'Guest post or podcast appearance', sequence: 7, estimated_days: 10 },
      { title: 'Analyze top-performing content and double down', sequence: 8, estimated_days: 3 },
      { title: 'Reach 1,000 followers / subscribers milestone', sequence: 9, estimated_days: 14 },
      { title: 'Convert audience to product waitlist', sequence: 10, estimated_days: 5 },
    ],
  },
];

// GET /api/patterns — return full pattern library
router.get('/', (req, res) => {
  res.json({ patterns: PATTERNS.map(p => ({ ...p, milestones: undefined, milestone_count: p.milestones.length })) });
});

// GET /api/patterns/:id — single pattern with milestones
router.get('/:id', (req, res) => {
  const p = PATTERNS.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Pattern not found' });
  res.json(p);
});

// POST /api/patterns/:id/launch — instantiate pattern as initiative + milestones
router.post('/:id/launch', optionalAuth, async (req, res) => {
  const pattern = PATTERNS.find(p => p.id === req.params.id);
  if (!pattern) return res.status(404).json({ error: 'Pattern not found' });

  const userId = req.user?.id || null;
  const { start_date, custom_name } = req.body;
  const startDate = start_date || new Date().toISOString().split('T')[0];

  try {
    // Calculate milestone target dates from pattern sequence
    const calcTargetDate = (estimated_days) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + estimated_days);
      return d.toISOString().split('T')[0];
    };

    // Create initiative
    const now = new Date().toISOString();
    const endDate = calcTargetDate(pattern.duration_weeks * 7);
    const result = await execute(
      `INSERT INTO initiatives (user_id, name, description, status, pillar_emphasis, target_date, domain, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?) RETURNING id`,
      [userId, custom_name || pattern.name, pattern.description, pattern.pillar_emphasis, endDate, pattern.domain, now, now]
    );

    const initiativeId = result[0]?.id;
    if (!initiativeId) throw new Error('Failed to create initiative');

    // Create milestones with staggered target dates
    let dayOffset = 0;
    const milestones = [];
    for (const m of pattern.milestones) {
      dayOffset += m.estimated_days;
      const targetDate = calcTargetDate(dayOffset);
      const mResult = await execute(
        `INSERT INTO milestones (initiative_id, title, sequence, status, target_date, created_at)
         VALUES (?, ?, ?, 'pending', ?, ?) RETURNING id`,
        [initiativeId, m.title, m.sequence, targetDate, now]
      );
      milestones.push({ ...m, id: mResult[0]?.id, target_date: targetDate, status: 'pending' });
    }

    // Fetch the full initiative
    const initiative = await execute(
      `SELECT * FROM initiatives WHERE id = ?`, [initiativeId]
    );

    res.json({
      success: true,
      initiative: initiative[0],
      milestones,
      pattern_id: pattern.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
