import { photo, withDerivedPrice } from "@/lib/format";
import type {
  Category,
  Coupon,
  Faq,
  JournalEntry,
  Order,
  Product,
  Review,
  User,
  Variant,
} from "@/lib/types";
import { approxProductWeight } from "@/lib/shipping/weight";

const guides: Record<string, { ingredients: string[]; howToUse: string[] }> = {
  "Body Butter": {
    ingredients: [
      "Butyrospermum parkii (shea) butter",
      "Astrocaryum murumuru seed butter",
      "Simmondsia chinensis (jojoba) oil",
      "Tocopherol",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Warm a small amount between the palms.",
      "Press into still-damp skin after bathing.",
      "Work through elbows, knees, and ankles.",
    ],
  },
  "Whipped Soap": {
    ingredients: [
      "Potassium cocoate",
      "Glycerin",
      "Aloe leaf juice",
      "Oat extract",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Scoop a small amount into damp hands.",
      "Lather over the body and rinse with warm water.",
      "Follow with butter while the skin is still warm.",
    ],
  },
  "Sugar Scrub": {
    ingredients: [
      "Sucrose",
      "Butyrospermum parkii butter",
      "Cocos nucifera oil",
      "Tocopherol",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Use on damp skin, two or three times a week.",
      "Massage in slow circles, then rinse.",
      "Avoid the face and any broken skin.",
    ],
  },
  "Bath Salts": {
    ingredients: [
      "Maris sal (sea salt)",
      "Magnesium sulfate",
      "Simmondsia chinensis oil",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Draw a warm bath.",
      "Stir in a small handful until the salts dissolve.",
      "Soak for fifteen quiet minutes.",
    ],
  },
  "Luxury Soap": {
    ingredients: [
      "Saponified olive, coconut, and shea oils",
      "Glycerin",
      "Oat milk or hinoki water",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Wet the bar and build a soft lather.",
      "Wash, then rinse.",
      "Rest the bar on a dry dish between uses.",
    ],
  },
  "Everyday Soap": {
    ingredients: [
      "Saponified olive and coconut oils",
      "Glycerin",
      "Activated charcoal or olive leaf, where noted",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Lather between wet hands or on a cloth.",
      "Rinse with warm water.",
      "Keep the bar draining so it lasts.",
    ],
  },
  "Scented Candle": {
    ingredients: [
      "Coconut and soy wax blend",
      "Cotton wick",
      "Fragrance (essential oil blend)",
    ],
    howToUse: [
      "Trim the wick to about 5 mm before lighting.",
      "Burn until the surface is evenly liquid, then no longer than three hours.",
      "Keep away from drafts, children, and anything that can catch.",
    ],
  },
  "Jar Candle": {
    ingredients: ["Coconut and soy wax blend", "Cotton wick", "Fragrance (essential oil blend)"],
    howToUse: [
      "Burn on a level, heat-safe surface.",
      "Let the wax pool reach the glass before extinguishing.",
      "Stop use when 1 cm of wax remains.",
    ],
  },
  "Travel Candle": {
    ingredients: ["Coconut wax", "Cotton wick", "Fragrance (essential oil blend)", "Tin vessel"],
    howToUse: [
      "Place the tin on a stable surface.",
      "Burn for at least one hour on the first light.",
      "Allow the tin to cool before closing the lid.",
    ],
  },
  Candle: {
    ingredients: ["Coconut and soy wax blend", "Cotton wick", "Fragrance (essential oil blend)"],
    howToUse: [
      "Set the vessel where it cannot be tipped.",
      "Burn within sight, and never while sleeping.",
      "Extinguish and let the wax settle before relighting.",
    ],
  },
  Apparel: {
    ingredients: ["Washed linen or cotton, as described on the garment label."],
    howToUse: [
      "Wash cold with similar colours.",
      "Hang to dry.",
      "Warm iron on the reverse if you want a sharper line.",
    ],
  },
};

function faqs(name: string, scent: string): Faq[] {
  return [
    {
      question: `What does ${name} smell like?`,
      answer: `${scent.charAt(0).toUpperCase()}${scent.slice(1)}. The scent stays close rather than filling the room.`,
    },
    {
      question: "Can I use it every day?",
      answer: "Yes. These formulas are made for ordinary routines. Scrubs are the exception — two or three times a week is enough.",
    },
    {
      question: "How should I store it?",
      answer: "Cool, dry, and out of direct sun. Close jars between uses. Candles belong on a steady surface, away from curtains and drafts.",
    },
  ];
}

let reviewId = 0;
function review(name: string, rating: number, title: string, body: string, day: number): Review {
  reviewId += 1;
  return {
    id: `rev-${reviewId}`,
    name,
    rating,
    title,
    body,
    date: new Date(2026, 8, day).toISOString(),
  };
}

