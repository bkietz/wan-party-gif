// Through a cute coincidence, a circular orbit of the Earth
// which takes 1/6 of an Earth day has an altitude of almost
// exactly one Earth radius. At that distance the Earth has
// an angular diameter of 60 degrees- large but comfortably
// viewable by a human all at once.
//
// Another cute coincidence is that a circular orbit of the
// Earth which takes 1/3 of an Earth day has an orbital radius
// of almost exactly PI Earth radii. (Angular diameter of
// ~37 degrees)
//
// Let's simulate (a time lapse of) an orbit like that. We'll
// have the veiwpoint orbit and remain focused on Earth.
//
// If we complete three orbits per day but the Earth is rotating
// once per day, we'll pass each feature on the surface twice
// per day. The Earth's shadow is basically stationary for
// our purposes, so we'd pass it three times per day.
//
// These constraints mean the simulation will repeat perfectly
// every six orbits- great since we're making a GIF and it'd look
// janky otherwise.
//
// The sun has an angular diameter of half a degree from Earth, so
// it won't really be visible as it blinks past unless this simulation
// gets inordinately complicated.

export function surfaceRotation(time: number): number {
  return -time * 2 * 360;
}

export function absoluteRotation(time: number): number {
  return -time * 3 * 360;
}
