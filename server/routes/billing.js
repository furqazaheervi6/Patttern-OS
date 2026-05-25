const express = require('express');
const router = express.Router();
const { queryOne, execute } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

let stripe;
function getStripe() {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

const PLANS = {
  pro: {
    monthly: process.env.STRIPE_PRICE_MONTHLY || null,
    name: 'PatternOS Pro',
    amount: 2000,  // $20/month in cents
  },
};

// GET /api/billing/status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const user = await queryOne('SELECT plan, subscription_end, stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?', [req.user.id]);
    const isActive = user?.plan === 'pro' && (!user.subscription_end || new Date(user.subscription_end) > new Date());
    res.json({
      plan: user?.plan || 'free',
      is_pro: isActive,
      subscription_end: user?.subscription_end || null,
      has_stripe: !!user?.stripe_customer_id,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/checkout — create Stripe checkout session
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const s = getStripe();
    if (!s) return res.status(503).json({ error: 'Billing not configured — set STRIPE_SECRET_KEY in .env' });
    if (!PLANS.pro.monthly) return res.status(503).json({ error: 'STRIPE_PRICE_MONTHLY not configured' });

    const user = await queryOne('SELECT email, name, stripe_customer_id FROM users WHERE id = ?', [req.user.id]);

    let customerId = user?.stripe_customer_id;
    if (!customerId) {
      const customer = await s.customers.create({ email: user.email, name: user.name || user.email, metadata: { patternos_user_id: req.user.id } });
      customerId = customer.id;
      await execute('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customerId, req.user.id]);
    }

    const origin = req.headers.origin || 'http://localhost:5173';
    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLANS.pro.monthly, quantity: 1 }],
      success_url: `${origin}/settings?billing=success`,
      cancel_url:  `${origin}/settings?billing=cancelled`,
      metadata: { user_id: req.user.id },
    });

    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/portal — Stripe customer portal for manage/cancel
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const s = getStripe();
    if (!s) return res.status(503).json({ error: 'Billing not configured' });

    const user = await queryOne('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.id]);
    if (!user?.stripe_customer_id) return res.status(400).json({ error: 'No billing account found' });

    const origin = req.headers.origin || 'http://localhost:5173';
    const session = await s.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${origin}/settings`,
    });

    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/billing/webhook — Stripe webhook events
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const s = getStripe();
  if (!s) return res.sendStatus(200);

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = s.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch {
    return res.status(400).send('Webhook signature invalid');
  }

  try {
    const obj = event.data.object;
    if (event.type === 'checkout.session.completed') {
      const userId = obj.metadata?.user_id;
      if (userId) {
        await execute(`UPDATE users SET plan = 'pro', stripe_subscription_id = ? WHERE id = ?`, [obj.subscription, userId]);
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subId = obj.id;
      const isActive = obj.status === 'active' || obj.status === 'trialing';
      const periodEnd = obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null;
      await execute(
        `UPDATE users SET plan = ?, subscription_end = ? WHERE stripe_subscription_id = ?`,
        [isActive ? 'pro' : 'free', periodEnd, subId]
      );
    }
    // Log event
    await execute(
      `INSERT INTO subscription_events (user_id, event_type, stripe_id, payload) VALUES (?, ?, ?, ?)`,
      [obj.metadata?.user_id || null, event.type, event.id, JSON.stringify(obj)]
    ).catch(() => {});
  } catch {}

  res.sendStatus(200);
});

module.exports = router;