function vols(
  rows: { label: string; price: number; compare?: number; stock: number }[],
): Variant[] {
  return rows.map((row) => ({
    id: row.label.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    label: row.label,
    price: row.price,
    compareAtPrice: row.compare,
    stock: row.stock,
  }));
}

function sizes(price: number, compare?: number): Variant[] {
  return ["XS", "S", "M", "L", "XL"].map((label, index) => ({
    id: label.toLowerCase(),
    label,
    price,
    compareAtPrice: compare,
    stock: [3, 8, 12, 9, 4][index],
  }));
}

type Draft = {
  id: string;
  name: string;
  categoryId: Product["categoryId"];
  type: string;
  scent: string;
  shortDescription: string;
  description: string;
  benefits: string[];
  images: string[];
  variants: Variant[];
  rating: number;
  reviewCount: number;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  createdAt: string;
  reviews?: Review[];
};

function make(draft: Draft): Product {
  const guide = guides[draft.type];
  const base: Product = {
    id: draft.id,
    slug: draft.id,
    name: draft.name,
    categoryId: draft.categoryId,
    type: draft.type,
    scent: draft.scent,
    price: 0,
    shortDescription: draft.shortDescription,
    description: draft.description,
    benefits: draft.benefits,
    ingredients: guide.ingredients,
    howToUse: guide.howToUse,
    images: draft.images.map((id) => photo(id)),
    variants: draft.variants,
    featured: draft.featured ?? false,
    bestseller: draft.bestseller ?? false,
    newArrival: draft.newArrival ?? false,
    active: true,
    weightGrams: approxProductWeight(draft.type),
    createdAt: draft.createdAt,
    rating: draft.rating,
    reviewCount: draft.reviewCount,
    reviews: draft.reviews ?? [],
    faqs: faqs(draft.name, draft.scent),
  };
  return withDerivedPrice(base);
}

export const seedCategories: Category[] = [
  {
    id: "body-care",
    name: "Body Care",
    description: "Butters, scrubs, salts, and whipped cleansers for daily skin.",
    image: "/silknknot/body_butter.jpg",
    imageAlt: "/silknknot/sugar_scrap1.jpg",
    order: 0,
  },
  {
    id: "bath-soap",
    name: "Bath & Soap",
    description: "Luxury bars and everyday soaps, poured in small batches.",
    image: "/silknknot/soap1.webp",
    imageAlt: "/silknknot/soap2.webp",
    order: 1,
  },
  {
    id: "aromatherapy",
    name: "Aromatherapy",
    description: "Candles and quiet scents for the last hour of the day.",
    image: "/silknknot/candle1.jpg",
    imageAlt: "/silknknot/candle2.webp",
    order: 2,
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    description: "Linen and washed cotton meant to be worn after the bath.",
    image: "/silknknot/candle4.jpg",
    imageAlt: "/silknknot/whipped_shop.jpg",
    order: 3,
  },
];

