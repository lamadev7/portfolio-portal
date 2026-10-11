import { permanentRedirect } from "next/navigation";

/** The journey moved to the home route; keep old links working. */
export default function JourneyPage() {
  permanentRedirect("/");
}
