require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { query, queryOne, execute } = require('./database');

async function seedActivities() {
  // Check if activities already exist
  const count = await queryOne('SELECT COUNT(*) as c FROM activities');
  if (count.c > 0) {
    console.log(`Activities table already has ${count.c} entries — skipping seed.`);
    return;
  }

  const activities = [
    // ─── Physical ─────────────────────────────────────
    { name: 'Gym / Weight Training',    domain: 'physical', impact: 'positive', weight: 4, icon: '🏋️' },
    { name: 'Cardio / Running',         domain: 'physical', impact: 'positive', weight: 3, icon: '🏃' },
    { name: 'Stretching / Yoga',        domain: 'physical', impact: 'positive', weight: 2, icon: '🧘' },
    { name: 'Walked 10k+ Steps',        domain: 'physical', impact: 'positive', weight: 2, icon: '🚶' },
    { name: 'Healthy Meal Prep',        domain: 'physical', impact: 'positive', weight: 3, icon: '🥗' },
    { name: 'Hydrated (8+ glasses)',    domain: 'physical', impact: 'positive', weight: 2, icon: '💧' },
    { name: 'Excess Junk Food',         domain: 'physical', impact: 'negative', weight: 3, icon: '🍔' },
    { name: 'Skipped Meals',            domain: 'physical', impact: 'negative', weight: 2, icon: '⏭️' },
    { name: 'Poor Sleep (< 5hrs)',      domain: 'physical', impact: 'negative', weight: 4, icon: '😴' },
    { name: 'Energy Drinks / Excess Caffeine', domain: 'physical', impact: 'negative', weight: 2, icon: '☕' },

    // ─── Mental ───────────────────────────────────────
    { name: 'Informative YouTube',      domain: 'mental', impact: 'positive', weight: 2, icon: '📺' },
    { name: 'Read a Book (30+ min)',    domain: 'mental', impact: 'positive', weight: 3, icon: '📖' },
    { name: 'Deep Work Session',        domain: 'mental', impact: 'positive', weight: 4, icon: '🎯' },
    { name: 'Learned a New Skill',      domain: 'mental', impact: 'positive', weight: 4, icon: '🧠' },
    { name: 'Podcast / Audiobook',      domain: 'mental', impact: 'positive', weight: 2, icon: '🎧' },
    { name: 'Journaling / Reflection',  domain: 'mental', impact: 'positive', weight: 3, icon: '📝' },
    { name: 'Mindless Scrolling',       domain: 'mental', impact: 'negative', weight: 3, icon: '📱' },
    { name: 'Social Media Binge',       domain: 'mental', impact: 'negative', weight: 3, icon: '👎' },
    { name: 'Procrastination',          domain: 'mental', impact: 'negative', weight: 4, icon: '⏰' },
    { name: 'Negative Self-Talk',       domain: 'mental', impact: 'negative', weight: 3, icon: '💭' },

    // ─── Financial ────────────────────────────────────
    { name: 'Revenue Generated',        domain: 'financial', impact: 'positive', weight: 5, icon: '💰' },
    { name: 'Client Work Completed',    domain: 'financial', impact: 'positive', weight: 4, icon: '✅' },
    { name: 'Networking / Outreach',    domain: 'financial', impact: 'positive', weight: 3, icon: '🤝' },
    { name: 'Course / Certification',   domain: 'financial', impact: 'positive', weight: 3, icon: '🎓' },
    { name: 'Budget Review',            domain: 'financial', impact: 'positive', weight: 2, icon: '📊' },
    { name: 'Side Project Progress',    domain: 'financial', impact: 'positive', weight: 3, icon: '🚀' },
    { name: 'Impulse Spending',         domain: 'financial', impact: 'negative', weight: 3, icon: '🛒' },
    { name: 'Ignored Responsibilities', domain: 'financial', impact: 'negative', weight: 4, icon: '🚫' },
    { name: 'No Productive Output',     domain: 'financial', impact: 'negative', weight: 3, icon: '📉' },

    // ─── Spiritual ────────────────────────────────────
    { name: 'Quran Reading',            domain: 'spiritual', impact: 'positive', weight: 4, icon: '📿' },
    { name: 'All Prayers On Time',      domain: 'spiritual', impact: 'positive', weight: 5, icon: '🕌' },
    { name: 'Dhikr / Remembrance',      domain: 'spiritual', impact: 'positive', weight: 3, icon: '✨' },
    { name: 'Acts of Charity / Sadaqah',domain: 'spiritual', impact: 'positive', weight: 3, icon: '🤲' },
    { name: 'Gratitude Practice',       domain: 'spiritual', impact: 'positive', weight: 3, icon: '🙏' },
    { name: 'Community / Ummah Time',   domain: 'spiritual', impact: 'positive', weight: 2, icon: '👥' },
    { name: 'Delayed Prayers',          domain: 'spiritual', impact: 'negative', weight: 4, icon: '⚠️' },
    { name: 'Missed Prayer',            domain: 'spiritual', impact: 'negative', weight: 5, icon: '❌' },
    { name: 'Haram Content',            domain: 'spiritual', impact: 'negative', weight: 5, icon: '🚷' },
    { name: 'Gossip / Backbiting',      domain: 'spiritual', impact: 'negative', weight: 3, icon: '🗣️' },
  ];

  const now = new Date().toISOString();
  for (const a of activities) {
    await execute(
      'INSERT INTO activities (name, domain, impact, weight, icon, created_at) VALUES (?,?,?,?,?,?)',
      [a.name, a.domain, a.impact, a.weight, a.icon, now]
    );
  }

  console.log(`Seeded ${activities.length} default activities`);
}

module.exports = { seedActivities };

// Run directly
if (require.main === module) {
  seedActivities().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