export const seedProducts: Product[] = [
  make({
    id: "silk-veil-body-butter",
    name: "Silk Veil Body Butter",
    categoryId: "body-care",
    type: "Body Butter",
    scent: "sandalwood and rice milk",
    shortDescription: "A whipped shea butter that melts on warm skin and leaves a soft, dry finish.",
    description:
      "Silk Veil is the butter we reach for when the bath is over and the skin is still warm. Shea and murumuru melt on contact, then settle so clothing can follow. The scent — sandalwood warmed with rice milk — is present for a minute and then stays close.",
    benefits: ["Deeply nourishing", "Softens dry skin", "Comfortable for every day"],
    images: ["/silknknot/body_butter.jpg", "/silknknot/body_butter2.webp"],
    variants: vols([
      { label: "100 ml", price: 799, stock: 18 },
      { label: "200 ml", price: 999, compare: 1280, stock: 24 },
      { label: "400 ml", price: 1490, stock: 9 },
    ]),
    rating: 4.8,
    reviewCount: 128,
    featured: true,
    bestseller: true,
    createdAt: "2025-11-02T00:00:00.000Z",
    reviews: [
      review("Meera Iyer", 5, "The finish is the point", "It sinks in. I can dress straight after and my skin still feels looked after at night.", 12),
      review("Anika Shah", 5, "Quiet scent", "Sandalwood without the heavy trail. The 200 ml lives by the shower.", 4),
      review("Rahul Menon", 4, "Rich, not greasy", "A little goes further than I expected. Elbows are finally calm.", 18),
      review("Leela Krishnan", 5, "Warm skin, then clothes", "I press it in while my skin is still damp. It melts, then settles, and a shirt can go on.", 7),
      review("Farah Qureshi", 4, "The 100 ml for a week away", "Enough for travel. The scent stays close to the skin instead of filling the room.", 21),
      review("Sana Kapoor", 5, "A little covers both shins", "A small amount is enough for shins and elbows. I have gone back to the 200 ml.", 27),
    ],
  }),
  make({
    id: "night-milk-butter",
    name: "Night Milk Butter",
    categoryId: "body-care",
    type: "Body Butter",
    scent: "tonka and warm milk",
    shortDescription: "A denser evening butter for shins, hands, and the dry air of late nights.",
    description:
      "Night Milk is Silk Veil’s slower sibling. The texture is denser, the scent a little warmer, and it is meant for the hour when you are no longer going anywhere. Press it into shins and hands. Leave it there.",
    benefits: ["Richer evening care", "Comforts tight skin", "Soft tonka scent"],
    images: ["/silknknot/body_butter.png", "/silknknot/body_butter2.webp"],
    variants: vols([
      { label: "100 ml", price: 890, stock: 14 },
      { label: "200 ml", price: 1140, stock: 16 },
    ]),
    rating: 4.7,
    reviewCount: 46,
    newArrival: true,
    createdAt: "2026-08-12T00:00:00.000Z",
    reviews: [
      review("Leela Nair", 5, "Winter hands", "I keep the small jar by the bed. It has a milky sweetness that doesn’t linger in the room.", 8),
    ],
  }),
  make({
    id: "cloud-whip-soap",
    name: "Cloud Whip Soap",
    categoryId: "body-care",
    type: "Whipped Soap",
    scent: "neroli and clean cotton",
    shortDescription: "A cloud-light cleanser that lathers to almost nothing and rinses without a film.",
    description:
      "Cloud Whip is a whipped soap for people who want the bath to feel soft from the first step. It lathers quickly, smells like neroli on clean cotton, and rinses without the tight feeling of a harsh wash.",
    benefits: ["Gentle cleanse", "Airy lather", "Leaves skin comfortable"],
    images: ["/silknknot/whipped_shop.jpg", "/silknknot/soap2.webp"],
    variants: vols([
      { label: "150 ml", price: 640, stock: 20 },
      { label: "250 ml", price: 749, stock: 22 },
    ]),
    rating: 4.6,
    reviewCount: 73,
    featured: true,
    createdAt: "2026-01-20T00:00:00.000Z",
    reviews: [
      review("Sana Qureshi", 5, "Like washing with air", "The lather is ridiculous in the best way. Skin doesn’t squeak.", 15),
    ],
  }),
  make({
    id: "palm-sugar-scrub",
    name: "Palm Sugar Scrub",
    categoryId: "body-care",
    type: "Sugar Scrub",
    scent: "fig leaf and salt",
    shortDescription: "A polishing sugar scrub that smooths without leaving the skin stripped.",
    description:
      "Palm Sugar is a polish, not a punishment. The grains soften as you massage, the butter in the base keeps the skin from feeling raw, and the fig-leaf scent is green rather than sweet. Use it before the butter, not instead of it.",
    benefits: ["Smooths roughness", "Doesn’t strip", "Rinses clean"],
    images: ["/silknknot/sugar_scrap1.jpg", "/silknknot/sugar_scrap2.webp"],
    variants: vols([
      { label: "200 g", price: 890, compare: 1050, stock: 17 },
      { label: "400 g", price: 1290, stock: 8 },
    ]),
    rating: 4.7,
    reviewCount: 91,
    bestseller: true,
    createdAt: "2025-12-01T00:00:00.000Z",
    reviews: [
      review("Devika Rao", 5, "Arms feel new", "I use it on Sunday evenings. The grains melt, which I didn’t expect from a scrub.", 6),
      review("Kabir Das", 4, "Fig, not candy", "The scent is green and short. Texture is generous.", 21),
    ],
  }),
  make({
    id: "cane-sugar-polish",
    name: "Cane Sugar Polish",
    categoryId: "body-care",
    type: "Sugar Scrub",
    scent: "citrus cane",
    shortDescription: "A lighter citrus polish for shoulders, arms, and the start of warmer months.",
    description:
      "Cane Sugar Polish is the brighter scrub in the studio. Finer grains, a quick citrus scent, and enough oil that you don’t need to rush to moisturise — though you still should.",
    benefits: ["Finer polish", "Bright citrus scent", "Quick rinse"],
    images: ["/silknknot/sugar_scrap2.webp", "/silknknot/sugar_scrap1.jpg"],
    variants: vols([
      { label: "200 g", price: 820, stock: 15 },
      { label: "400 g", price: 1180, stock: 7 },
    ]),
    rating: 4.5,
    reviewCount: 33,
    createdAt: "2026-06-02T00:00:00.000Z",
    reviews: [review("Nisha Paul", 4, "Good before a dress", "Finer than the palm sugar. I use it on arms and collarbones.", 9)],
  }),
  make({
    id: "mineral-bath-salts",
    name: "Mineral Bath Salts",
    categoryId: "body-care",
    type: "Bath Salts",
    scent: "hinoki and mineral",
    shortDescription: "Sea salt and magnesium for a bath that feels clean, warm, and slightly wooded.",
    description:
      "A handful of Mineral Bath Salts turns an ordinary tub into the quiet part of the day. Hinoki keeps the scent dry and woody. The minerals do the softening. Stay in until the water cools a little, then go straight to the butter.",
    benefits: ["Softens bath water", "Eases the evening", "Woody, clean scent"],
    images: ["/silknknot/bath_salts1.jpg", "/silknknot/bath_salts2.webp"],
    variants: vols([
      { label: "400 g", price: 690, stock: 19 },
      { label: "800 g", price: 980, stock: 11 },
    ]),
    rating: 4.8,
    reviewCount: 64,
    bestseller: true,
    createdAt: "2026-02-14T00:00:00.000Z",
    reviews: [
      review("Asha Verghese", 5, "The whole flat smells like wood", "Not in a candle way — softer. I sleep earlier on salt nights.", 11),
    ],
  }),
  make({
    id: "atelier-milk-soap",
    name: "Atelier Milk Soap",
    categoryId: "bath-soap",
    type: "Luxury Soap",
    scent: "oat milk and honey",
    shortDescription: "A slow-poured bar with oat milk, a low honey scent, and a cream lather.",
    description:
      "Atelier Milk is the bar we give people who think soap has to be harsh to be clean. Oat milk keeps the lather creamy. The honey note is quiet. It is a proper bar — use it, dry it, and it will last.",
    benefits: ["Cream lather", "Gentle on skin", "Low, warm scent"],
    images: ["/silknknot/soap1.webp", "/silknknot/soap2.webp"],
    variants: vols([
      { label: "Single bar", price: 540, stock: 30 },
      { label: "Trio", price: 1480, stock: 12 },
    ]),
    rating: 4.9,
    reviewCount: 156,
    featured: true,
    bestseller: true,
    createdAt: "2025-09-18T00:00:00.000Z",
    reviews: [
      review("Farah Khan", 5, "The bar I repurchase", "It doesn’t crack or go slimy if you let it drain. Smells like a bakery that closed an hour ago.", 3),
      review("Joseph Mathew", 5, "Trio was a gift", "I kept one. That should tell you enough.", 16),
    ],
  }),
  make({
    id: "hinoki-luxury-soap",
    name: "Hinoki Luxury Soap",
    categoryId: "bath-soap",
    type: "Luxury Soap",
    scent: "hinoki wood",
    shortDescription: "A wood-scented luxury bar for people who want the bath to feel like a quiet room.",
    description:
      "Hinoki is the drier, cooler bar. The lather is still soft, but the scent is wood and steam rather than milk. It pairs with the mineral salts if you like a bath that smells like a still forest.",
    benefits: ["Woody scent", "Fine lather", "A calmer finish"],
    images: ["/silknknot/soapl1.jpg", "/silknknot/soap1.webp"],
    variants: vols([
      { label: "Single bar", price: 620, stock: 16 },
      { label: "Trio", price: 1680, stock: 6 },
    ]),
    rating: 4.6,
    reviewCount: 28,
    newArrival: true,
    createdAt: "2026-07-28T00:00:00.000Z",
    reviews: [review("Tara Bose", 5, "Wood, not cologne", "This is the bar I use when I don’t want to smell like a product.", 7)],
  }),
  make({
    id: "everyday-olive-soap",
    name: "Everyday Olive Soap",
    categoryId: "bath-soap",
    type: "Everyday Soap",
    scent: "green olive",
    shortDescription: "The daily bar. Simple olive, a clean rinse, and a price meant for the sink.",
    description:
      "Everyday Olive is the soap that should always be there. It is not a ceremony. It is a good bar with a green, bitter olive scent and a rinse that feels honest. Keep one at the basin and one in the bath.",
    benefits: ["Daily clean", "Simple formula", "Rinses easily"],
    images: ["/silknknot/soap2.webp", "/silknknot/soap1.webp"],
    variants: vols([
      { label: "Single bar", price: 320, stock: 40 },
      { label: "Trio", price: 860, stock: 18 },
    ]),
    rating: 4.5,
    reviewCount: 88,
    createdAt: "2025-08-01T00:00:00.000Z",
    reviews: [review("Imran Sheikh", 4, "Just a good soap", "No drama. That’s why it’s by the kitchen sink too.", 2)],
  }),
  make({
    id: "charcoal-calm-soap",
    name: "Charcoal Calm Soap",
    categoryId: "bath-soap",
    type: "Everyday Soap",
    scent: "charcoal and tea",
    shortDescription: "A charcoal bar with a tea note, for days that feel dusty or overlong.",
    description:
      "Charcoal Calm is the everyday bar for city days. The charcoal is there for the feel of a deeper clean, the tea keeps the scent soft, and the bar still behaves like soap rather than a treatment.",
    benefits: ["Fresher finish", "Tea scent", "Made for daily washing"],
    images: ["/silknknot/soap1.webp", "/silknknot/soapl1.jpg"],
    variants: vols([
      { label: "Single bar", price: 380, stock: 22 },
      { label: "Trio", price: 1020, stock: 10 },
    ]),
    rating: 4.4,
    reviewCount: 41,
    createdAt: "2026-03-09T00:00:00.000Z",
    reviews: [review("Priya Raman", 4, "After the train", "I use this when the day has been outside. It doesn’t dry me out.", 19)],
  }),
  make({
    id: "quiet-hour-candle",
    name: "Quiet Hour Candle",
    categoryId: "aromatherapy",
    type: "Scented Candle",
    scent: "cedar, smoke, and linen",
    shortDescription: "The studio candle. Cedar and a thread of smoke, in a vessel meant to be lit often.",
    description:
      "Quiet Hour is the scent of the studio after the lamps are the only light left. Cedar, a thin line of smoke, and linen that has been in the sun. Burn it while the butter is still on your hands. That is the whole ritual.",
    benefits: ["Calms the room", "Even, slow burn", "A scent that stays low"],
    images: ["/silknknot/candle1.jpg", "/silknknot/candle2.webp"],
    variants: vols([
      { label: "80 g", price: 640, stock: 14 },
      { label: "220 g", price: 1150, compare: 1350, stock: 20 },
    ]),
    rating: 4.9,
    reviewCount: 142,
    featured: true,
    bestseller: true,
    createdAt: "2025-10-10T00:00:00.000Z",
    reviews: [
      review("Maya Krishnan", 5, "The house smell now", "I light it after dinner. It doesn’t shout. Guests ask, and I don’t mind telling them.", 5),
      review("Elena Varghese", 5, "Worth the larger size", "The pool of wax is even. Smoke note is gentle, not a campfire.", 13),
    ],
  }),
  make({
    id: "linen-cedar-jar",
    name: "Linen & Cedar Jar",
    categoryId: "aromatherapy",
    type: "Jar Candle",
    scent: "linen and cedar",
    shortDescription: "A jar candle with the clean half of Quiet Hour — linen first, cedar underneath.",
    description:
      "Linen & Cedar is for rooms that should smell washed, not perfumed. It is the daylight version of our evening candle: less smoke, more cloth and wood. The jar is meant to be used up, not displayed.",
    benefits: ["Clean linen scent", "Reusable glass", "Steady flame"],
    images: ["/silknknot/candle3.webp", "/silknknot/candle4.jpg"],
    variants: vols([
      { label: "180 g", price: 860, stock: 13 },
      { label: "320 g", price: 980, stock: 15 },
    ]),
    rating: 4.7,
    reviewCount: 77,
    bestseller: true,
    createdAt: "2026-01-08T00:00:00.000Z",
    reviews: [review("Hannah George", 5, "Bedroom candle", "I was tired of sweet candles. This smells like a cupboard of good sheets.", 10)],
  }),
  make({
    id: "studio-tin-candle",
    name: "Studio Tin Candle",
    categoryId: "aromatherapy",
    type: "Travel Candle",
    scent: "bergamot peel",
    shortDescription: "A small tin of bergamot for desks, guest rooms, and weekends away.",
    description:
      "The Studio Tin is a short burn with a bright bergamot peel scent. Take it with you. The lid closes properly, and the tin cools quickly enough to pack the next morning.",
    benefits: ["Travel size", "Bright citrus", "Lid that actually closes"],
    images: ["/silknknot/candle2.webp", "/silknknot/candle3.webp"],
    variants: vols([{ label: "80 g", price: 640, stock: 26 }]),
    rating: 4.6,
    reviewCount: 39,
    newArrival: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    reviews: [review("Aditi Jain", 5, "Desk companion", "One hour at the end of work. The tin looks plain, which I like.", 1)],
  }),
  make({
    id: "fig-leaf-vessel",
    name: "Fig Leaf Vessel",
    categoryId: "aromatherapy",
    type: "Candle",
    scent: "fig leaf and amber",
    shortDescription: "A deeper candle — green fig leaf over a low amber — for long evenings.",
    description:
      "Fig Leaf Vessel is the richest scent in the collection, and still restrained. The first note is crushed leaf. Amber arrives later and stays near the table. Light it when the evening is going to be a long one.",
    benefits: ["Layered scent", "Longer burn", "Made for the table"],
    images: ["/silknknot/candle4.jpg", "/silknknot/candle1.jpg"],
    variants: vols([{ label: "280 g", price: 1420, stock: 10 }]),
    rating: 4.8,
    reviewCount: 52,
    featured: true,
    createdAt: "2026-04-19T00:00:00.000Z",
    reviews: [review("Noor Abdullah", 5, "Dinner, then quiet", "We light it when people arrive and it is still good after they leave.", 14)],
  }),
  make({
    id: "stonewashed-robe",
    name: "Stonewashed Robe",
    categoryId: "lifestyle",
    type: "Apparel",
    scent: "unscented washed linen",
    shortDescription: "A stonewashed linen robe for the walk from the bath to the rest of the evening.",
    description:
      "The Stonewashed Robe is cut simply and washed until the linen stops standing at attention. It is the piece you put on while the candle is being lit. Deep pockets. A tie that stays tied. Nothing else to negotiate.",
    benefits: ["Washed linen", "Easy after the bath", "Gets better with wear"],
    images: ["/silknknot/whipped_shop.jpg", "/silknknot/candle4.jpg"],
    variants: sizes(3400, 3900),
    rating: 4.8,
    reviewCount: 61,
    bestseller: true,
    createdAt: "2026-02-02T00:00:00.000Z",
    reviews: [review("Rhea Kapoor", 5, "Lives on the back of the door", "I wear it most nights. It doesn’t look precious, which is why I actually use it.", 17)],
  }),
  make({
    id: "ritual-wrap",
    name: "Ritual Wrap",
    categoryId: "lifestyle",
    type: "Apparel",
    scent: "unscented cotton",
    shortDescription: "A light cotton wrap for hair, shoulders, or the few minutes after washing.",
    description:
      "The Ritual Wrap is a length of washed cotton with a weight that stays put on the shoulders. Use it as a robe when the evening is warm, or as a wrap while oil is still settling into the ends of your hair.",
    benefits: ["Light cotton", "Works as a wrap or cover", "Washes without fuss"],
    images: ["/silknknot/candle4.jpg", "/silknknot/whipped_shop.jpg"],
    variants: sizes(1890).filter((size) => size.label !== "XL"),
    rating: 4.5,
    reviewCount: 24,
    createdAt: "2026-05-11T00:00:00.000Z",
    reviews: [review("Simran Kaur", 4, "Shoulder wrap", "Soft from the first wash. I wanted a smaller everyday layer and this is it.", 22)],
  }),
  make({
    id: "column-lounge-set",
    name: "Column Lounge Set",
    categoryId: "lifestyle",
    type: "Apparel",
    scent: "unscented linen",
    shortDescription: "A column top and trouser in washed linen, for evenings that stay at home.",
    description:
      "The Column Set is two pieces cut with almost no decoration: a straight top and a straight trouser. The linen is washed, the colour is the colour of undyed cloth, and the set is meant to be worn after a bath or for a long morning.",
    benefits: ["Two-piece set", "Undyed linen", "Room to move"],
    images: ["/silknknot/bath_salts2.webp", "/silknknot/candle2.webp"],
    variants: sizes(4200).filter((size) => ["XS", "S", "M", "L"].includes(size.label)),
    rating: 4.7,
    reviewCount: 19,
    newArrival: true,
    createdAt: "2026-09-15T00:00:00.000Z",
    reviews: [review("Amrita Sen", 5, "Sunday uniform", "I wore it the day it arrived. The trouser length is honest.", 2)],
  }),
  make({
    id: "everyday-linen-shirt",
    name: "Everyday Linen Shirt",
    categoryId: "lifestyle",
    type: "Apparel",
    scent: "unscented linen",
    shortDescription: "A plain linen shirt with a soft collar, for the hours between home and outside.",
    description:
      "Everyday Linen is the shirt that can leave the house. It is cut with a little air, the collar sits quietly, and the cloth wrinkles in the way linen should. Wear it open over the lounge trouser or buttoned on its own.",
    benefits: ["All-day linen", "Soft collar", "Layers easily"],
    images: ["/silknknot/candle2.webp", "/silknknot/bath_salts1.jpg"],
    variants: sizes(2450),
    rating: 4.6,
    reviewCount: 37,
    createdAt: "2026-03-22T00:00:00.000Z",
    reviews: [review("Vikram Iyer", 4, "Wrinkles correctly", "It looks worn-in after one wash. True to size for me in M.", 20)],
  }),
];

