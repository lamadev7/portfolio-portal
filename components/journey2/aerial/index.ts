import type { Aerial } from "../contracts";
import { AerialEngine, type AerialExt, type AerialOptions } from "./engine";

export { AERIAL_FOV, FLYBY, HANDOFF, OVERVIEW_LL, handoffPose, poseToShot, type AerialExt, type AerialOptions } from "./engine";
export { ATTRIBUTION } from "./style";

/** MapLibre night flight between stops; see AerialExt for the flyby orbit and the live pose. */
export function createAerial(opts?: AerialOptions): Aerial & AerialExt {
  return new AerialEngine(opts);
}
