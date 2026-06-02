## Consolidated

## Recent
[chat] templates/index.json can exceed Shopify's 512 KB per-template push limit purely from pretty-print whitespace (16k lines, 2-space indent = ~813 KB while actual data is ~385 KB). Fix non-destructively by minifying: JSON.parse (strip the leading /* */ comment first) then JSON.stringify with no indent. Preserves all sections/blocks/settings.
[chat] video-modal block settings video_desktop/video_mobile/thumbnail_video are "type": "video". When the source store's videos don't exist in the target store, set the value to "" (empty string is the valid "no video" value) — do NOT delete the key.