export const seedCoupons: Coupon[] = [
  {
    id: "ritual10",
    code: "RITUAL10",
    type: "percent",
    value: 10,
    scope: "order",
    active: true,
    label: "10% off the order",
  },
  {
    id: "quiet200",
    code: "QUIET200",
    type: "fixed",
    value: 200,
    scope: "category",
    categoryId: "aromatherapy",
    active: true,
    label: "₹200 off aromatherapy",
  },
  {
    id: "veil150",
    code: "VEIL150",
    type: "fixed",
    value: 150,
    scope: "product",
    productId: "silk-veil-body-butter",
    active: true,
    label: "₹150 off Silk Veil Body Butter",
  },
];

const byId = (id: string) => {
  const product = seedProducts.find((item) => item.id === id);
  if (!product) throw new Error(`Missing seed product ${id}`);
  return product;
};

function line(id: string, variantIndex: number, quantity: number) {
  const product = byId(id);
  const variant = product.variants[variantIndex];
  return {
    id: `${product.id}:${variant.label}`,
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0],
    categoryId: product.categoryId,
    variantLabel: variant.label,
    price: variant.price,
    compareAtPrice: variant.compareAtPrice,
    quantity,
  };
}

const miraAddress = {
  id: "addr-mira",
  label: "Home",
  name: "Mira Sen",
  line1: "14 Carmichael Road",
  line2: "Apartment 3",
  city: "Mumbai",
  postal: "400026",
  country: "India",
  phone: "9876543210",
  isDefault: true,
};

