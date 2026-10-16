# Horizon, junctions and residential boundaries

- Ground, sea and shore continue beyond the playable area; fog ends at 265m with low hills beyond the western boundary. The driveable limit stays 145m.
- All nine junctions use east/west priority roads with a continuous white centre line. North/south approaches have stop lines before the crosswalks and inward-facing inverted-triangle stop signs on their left side. This update adds visual road controls, not automated stop scoring.
- Every non-shop house has a boundary wall, a clear gate/driveway and a mailbox. Shared layout drives collisions.
- A nine-space monthly parking area occupies part of the empty western teaching-ground edge. The existing teaching markings are shortened so they do not overlap it. Wheel stops and the parking sign post have colliders.
- Low-contrast procedural grass texture uses world-space coordinates to keep the scale consistent.

References reviewed:
https://www.pref.hiroshima.lg.jp/site/police-shobara/psc123r62.html — priority road includes a centre line continuing through the junction.
https://www.police.pref.fukushima.jp/03.tetuduki/-jyouhoukoukai/reiki_int/reiki_honbun/u244RG00002609.html — stop-line and stop-sign placement.
https://www.npa.go.jp/bureau/traffic/oudanhodou/info.html — crossing and stop-line relationship.

Validation: all 18 stop approaches, positions before crossings, obstacle colliders, clear gates and parking aisle, sampled road lanes, driving model, DOM interactions, external assets, Three.js scene construction and production build passed. GPU image/real-device FPS remain unverified.
