# Free drive replacement — 2026-10-16

Replaces the visible continuous-drive bonus entry with `drive/free.html`. The three hazard courses retain their engine, grading and storage. The old bonus engine remains as inactive code for compatibility with existing renderer tests; `choose` rejects its former index.

The first release contains a connected nine-intersection street grid, residential blocks, a teaching ground, a park and a coastal road. It supports steering and reverse through a bicycle-model update, building/boundary collisions, two camera views, a minimap, four destination visits and browser-local distance/location storage. There is no time limit. General traffic, pedestrians, signals and day/night switching are not part of this initial release.

Touch inputs have independent pointer ownership; pointer cancellation and lost capture release controls. Hiding the document pauses and saves; merely losing focus releases inputs. Gear changes require a stopped vehicle. Recovery places the vehicle on a nearby road. Malformed or blocked saved positions are rejected. WebGL failure shows a recoverable navigation/error screen.

Static geometry is batched with InstancedMesh; rendering does not create new per-frame geometries. Standard pixel ratio is capped at 1.5; low quality uses 1. No new network assets or dependencies are needed.

Checks: physics tests; jsdom input/navigation/persistence tests; scene construction using real Three.js geometry with a stub GPU renderer; existing three-course DOM regression; production build. This environment has no control-browser capability, so GPU rendering, visual layout and physical iPhone/Safari operation have not been visually verified.