export const seedUsers: User[] = [
  {
    id: "user-mira",
    name: "Mira Sen",
    email: "mira@silkknot.com",
    password: "ritual123",
    phone: "9876543210",
    role: "customer",
    addresses: [miraAddress],
  },
  {
    id: "user-arun",
    name: "Arun Desai",
    email: "arun@silkknot.com",
    password: "ritual123",
    phone: "9820011122",
    role: "customer",
    addresses: [
      {
        id: "addr-arun",
        label: "Studio",
        name: "Arun Desai",
        line1: "48 Infantry Road",
        line2: "",
        city: "Bengaluru",
        postal: "560001",
        country: "India",
        phone: "9820011122",
        isDefault: true,
      },
    ],
  },
  {
    id: "user-admin",
    name: "Silken Knot Studio",
    email: "admin@silkknot.com",
    password: "studio123",
    phone: "02240001111",
    role: "admin",
    addresses: [],
  },
];

export const seedOrders: Order[] = [
  {
    id: "ord-1048",
    number: "SK1048",
    createdAt: "2026-09-18T08:30:00.000Z",
    status: "delivered",
    email: "mira@silkknot.com",
    customerName: "Mira Sen",
    phone: "9876543210",
    userId: "user-mira",
    address: miraAddress,
    delivery: "standard",
    payment: "upi",
    items: [line("silk-veil-body-butter", 1, 1), line("quiet-hour-candle", 1, 1)],
    subtotal: 2149,
    discount: 0,
    shipping: 0,
    total: 2149,
  },
  {
    id: "ord-1062",
    number: "SK1062",
    createdAt: "2026-10-02T14:10:00.000Z",
    status: "shipped",
    email: "mira@silkknot.com",
    customerName: "Mira Sen",
    phone: "9876543210",
    userId: "user-mira",
    address: miraAddress,
    delivery: "express",
    payment: "card",
    items: [line("atelier-milk-soap", 1, 1), line("palm-sugar-scrub", 0, 1)],
    subtotal: 2370,
    discount: 237,
    shipping: 149,
    total: 2282,
    couponCode: "RITUAL10",
  },
  {
    id: "ord-1066",
    number: "SK1066",
    createdAt: "2026-10-05T11:00:00.000Z",
    status: "packed",
    email: "arun@silkknot.com",
    customerName: "Arun Desai",
    phone: "9820011122",
    userId: "user-arun",
    address: seedUsers[1].addresses[0],
    delivery: "standard",
    payment: "cod",
    items: [line("linen-cedar-jar", 1, 1), line("everyday-linen-shirt", 2, 1)],
    subtotal: 3430,
    discount: 200,
    shipping: 0,
    total: 3230,
    couponCode: "QUIET200",
  },
  {
    id: "ord-1071",
    number: "SK1071",
    createdAt: "2026-10-06T16:40:00.000Z",
    status: "placed",
    email: "guest@example.com",
    customerName: "Neel Joshi",
    phone: "9810090909",
    address: {
      id: "addr-guest",
      label: "Home",
      name: "Neel Joshi",
      line1: "9 Aurangzeb Road",
      line2: "",
      city: "Delhi",
      postal: "110011",
      country: "India",
      phone: "9810090909",
      isDefault: true,
    },
    delivery: "standard",
    payment: "upi",
    items: [line("mineral-bath-salts", 0, 2)],
    subtotal: 1380,
    discount: 0,
    shipping: 0,
    total: 1380,
  },
];

