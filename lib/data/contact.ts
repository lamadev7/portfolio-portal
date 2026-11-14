export interface ContactLink {
  k: string;
  v: string;
  href: string;
}

export const contactLinks: ContactLink[] = [
  { k: "Email",    v: "parbatlama70@gmail.com",                       href: "mailto:parbatlama70@gmail.com" },
  { k: "Website",  v: "lamaparbat.com.np",                            href: "https://lamaparbat.com.np" },
  { k: "LinkedIn", v: "linkedin.com/in/parbat-lama-0bb4101b8",        href: "https://linkedin.com/in/parbat-lama-0bb4101b8" },
  { k: "GitHub",   v: "github.com/lamadev7  ·  github.com/lamaparbat", href: "https://github.com/lamadev7" },
  { k: "Phone",    v: "+977 974 533 9427",                             href: "tel:+9779745339427" },
];
