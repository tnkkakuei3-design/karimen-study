# Driving cockpit revision — 2026-10-15

The lane-switch command is replaced with continuous steering shared by all four courses. A small bicycle model uses speed-sensitive steering and heading assistance. The touch wheel springs back after release; bounded road edges keep the car within the existing scene. This is a simplified assisted driving experience, not a calibrated vehicle simulator.

Throttle and brake pressure build over time, braking takes priority over simultaneous accelerator input, and 3D pitch follows smoothed acceleration. Both renderers use vehicle heading. The controls now put a compact instrument strip above a wheel on the left and pedals on the right, with responsive portrait/landscape arrangements. Existing home, introduction and result characters remain.

Pointer ownership is tracked separately for each pedal and steering input, allowing simultaneous touch control and keyboard input without one release cancelling another held source. Blur, pause and page hiding clear controls. Help explains the steering assistance.

Validation:
- New vehicle tests cover partial steering, centering, steering at rest, throttle ramp, brake priority, pause release, road bounds, 30/60/120 Hz consistency and safe completion of all three learning courses.
- DOM integration covers simultaneous steering/pedal pointers, pointer cancellation, independent keyboard/touch ownership and multi-pointer pedal release.
- Scheduler regression: 120 Hz / 10 seconds => 600 draw submissions, 200 audio updates, 114 observed game DOM mutations. Light mode => 60 draws / 2 seconds. No idle animation loop on home/ready/paused/hidden.
- Existing all-course renderer matrix budgets remain unchanged. These are work-count tests, not hardware FPS or GPU measurements.

Real-device touch feel and mobile GPU performance require physical device testing. The 85-point figure discussed before implementation remains a design target, not a measured result.