export const journal: JournalEntry[] = [
  {
    slug: "the-order-of-a-bath",
    title: "The order of a bath",
    date: "2026-09-12",
    excerpt: "Cleanse, polish, nourish, then light something. The sequence matters more than the number of products.",
    image: photo("1544161515-4ab6ce6db874"),
    paragraphs: [
      "A ritual is only a routine you are willing to repeat. At Silken Knot that usually means four gestures, in the same order, even when the evening is short.",
      "Cleanse first, while the water is still honest. Exfoliate only a few nights a week — skin that is polished daily has nothing left to give. Nourish while you are still damp. Relax last, which is often just a candle and a robe and the decision not to start something else.",
      "You do not need every object at once. You need the order. The butter works better after the salt. The candle works better when your hands are already quiet.",
    ],
  },
  {
    slug: "how-we-think-about-scent",
    title: "How we think about scent",
    date: "2026-08-03",
    excerpt: "If a fragrance announces you from across a room, it is too loud for this house.",
    image: photo("1572726729207-a78d6feb18d7"),
    paragraphs: [
      "We build scents to stay near the skin or near the table. Sandalwood, hinoki, fig leaf, linen, a little smoke. Nothing that needs to be introduced.",
      "Candles are the exception that proves the rule: they may scent a room, but they should not scent the corridor. If you can smell Quiet Hour from the front door, the room is too small or the burn is too long.",
      "Bodies are similar. A butter should be discoverable by someone close to you, not by the person who shares your lift.",
    ],
  },
  {
    slug: "linen-after-water",
    title: "Linen after water",
    date: "2026-06-21",
    excerpt: "The clothes in the collection are not a separate idea. They are what you put on next.",
    image: photo("1620799140408-edc6dcb6d633"),
    paragraphs: [
      "We added apparel only when we could imagine it on a hook beside the bath. If a garment needed an occasion, it did not belong.",
      "Linen wrinkles. That is not a flaw we are interested in solving. The stonewashed robe, the column set, and the everyday shirt are washed before they reach you so the first wear is already the second personality of the cloth.",
      "Put them on while your skin is still soft from the butter. That is the styling advice.",
    ],
  },
];

