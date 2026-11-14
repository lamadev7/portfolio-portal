export interface EduRow {
  when: string;
  title: string;
  sub: string;
  award?: string;
}

export const education: EduRow[] = [
  {
    when: "Feb 2021 → Oct 2023",
    title: "Herald College Kathmandu",
    sub: "BSc (Hons) Information Technology · First Class Honors",
    award: "AAA Scholarship Recipient · 2023 & 2024",
  },
  {
    when: "Jan 2019 → Dec 2020",
    title: "Uniglobe SS / College",
    sub: "+2 (Management) · Computer Science major",
  },
];
