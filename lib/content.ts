import { DEFAULT_SETTINGS, formatPeso, type Settings } from "./rules.ts";

export const site = {
  name: "The Rio At Magdalena",
  shortName: "The Rio",
  tagline: "at Magdalena",
  description:
    "A riverside campsite in Magdalena, Laguna. Overnight camping, day tours and intimate events between two rivers.",
  address: "6FF6+M8, Magdalena, Laguna",
  plusCode: "6FF6+M8",
  mapUrl: "https://maps.google.com/?q=6FF6%2BM8+Magdalena+Laguna",
  mapEmbedUrl: "https://www.google.com/maps?q=6FF6%2BM8+Magdalena+Laguna&output=embed",
  mapTitle: "Map to The Rio At Magdalena",
  facebookUrl: "https://www.facebook.com/therioatmagdalena",
  instagramUrl: "https://www.instagram.com/therioatmagdalena/",
  messengerUrl: "https://m.me/therioatmagdalena",
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

export type Photo = {
  id: string;
  src: string | null;
  alt: string;
  caption: string;
  width: number;
  height: number;
};

function photo(
  id: string,
  caption: string,
  alt: string,
  width: number,
  height: number,
  src: string | null = null,
): Photo {
  return { id, src, alt, caption, width, height };
}

export type HomeHero = {
  overline: string;
  headline: string;
  subheading: string;
  primaryAction: NavLink;
  secondaryAction: NavLink;
  photo: Photo;
};

export const homeHero: HomeHero = {
  overline: "Magdalena, Laguna",
  headline: "Camp between two rivers.",
  subheading: "4.5 hectares of raw farmland, open for overnight camping, day tours and intimate events.",
  primaryAction: { href: "/book", label: "Book a stay" },
  secondaryAction: { href: "/rates", label: "See rates" },
  photo: photo(
    "hero-riverbank",
    "The riverbank at golden hour",
    "The riverbank at The Rio At Magdalena in golden evening light",
    2000,
    1200,
  ),
};

export type FactIcon = "water" | "tree" | "paw" | "moon";

export type Fact = {
  icon: FactIcon;
  label: string;
};

export const facts: readonly Fact[] = [
  { icon: "water", label: "2 rivers" },
  { icon: "tree", label: "4.5 hectares" },
  { icon: "paw", label: "Pet friendly (on leash)" },
  { icon: "moon", label: "Quiet time 10 PM" },
];

export const stayTimes = {
  overnight: "2:00 PM to 11:00 AM next day",
  dayTour: "8:00 AM to 6:00 PM",
  checkIn: "2:00 PM",
  checkOut: "11:00 AM",
} as const;

export const noWalkInsNotice = {
  title: "No walk-ins.",
  body: "Book online at least a day ahead.",
} as const;

export const messengerAction = {
  label: "Message us on Facebook",
  comingSoonLabel: "Online booking opens soon. Message us on Facebook.",
} as const;

export type RateRow = {
  label: string;
  price: string;
};

export type RateCardData = {
  id: "overnight" | "day-tour";
  overline: string;
  timeRange: string;
  unit: string;
  rows: readonly RateRow[];
  cta: NavLink;
};

export function buildRateCards(settings: Settings): readonly RateCardData[] {
  return [
    {
      id: "overnight",
      overline: "Overnight",
      timeRange: stayTimes.overnight,
      unit: "per person, per night",
      rows: [
        { label: "Adult", price: formatPeso(settings.overnightAdult) },
        { label: "Senior (60+) or child 4 to 12", price: formatPeso(settings.overnightReduced) },
        { label: "Child 3 and below", price: "Free" },
      ],
      cta: { href: "/book", label: "Book an overnight stay" },
    },
    {
      id: "day-tour",
      overline: "Day tour",
      timeRange: stayTimes.dayTour,
      unit: "per person",
      rows: [
        { label: "Adult", price: formatPeso(settings.dayAdult) },
        { label: "Senior (60+) or child 4 to 12", price: formatPeso(settings.dayReduced) },
        { label: "Child 3 and below", price: "Free" },
      ],
      cta: { href: "/book", label: "Book a day tour" },
    },
  ];
}

export const rateCards = buildRateCards(DEFAULT_SETTINGS);

export const tentRental = {
  price: formatPeso(DEFAULT_SETTINGS.tentPrice),
  unit: "per tent, per night",
  notes: [
    "Tent rental is for overnight stays only.",
    "Add the tents you want when you book. Availability is confirmed during booking.",
    "Pets are not allowed inside rented tents.",
  ],
} as const;

export type RatesExample = {
  adults: number;
  childAge: number;
  nights: number;
  nightlyTotal: number;
  total: number;
  downpayment: number;
  balance: number;
  formula: string;
};

export function buildRatesExample(settings: Settings): RatesExample {
  const adults = 2;
  const reducedGuests = 1;
  const childAge = 6;
  const nights = 2;
  const nightlyTotal = settings.overnightAdult * adults + settings.overnightReduced * reducedGuests;
  const total = nightlyTotal * nights;
  const downpayment = Math.ceil((total * settings.downpaymentPct) / 100);
  const balance = total - downpayment;
  const formula = `(${formatPeso(settings.overnightAdult)} × ${adults} + ${formatPeso(settings.overnightReduced)}) × ${nights} = ${formatPeso(total)}`;
  return { adults, childAge, nights, nightlyTotal, total, downpayment, balance, formula };
}

export const ratesExample = buildRatesExample(DEFAULT_SETTINGS);

export const ratesGuestNotes: readonly string[] = [
  "Senior means 60 years old or above. Senior and child rates are checked with a valid ID at check-in, and any difference is paid on site.",
  "Children 3 and below are free, but they still count toward your slot's guest limit and the campsite's daily limit.",
  `Each slot fits up to ${DEFAULT_SETTINGS.slotCapacity} guests. A bigger group books more than one slot.`,
];

export const ratesIncluded: readonly string[] = [
  `Your own camp slot, used by one group per night, for up to ${DEFAULT_SETTINGS.slotCapacity} guests`,
  "The same rate every day of the year: no weekend or holiday surcharge",
  "No firewood fee and no pet fee",
  "Pets are welcome on a leash",
];

export const onSiteFees = {
  title: "Paid at the campsite, not online",
  items: [
    `${formatPeso(300)} trash fee if you leave your trash behind. Bring your own trash bag.`,
    "A refundable security deposit at check-in. The amount is confirmed at check-in.",
    "The balance of your booking (the other 50%) is paid at check-in.",
  ],
} as const;

export const paymentSummary: readonly string[] = [
  `Pay ${DEFAULT_SETTINGS.downpaymentPct}% as a downpayment by GCash when you book, rounded up to the nearest peso.`,
  `Your slots are held for ${DEFAULT_SETTINGS.holdMinutes} minutes while you pay and upload your GCash reference number and a screenshot.`,
  "We check your payment and confirm your booking by email.",
  "Pay the remaining balance at check-in.",
];

export const cancellationSummary: readonly string[] = [
  "Cancel from your booking link until 11:59 PM the day before check-in and you get a full refund of what you paid.",
  "Refunds are sent by GCash.",
  "After that, message us on Facebook.",
  "To change your dates, cancel and rebook, or message us.",
];

export type BookingStep = {
  title: string;
  detail: string;
};

export const bookingSteps: readonly BookingStep[] = [
  { title: "Pick dates and slot", detail: "Choose overnight or a day tour, your dates and your camp slot." },
  { title: "Pay 50% via GCash", detail: "Send the downpayment and upload your GCash reference and screenshot." },
  { title: "We confirm by email", detail: "We check your payment and send your confirmation." },
  { title: "Pay the rest at check-in", detail: "Settle the balance when you arrive, and bring a valid ID." },
];

export const goodToKnow: readonly string[] = [
  "Check-in 2:00 PM, check-out 11:00 AM",
  "CLAYGO: clean as you go",
  "Bring your own trash bag",
  "Pets welcome on a leash",
  "Quiet time from 10:00 PM",
  "Refundable security deposit at check-in",
];

export type Camp = {
  id: string;
  name: string;
  status: "open" | "coming-soon";
  slots: readonly string[];
  summary: string;
  layout: readonly string[];
  nearby: readonly string[];
  cardPhoto: Photo | null;
  aerial: Photo | null;
};

export const camps: readonly Camp[] = [
  {
    id: "camp-1",
    name: "Camp 1",
    status: "open",
    slots: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    summary: "Camp 1 runs along the top of the riverbank cliff.",
    layout: ["Slots A to G line the cliff edge.", "Slots H and I sit inland, under the trees."],
    nearby: [
      "Two restrooms (CRs): one near slot I and one near slots B and C",
      "Two sets of stairs, one of them near slot A",
    ],
    cardPhoto: photo(
      "camp-1-trees",
      "Camp 1 on the cliff top",
      "Tents pitched along the riverbank cliff at Camp 1",
      1600,
      1200,
    ),
    aerial: photo(
      "camp-1-aerial",
      "Camp 1 aerial view, slots A to I",
      "Aerial view of Camp 1 with slots A to I marked along the cliff and under the trees",
      1080,
      1465,
      "/photos/camp-1-aerial.webp",
    ),
  },
  {
    id: "camp-2",
    name: "Camp 2",
    status: "open",
    slots: ["J", "K", "L1", "L2", "M", "N", "O"],
    summary: "Camp 2 is lower down, right beside the river.",
    layout: [
      "Slots J and K are by the water.",
      "Slots M, N and O are under the trees at the back.",
      "Slots L1 and L2 are on the far side.",
    ],
    nearby: ["Two sets of stairs up the slope", "Restroom (CR) details for Camp 2 coming soon"],
    cardPhoto: photo(
      "camp-2-river",
      "Camp 2 by the water",
      "Camp 2 on the low ground beside the river",
      1600,
      1200,
    ),
    aerial: photo(
      "camp-2-aerial",
      "Camp 2 aerial view, slots J to O",
      "Aerial view of Camp 2 with slots J, K, L1, L2, M, N and O marked beside the river",
      2000,
      1100,
      "/photos/camp-2-aerial.webp",
    ),
  },
  {
    id: "camp-3",
    name: "Camp 3",
    status: "coming-soon",
    slots: [],
    summary: "Not open yet.",
    layout: [],
    nearby: [],
    cardPhoto: null,
    aerial: null,
  },
  {
    id: "camp-4",
    name: "Camp 4",
    status: "coming-soon",
    slots: [],
    summary: "Not open yet.",
    layout: [],
    nearby: [],
    cardPhoto: null,
    aerial: null,
  },
];

export const openCamps: readonly Camp[] = camps.filter((camp) => camp.status === "open");

export const comingSoonCamps: readonly Camp[] = camps.filter((camp) => camp.status === "coming-soon");

export function describeSlots(camp: Camp): string {
  return `${camp.slots.length} slots · up to ${DEFAULT_SETTINGS.slotCapacity} guests each`;
}

export type RuleIcon = "leaf" | "trash" | "paw" | "lock" | "ban" | "moon";

export type HouseRule = {
  icon: RuleIcon;
  title: string;
  detail: string;
};

export const houseRules: readonly HouseRule[] = [
  { icon: "leaf", title: "CLAYGO", detail: "Clean as you go. Tidy up after yourself all through your stay." },
  {
    icon: "trash",
    title: "Bring your own trash bag",
    detail: `A ${formatPeso(300)} fee applies if trash is left behind.`,
  },
  {
    icon: "paw",
    title: "Pets on a leash",
    detail: "Pets are welcome, but they must stay on a leash. No pets inside rented tents.",
  },
  {
    icon: "lock",
    title: "Refundable security deposit",
    detail: "A refundable deposit is collected at check-in. The amount is confirmed at check-in.",
  },
  { icon: "ban", title: "No walk-ins", detail: "Every guest needs a booking made online, at least a day ahead." },
  { icon: "moon", title: "Quiet time from 10:00 PM", detail: "Keep it down after 10:00 PM so everyone can rest." },
];

export const whatToBring: readonly string[] = [
  "Valid ID for everyone (needed for senior and child rates)",
  "Your own tent and sleeping gear, unless you rent a tent from us",
  "Trash bag",
  "Drinking water",
  "Flashlight or headlamp",
  "Insect repellent",
  "Towel and a change of clothes",
  "Sunscreen and a hat",
  "A leash and what your pet needs, if you bring one",
  "Your balance and security deposit for check-in",
];

export type FaqItem = {
  question: string;
  answer: string;
};

export const faq: readonly FaqItem[] = [
  {
    question: "What time is check-in and check-out?",
    answer: `Overnight guests check in from ${stayTimes.checkIn} and check out by ${stayTimes.checkOut} the next day. Day tours run from 8:00 AM to 6:00 PM.`,
  },
  {
    question: "Which days are you open?",
    answer: "Every day of the year. The rates are the same on weekends and holidays.",
  },
  {
    question: "Can I just show up on the day?",
    answer: `No. ${noWalkInsNotice.title} ${noWalkInsNotice.body} Bookings open up to ${Math.round(DEFAULT_SETTINGS.windowDays / 30)} months ahead.`,
  },
  {
    question: "Are kids welcome?",
    answer: `Yes. Children 3 and below are free. Children 4 to 12 pay the reduced rate (${formatPeso(DEFAULT_SETTINGS.overnightReduced)} overnight, ${formatPeso(DEFAULT_SETTINGS.dayReduced)} for a day tour). Every child counts toward the guest limit, so include them in your booking.`,
  },
  {
    question: "Can I bring my dog?",
    answer:
      "Yes, pets are welcome on a leash. There is no pet fee. Pets are not allowed inside rented tents.",
  },
  {
    question: "Is there a senior discount?",
    answer: `Seniors are guests aged 60 or above and pay the reduced rate (${formatPeso(DEFAULT_SETTINGS.overnightReduced)} overnight, ${formatPeso(DEFAULT_SETTINGS.dayReduced)} for a day tour). Bring a valid ID. Senior and child rates are checked at check-in, and any difference is paid on site.`,
  },
  {
    question: "How do I pay?",
    answer: `You pay ${DEFAULT_SETTINGS.downpaymentPct}% by GCash when you book and the rest at check-in. A refundable security deposit is also collected at check-in, and the amount is confirmed then.`,
  },
  {
    question: "Can I cancel my booking?",
    answer:
      "Yes. You can cancel from your booking link until 11:59 PM the day before check-in and get a full refund of what you paid, sent by GCash. After that, message us on Facebook. To change your dates, cancel and rebook or message us.",
  },
  {
    question: "What if it rains or the river is high?",
    answer:
      "We are open every day, but we may close dates for bad weather or a high river. If a date you booked gets closed, you get a full refund. Message us on Facebook for current conditions before you travel.",
  },
  {
    question: "Can I rent a tent?",
    answer: `Yes, for overnight stays only. A tent is ${formatPeso(DEFAULT_SETTINGS.tentPrice)} per tent per night. Add the tents you want when you book.`,
  },
  {
    question: "How many people fit in a slot?",
    answer: `Each slot is for one group at a time, up to ${DEFAULT_SETTINGS.slotCapacity} guests. A bigger group books more than one slot. The campsite holds up to ${DEFAULT_SETTINGS.siteCap} guests on any date.`,
  },
  {
    question: "Do you host events or prenup shoots?",
    answer: "Yes, for intimate events and prenup shoots. See the Events page and send us a message.",
  },
];

export const gettingThere = {
  intro: "The Rio is best reached by car.",
  helpLine: "Need help finding us? Message us on Facebook and we will point you the right way.",
} as const;

const scenePhotos: readonly Photo[] = [
  photo(
    "riverbank-golden-hour",
    "Riverbank at golden hour",
    "The riverbank at The Rio At Magdalena in golden evening light",
    1600,
    1000,
  ),
  photo(
    "cliff-edge",
    "The cliff edge",
    "View from the cliff edge over the river at The Rio At Magdalena",
    1200,
    1600,
  ),
  photo("river", "The river", "The river running past the campsite", 1600, 1200),
  photo("bonfire", "Bonfire evening", "A bonfire glowing at the campsite in the evening", 1200, 1600),
  photo("tents", "Tents at the camp", "Camping tents pitched under the trees at The Rio", 1600, 1200),
  photo("hammocks", "Hammocks", "Hammocks hung between the trees at The Rio", 1600, 1200),
  photo(
    "camp-1-trees-wide",
    "Camp 1 under the trees",
    "Camp 1 slots in the shade of the trees at The Rio",
    1600,
    1200,
  ),
  photo(
    "camp-2-riverside-wide",
    "Camp 2 riverside",
    "Camp 2 on the low ground beside the river",
    1600,
    1200,
  ),
];

const aerialPhotos: readonly Photo[] = openCamps.flatMap((camp) => (camp.aerial ? [camp.aerial] : []));

export const gallery: readonly Photo[] = [...aerialPhotos, ...scenePhotos];

export const galleryStrip: readonly Photo[] = scenePhotos.slice(0, 6);

export const galleryNote = "More photos coming soon.";

export const eventsContent = {
  intro: "Looking for a quiet riverside spot for a small gathering or a prenup shoot? The Rio hosts both.",
  eventTypes: [
    { title: "Intimate events", detail: "Small gatherings with your people, by the river." },
    { title: "Prenup shoots", detail: "Open farmland and two rivers for your backdrop." },
  ],
  howItWorks: [
    "Tell us what you have in mind, your preferred date and roughly how many people.",
    "We reply to confirm details and what is possible.",
    "Sending an inquiry does not hold or block a date until we agree on the details.",
  ],
  formNotice: "Inquiry form coming soon. For now, message us on Facebook.",
  photo: photo(
    "events-riverside",
    "Riverside events",
    "A quiet riverside spot at The Rio set up for an intimate gathering",
    1600,
    1200,
  ),
} as const;

export const bookPage = {
  title: "Online booking opens soon",
  body: "Online booking opens soon. Message us on Facebook to ask about dates and slots in the meantime.",
  note: "Online booking will work for overnight stays and day tours, with a 50% GCash downpayment.",
} as const;

export const closingCta = {
  headline: "The river's waiting.",
  body: "Pick your dates, choose your slot and come camp between two rivers.",
} as const;

export type PrivacySection = {
  heading: string;
  paragraphs?: readonly string[];
  items?: readonly string[];
};

export type Privacy = {
  updated: string;
  intro: string;
  sections: readonly PrivacySection[];
};

export const privacy: Privacy = {
  updated: "November 19, 2026",
  intro:
    "This notice explains how The Rio At Magdalena handles your personal information, in line with the Data Privacy Act of 2012 (Republic Act No. 10173).",
  sections: [
    {
      heading: "What we collect",
      paragraphs: ["When you book or send us an inquiry, we collect:"],
      items: [
        "Your full name, mobile number and email address",
        "How many guests are coming (adults, seniors and children)",
        "Your dates, camp slots and tents",
        "Your GCash reference number and payment screenshot",
        "Any notes you add",
      ],
    },
    {
      heading: "Why we collect it",
      items: [
        "To manage your reservation and check your payment",
        "To contact you about your booking: confirmations, changes, cancellations and refunds",
        "To keep records of bookings and payments",
      ],
    },
    {
      heading: "Who can see it",
      paragraphs: [
        "Only the campsite owner and the admins who run bookings can see your booking details and payment proof. The email and hosting providers we use process your information for us so the website and emails can work.",
        "We do not publish guest details on this website.",
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: ["We keep your information only as long as needed to run the booking and for records."],
    },
    {
      heading: "Your rights",
      paragraphs: ["Under the Data Privacy Act you have the right to:"],
      items: [
        "Be informed about how your information is used",
        "Ask to see the information we hold about you",
        "Ask us to correct information that is wrong",
        "Ask us to delete or block your information, or object to how we use it",
        "File a complaint with the National Privacy Commission at privacy.gov.ph",
      ],
    },
    {
      heading: "Contact us",
      paragraphs: [
        "For any privacy request or question, message us on Facebook Messenger. We have no phone number or email for this yet.",
      ],
    },
  ],
};
