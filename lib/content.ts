export const site = {
  name: "The Rio At Magdalena",
  shortName: "The Rio",
  tagline: "at Magdalena",
  description:
    "A riverside campsite in Magdalena, Laguna. Overnight camping, day tours and intimate events between two rivers.",
  address: "6FF6+M8, Magdalena, Laguna",
  mapUrl: "https://maps.google.com/?q=6FF6%2BM8+Magdalena+Laguna",
  facebookUrl: "https://www.facebook.com/therioatmagdalena",
  instagramUrl: "https://www.instagram.com/therioatmagdalena/",
  quietHours: "Quiet time from 10:00 PM",
} as const;

export type NavLink = {
  href: string;
  label: string;
};

export const navLinks: readonly NavLink[] = [
  { href: "/camps", label: "Camps" },
  { href: "/rates", label: "Rates" },
  { href: "/rules", label: "Rules & FAQ" },
  { href: "/getting-there", label: "Getting there" },
  { href: "/gallery", label: "Gallery" },
  { href: "/events", label: "Events" },
];

export const bookLink: NavLink = { href: "/book", label: "Book now" };

export const privacyLink: NavLink = { href: "/privacy", label: "Privacy notice" };

export const homeHero = {
  overline: "Magdalena, Laguna",
  headline: "Camp between two rivers.",
  subheading: "4.5 hectares of raw farmland, open for overnight camping, day tours and intimate events.",
  primaryAction: { href: "/book", label: "Book a stay" },
  secondaryAction: { href: "/rates", label: "See rates" },
} as const;