export const sharedFaqs: Faq[] = [
  {
    question: "When do I get free shipping?",
    answer: `Orders of ₹999 and above have free standard delivery within India (when eligible at checkout). Any faster option, and its price, is shown for your PIN.`,
  },
  {
    question: "How long does delivery take?",
    answer: "You will see the delivery time for your PIN at checkout, including a faster option where it is available.",
  },
  {
    question: "Can I return a product?",
    answer: "All products are final sale for hygiene and safety reasons. You can cancel an order before it is dispatched by visiting your order page.",
  },
  {
    question: "Are the scents strong?",
    answer: "No. They are blended to stay close. Candles scent the room you are in, not the rest of the home.",
  },
  {
    question: "Do you ship outside India?",
    answer: "Not yet. The studio currently delivers within India.",
  },
];

export const ritualChapters = [
  {
    id: "cleanse",
    index: "01",
    title: "Cleanse",
    copy: "A quiet start. Lather, rinse, and let the day loosen its grip.",
    productId: "atelier-milk-soap",
  },
  {
    id: "exfoliate",
    index: "02",
    title: "Exfoliate",
    copy: "Polish the skin. Leave it soft, never stripped.",
    productId: "palm-sugar-scrub",
  },
  {
    id: "nourish",
    index: "03",
    title: "Nourish",
    copy: "Seal in comfort with a butter that melts on contact.",
    productId: "silk-veil-body-butter",
  },
  {
    id: "relax",
    index: "04",
    title: "Relax",
    copy: "Light the last note. The room exhales with you.",
    productId: "quiet-hour-candle",
  },
] as const;

export const ritualBuilderSteps = [
  {
    id: "cleanse",
    index: "01",
    title: "Cleanse",
    copy: "Choose the bar that starts the water.",
    productIds: ["atelier-milk-soap", "hinoki-luxury-soap", "everyday-olive-soap", "charcoal-calm-soap"],
  },
  {
    id: "exfoliate",
    index: "02",
    title: "Exfoliate",
    copy: "A polish for a few nights a week.",
    productIds: ["palm-sugar-scrub", "cane-sugar-polish"],
  },
  {
    id: "nourish",
    index: "03",
    title: "Nourish",
    copy: "Butter, while the skin is still warm.",
    productIds: ["silk-veil-body-butter", "night-milk-butter"],
  },
  {
    id: "relax",
    index: "04",
    title: "Relax",
    copy: "The scent you leave burning.",
    productIds: ["quiet-hour-candle", "linen-cedar-jar", "studio-tin-candle", "fig-leaf-vessel"],
  },
] as const;

export function getSeedProduct(slug: string) {
  return seedProducts.find((product) => product.slug === slug);
}
