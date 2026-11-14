/**
 * Reusable section header — `// NN`, title, optional meta.
 * Used by Experience, Work, AgentsSection, EduHonors, Stack, Contact.
 */
export interface SectionHeadProps {
  num: string;       // e.g. "// 01"
  title: string;
  meta?: string;
}

export default function SectionHead({ num, title, meta }: SectionHeadProps) {
  return (
    <div className="section-head">
      <div className="num">{num}</div>
      <h2>{title}</h2>
      {meta ? <div className="meta">{meta}</div> : <div />}
    </div>
  );
}
