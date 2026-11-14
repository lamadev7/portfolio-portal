/**
 * "I build …" with the phrase rolling up through a one-line window, like a slot reel. Pure CSS:
 * the first phrase is repeated at the end so the loop resets invisibly.
 */
export default function Reel({ lead, phrases }: { lead: string; phrases: string[] }) {
  const loop = [...phrases, phrases[0]];
  return (
    <p className="build">
      <span className="sr">
        {lead} {phrases.join(" ")}
      </span>
      <span aria-hidden="true">
        {lead}{" "}
        <span className="reel" style={{ "--n": phrases.length } as React.CSSProperties}>
          <span>
            {loop.map((p, i) => (
              <b key={i}>{p}</b>
            ))}
          </span>
        </span>
      </span>
    </p>
  );
}
