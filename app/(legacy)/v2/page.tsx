import type { Metadata } from "next";
import Journey2Loader from "@/components/journey2/Journey2Loader";

export const metadata: Metadata = { title: "The Road · v2", robots: { index: false, follow: false } };

/** Journey v2 in development: real geography by night, aerial legs between fully 3D location scenes. */
export default function V2Page() {
  return <Journey2Loader />;
}
