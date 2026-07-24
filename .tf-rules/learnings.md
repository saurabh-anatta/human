# Theme Factory Learnings — human (Horizon)

## Recent
[chat] Overlay chapters' negative margins make .story-chapter document ranges overlap — scroll-spy must pick the LAST chapter (DOM order) whose rect.top crossed the threshold, never the first range containing a point
[chat] Several story chapters have data-anchor values with no subnav item (blood-vessels, the-advisors, the-proof-stats, the-athletes, closing-cta) — scroll-spy must walk backwards to the nearest nav-anchored chapter so the right pill stays lit
[chat] Use getBoundingClientRect().top + window.scrollY for scroll targets, not element.offsetTop — offsetTop is relative to the nearest positioned ancestor and silently breaks click-to-scroll
[chat] .story-subnav-section full visual height is 64px (21px nav padding-top + 43px capsule) — its margin-bottom must be -64px to fully overlap the hero without pushing the page down
[chat] Clicking the first subnav item ("HOW IT STARTED") should scroll to the very top of the page (hero included), not to the heartbeat chapter's offset — client preference
