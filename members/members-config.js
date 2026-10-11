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
  STORAGE_KEY: 'btd_member',         // same key as the old Members page, so existing unlocks still count
  NEW_TOOLS: ['zones', 'builder', 'lab', 'ta']  // tools that show a NEW badge
};
