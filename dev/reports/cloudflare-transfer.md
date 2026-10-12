# Cloudflare progress transfer

Production source: https://tnkkakuei3-design.github.io/karimen-study/migration.html
Target: https://karimen-study.pages.dev/migration.html

One user gesture opens target window, exchanges progress using postMessage with exact origin, window identity, and cryptographic nonce checks. Payload is never placed in URL/network requests. Original storage remains untouched. Both sides use the existing recovery adapter; target validates before writing and waits for durable save status. Exam snapshots remain paused. Existing nonempty target progress blocks replacement; cross-origin merging is not yet implemented. This is migration, not ongoing cloud synchronization.

Validation: npm run build and node test-migration.mjs passed. No actual iPhone/browser popup transfer verification was available in this environment. Popup blocking gives retry guidance. Both production deployments must contain the transfer files before starting.

Next: optional identity, D1 cloud storage with revision checks and account isolation, server-scored time attack, history, aggregated store interactions and one chat room. Requires Cloudflare database binding/admin setup; Git integration alone does not provision these resources.
