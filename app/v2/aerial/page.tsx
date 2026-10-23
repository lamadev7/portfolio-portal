import { notFound } from "next/navigation";
import AerialDevLoader from "./AerialDevLoader";

/* dev-only bench: flies the whole route and logs fps, long frames and blank-tile samples per leg */
export default function AerialDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <AerialDevLoader />;
}
