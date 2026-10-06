# Security scope

This is a local, single-user workbench, not a hosted service. Bind only to 127.0.0.1. Host/origin checks are not authentication. Do not expose the Next.js development server or Chrome debugging port to the network.

Never upload reports, review backups, browser profiles, tokens or private screenshots to an Issue. Report a security concern without business data.

Release preparation updates the original Next.js 14.2.23 dependency to 15.5.27 and pins PostCSS 8.5.29 / selector parser 7.1.6 overrides. This is not a claim of complete security auditing or zero advisories. The retained Tailwind CSS 3 dependency chain includes braces 3.0.3, with an unresolved pattern-parsing denial-of-service advisory (GHSA-vfj7-8cjw-p6xm). Only build trusted local source; do not process attacker-provided glob patterns/configuration. A Tailwind 4 migration requires separate UI compatibility testing and is not silently forced for this release. Review npm audit periodically.

Official report downloads require the user's own authorized shop login and compliance with the platform's rules. No authentication bypass or automatic ad modifications are supported. Back up data before import/recovery.
