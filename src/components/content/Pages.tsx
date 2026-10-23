import Link from "next/link";
import { journal, sharedFaqs } from "@/lib/data";
import { photo } from "@/lib/format";
import { Media } from "@/components/ui";

export function Editorial({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="page-pad mx-auto max-w-3xl px-5 pb-24">
      <p className="eyebrow text-mute">{eyebrow}</p>
      <h1 className="mt-4 font-serif text-5xl leading-[0.95] md:text-6xl">{title}</h1>
      {lede ? <p className="mt-6 text-lg leading-8 text-mute">{lede}</p> : null}
      <div className="mt-10 space-y-5 leading-7 text-ink/80">{children}</div>
    </article>
  );
}

export function AboutPage() {
  return (
    <Editorial
      eyebrow="Our story"
      title="A studio for ordinary care."
      lede="Silken Knot makes body care, bath, aromatherapy, and the clothes you put on afterwards."
    >
      <p>
        The house started with a butter that did not feel like a project. It was something to use after a shower, on a Tuesday, without a mirror speech. The soaps, scrubs, salts, and candles followed because the order of a bath asked for them.
      </p>
      <p>
        We keep the palette quiet on purpose. The colour belongs to the product: cream, wood, linen, a little smoke. Formulas stay short. Scents stay close. Apparel is only here if it belongs on the hook beside the bath.
      </p>
      <p>
        Nothing in the collection is meant to be saved for a better day. The better day is the one you already have, slowed down by a few minutes.
      </p>
      <div className="relative mt-8 aspect-[4/5] bg-cream">
        <Media src={photo("1544161515-4ab6ce6db874")} alt="Still water and warm stone in a bathing room" sizes="(min-width: 768px) 720px, 100vw" />
      </div>
    </Editorial>
  );
}

export function IngredientsPage() {
  return (
    <Editorial eyebrow="Formulas" title="What goes into the jar." lede="Short lists. Recognisable materials. No theatre.">
      <p>Butters are built on shea and murumuru, softened with jojoba. Soaps are saponified olive, coconut, and shea, with glycerin left in the bar. Scrubs use sugar, not plastic beads. Salts are sea salt and magnesium. Candles are a coconut and soy wax with cotton wicks.</p>
      <p>Fragrance is an essential-oil blend, dosed to sit near the skin. If you are sensitive, begin with Everyday Olive Soap or the unscented linen pieces.</p>
      <p>Apparel is washed linen or cotton. The fibre is on the garment label, and the care is cold wash, hang dry.</p>
    </Editorial>
  );
}

export function ShippingPage() {
  return (
    <Editorial eyebrow="Help" title="Shipping" lede="We deliver within India.">
      <p>Delivery is free on orders of ₹999 and above. Below that, the delivery price for your PIN is shown at checkout.</p>
      <p>Where a faster option is available, you can choose it at checkout. The arrival time is shown there for your PIN.</p>
      <p>Candles and glass are packed to travel.</p>
    </Editorial>
  );
}

export function PrivacyPage() {
  return (
    <Editorial eyebrow="Studio" title="Privacy" lede="This preview keeps your account in your browser.">
      <p>Silken Knot's preview store keeps your bag on this device. An account, when you sign in, is stored for that login.</p>
      <p>Payment details are entered in a secure payment window. Silken Knot does not store your full card number, CVV, or UPI PIN. We keep the name, contact, address, and payment reference needed to deliver the order.</p>
      <p>That information is used to fulfil the order and send delivery updates. It is not sold.</p>
    </Editorial>
  );
}

export function TermsPage() {
  return (
    <Editorial eyebrow="Studio" title="Terms" lede="A calm agreement for a calm shop.">
      <p>Products are described as they are made. Colours on a screen are close, not identical. Apparel sizing is listed on each piece.</p>
      <p>An order is an offer to buy. We accept it when payment is verified and the confirmation appears. If we cannot fulfil a line, we refund that line.</p>
      <p>Payment is taken in a secure payment window after you place the order. Silken Knot does not store your full card number or CVV. Do not share a PIN, password, or one-time code with anyone claiming to be support.</p>
    </Editorial>
  );
}

export function FaqPage() {
  return (
    <Editorial eyebrow="Help" title="Questions" lede="The practical ones, answered without a script.">
      {sharedFaqs.map((faq) => (
        <section key={faq.question}>
          <h2 className="font-serif text-3xl text-ink">{faq.question}</h2>
          <p>{faq.answer}</p>
        </section>
      ))}
    </Editorial>
  );
}

export function JournalIndex() {
  return (
    <div className="page-pad px-5 pb-24 md:px-10">
      <p className="eyebrow text-mute">Journal</p>
      <h1 className="mt-3 font-serif text-6xl">Notes from the studio.</h1>
      <ul className="mt-12 grid gap-10 md:grid-cols-3">
        {journal.map((entry) => (
          <li key={entry.slug}>
            <Link href={`/journal/${entry.slug}`}>
              <span className="relative block aspect-[4/5] bg-cream">
                <Media src={entry.image} alt="" sizes="(min-width: 768px) 30vw, 100vw" />
              </span>
              <span className="mt-4 block font-serif text-3xl">{entry.title}</span>
              <span className="mt-2 block text-sm text-mute">{entry.excerpt}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function JournalArticle({ slug }: { slug: string }) {
  const entry = journal.find((item) => item.slug === slug);
  if (!entry) {
    return (
      <Editorial eyebrow="Journal" title="This note is gone.">
        <Link href="/journal">Back to the journal</Link>
      </Editorial>
    );
  }
  return (
    <Editorial eyebrow={entry.date} title={entry.title} lede={entry.excerpt}>
      <div className="relative mb-8 aspect-[16/10] bg-cream">
        <Media src={entry.image} alt="" sizes="(min-width: 768px) 720px, 100vw" />
      </div>
      {entry.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </Editorial>
  );
}
