# Snooker Lite provenance

Snooker Lite is an experimental, simplified snooker game developed in this repository.

Physics architecture and selected equations are adapted from and informed by **tailuge/billiards**, vendored in this repository at `vendor/tailuge-billiards` and originally published at https://github.com/tailuge/billiards.

The imported upstream revision for this repository is documented in `../UPSTREAM_IMPORT.md`.

Because Snooker Lite incorporates and adapts GPL-3.0 code and algorithms from that project, the `lite/` game is licensed under **GPL-3.0-only**. The complete GNU GPL v3 license text is included at `../vendor/tailuge-billiards/LICENSE`.

The following parts were intentionally rewritten instead of inheriting the upstream application architecture:

- game/container orchestration;
- camera system;
- pointer/touch input;
- HUD and power/spin controls;
- fixed 2.5D presentation;
- snooker-only table geometry boundary;
- pocket throat and jaw module boundaries.
