# Residential and coastal scenery

Adds gabled roofs, entrances, windows, porches and outer-street gardens with walls and planters. Adds a coastal promenade, benches, lamps, static surf bands and distant rocky islands. Shared geometries and instancing keep repeated scenery batched.

Colliders cover garden walls, planters, benches and lamps. Automated lane sampling verifies that both directions of every street remain clear.

Validation: free-drive physics tests, jsdom interaction tests, real Three.js geometry/collider checks, npm run build and git diff --check passed. Scene contains 61 top-level objects and 2520 instances; these are not draw-call or FPS measurements. Browser/WebGL and physical-phone visual performance remain unverified.

The canceled stage-edge and gear-control changes are excluded. Existing gear and movement behavior are preserved.
