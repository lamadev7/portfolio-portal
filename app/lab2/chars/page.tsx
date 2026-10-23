import { notFound } from "next/navigation";
import CharLabLoader from "./CharLabLoader";

/* dev-only bench for the Journey v2 characters */
export default function CharLabPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <CharLabLoader />;
}
