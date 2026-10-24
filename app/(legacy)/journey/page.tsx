import { permanentRedirect } from "next/navigation";

/** The journey now lives at /trails; keep old links working. */
export default function JourneyPage() {
  permanentRedirect("/trails");
}
