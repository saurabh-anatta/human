# GIT repo
git@github.com:saurabh-anatta/human.git

# Store
anatta-ai.myshopify.com

# Client
anatta-ai

# Theme Base
Horizon

# Theme Name
SAURABH Theme - Human

# Git Branch
feature/PLP

# Task
Fix the theme validation error in `templates/index.json`: the `video_mobile` setting value does not point to an applicable Shopify-hosted video resource.

There are several `video_mobile` settings with invalid values:
- Lines around 8283, 8641, and 8999 reference `shopify://files/videos/...mp4` paths (e.g. `Davis-tv-video.mp4`, `ZS_Mobile_Hero_Video_Animated.mp4`) that do not resolve to valid Shopify-hosted video resources on this store.
- One `video_mobile` value is set to an empty string (around line 14889).

For each invalid `video_mobile` setting, resolve the validation error. If a referenced video file does not exist as a Shopify-hosted video resource on the store, clear the value (set it to an empty string) so it no longer references a non-existent resource, OR point it to a valid shopify-hosted video resource if an equivalent one exists. Empty `video_mobile` values that are already valid (no resource referenced) should be left as-is and not flagged.

Do not modify any other settings or sections beyond what is required to clear the `video_mobile` validation errors. This is a validation-fix task — no new sections or templates should be created.

# Acceptance Criteria
- `templates/index.json` passes theme validation with no `video_mobile`-related errors.
- No `video_mobile` setting references a `shopify://files/videos/...` path that does not resolve to an existing Shopify-hosted video resource.
- Invalid `video_mobile` references are either cleared (empty value) or repointed to a valid shopify-hosted video resource.
- No unrelated settings, sections, or templates are modified.
- The theme continues to render the homepage without errors after the fix.
