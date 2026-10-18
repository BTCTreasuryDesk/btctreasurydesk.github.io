/* BTC Treasury Desk: Members area switches. Change these, nothing else, to gate the area later.
   EMAIL_GATE   true  = visitors unlock the Members area with their email (Kit form, remembered in this browser). Current setup.
   MEMBERS_GATE false = no paid membership yet ("free for now"). Flip to true once a real paid login exists:
                        the email unlock then stops opening the area and the paid prompt shows instead.
   NOTE: on a static site any gate is "soft" (the code ships to the browser). Fine for list-building, not for secrets. */
window.BTD_MEMBERS = {
  EMAIL_GATE: true,
  MEMBERS_GATE: false,
  PAID_URL: '/subscribe/',           // where the paid prompt points once MEMBERS_GATE is on
  KIT_FORM: 'https://app.kit.com/forms/10006069/subscriptions', // Kit form uid 39d40fa61e (same as before)
  // Kit tag ids, one per choice (Kit > Subscribers > Tags; the id is in the tag's URL). null = not sent yet.
  // One form + tags = one subscriber per email; signing up again with the same email just adds tags.
  KIT_TAGS: { weekly: null, monthly: null, alerts: null, lib_tcs: null, lib_pguide: null, lib_cycle: null, lib_cheat: null, lib_prefs: null, lib_numbers: null, lib_data: null, lib_glossary: null, lib_whitepaper: null, lib_quotes: null },
  // Tip the Desk. Shown on /tip/ and the Members card ONLY when filled in. Never put a placeholder or example address here.
  TIP: { x: 'https://x.com/BTCTreasuryDesk', lightning: '', onchain: '' },
  /* Tiers. Everything is tagged with one tier; the paywall switch below gates by tier in ONE place (BTD_MEMBERS.canAccess).
     free   = public site.   member = free with email (Members desk).   pro = paid tier later ("Desk Pro"): the Pro Vault (/members/pro/) and Pro tools.
     PRO_GATE false = Pro is open to every email member during launch. Flip to true once paid login exists (Patreon / Stripe / Ko-fi): Pro items then
     need 'btd_paid' (set by the paid login) and everyone else sees the plans prompt (PAID_URL). */
  PRO_GATE: false,
  TOOLS: { zones: 'member', builder: 'pro', planner: 'pro', lab: 'pro', freedom: 'member', momentum: 'pro', ta: 'member', radar: 'pro', yield: 'member', clock: 'member', downloads: 'member' },
  VAULT: '/members/pro/',          // Pro Vault page; its weekly content (videos, treats) lives in members/data/pro.json, every item tier:'pro'
  STORAGE_KEY: 'btd_member',         // same key as the old Members page, so existing unlocks still count
  NEW_TOOLS: []  // NEW badges now come from members/data/weekly.json "fresh" (Sunday refresh)
};
/* One gate for every tier. Soft (static site). */
window.BTD_MEMBERS.canAccess = function (tier) { var C = window.BTD_MEMBERS, g = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var email = !C.EMAIL_GATE && !C.MEMBERS_GATE ? true : C.MEMBERS_GATE ? g('btd_paid') === '1' : g(C.STORAGE_KEY || 'btd_member') === '1';
  if (!tier || tier === 'free') return true; if (tier === 'member') return email; if (tier === 'pro') return C.PRO_GATE ? g('btd_paid') === '1' : email; return false; };
