# Escalation rules

When any of the following happens, the agent **stops, writes an escalation ticket, and pings Vanshika immediately**. No autonomous response.

## Customer-language triggers

If a DM, comment, email, or review mentions any of these words/phrases:
- `lawyer`, `wakeel`
- `scam`, `fraud`, `dhokha`
- `police`, `consumer court`, `complaint`
- `media`, `journalist`, `press`
- threats of public posting / negative review

## Money triggers

- Refund request greater than **₹2,000**
- Discount request greater than **₹100**
- Any chargeback notification from Razorpay
- Any "this didn't arrive" claim on an order > ₹1,500

## Reputational triggers

- Negative public comment on an IG post
- Negative review on the website
- Tagged in a screenshot or callout post
- Influencer or press inquiry of any kind

## Self-flagged uncertainty

If the agent itself is unsure how to respond — *especially* in customer-facing contexts — escalate. Better to delay 6 hours than to send the wrong message.

## What an escalation ticket looks like

```
[ESCALATION] from <agent> at <timestamp>
Trigger: <which rule fired>
Context: <full DM / order / situation>
Drafted response (NOT SENT): <agent's best attempt>
Suggested action: <what the agent thinks should happen>
```

Vanshika reviews, decides, and either approves the draft, edits it, or handles directly.
