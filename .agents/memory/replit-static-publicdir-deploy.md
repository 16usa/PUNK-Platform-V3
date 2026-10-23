---
name: Replit static artifact packaging
description: Prevent missing publicDir errors in production static deployments.
---

Do not exclude a generated static artifact's configured `publicDir` through `.replitignore`. Replit can complete the build but omit that directory from the serving image, leaving the static handler unable to serve the site.

**Why:** Production logs showed that the build emitted the public bundle while the runtime image reported that the configured `publicDir` did not exist.

**How to apply:** When a Replit artifact uses `serve = "static"`, compare its configured `publicDir` with `.replitignore`. It may remain excluded from Git tracking through `.gitignore` if appropriate, but it must be included in the deployment image.
