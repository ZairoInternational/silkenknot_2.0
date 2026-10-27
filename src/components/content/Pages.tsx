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
    <Editorial
      eyebrow="Help"
      title="Shipping"
      lede="We deliver across India. You’ll see the delivery charge and timing for your area before you pay."
    >
      <p>
        Delivery is free on eligible orders of ₹999 and above. If your order is below that—or you choose a faster option—the delivery charge for your area is shown at checkout before you confirm.
      </p>
      <p>
        When a faster option is available where you live, you can pick it at checkout. The expected arrival time for your area is shown there too.
      </p>
      <p>Candles and glass are packed carefully for the journey. We don’t ship outside India yet.</p>
      <p>
        After you order, follow progress in{" "}
        <Link href="/account/orders" className="underline underline-offset-4">
          your orders
        </Link>
        . If something arrives damaged or incomplete, see{" "}
        <Link href="/returns" className="underline underline-offset-4">
          Cancellation, returns & refunds
        </Link>
        .
      </p>
    </Editorial>
  );
}

export function PrivacyPage() {
  return (
    <Editorial
      eyebrow="Studio"
      title="Privacy"
      lede="What we ask for, why we ask for it, and how we look after it."
    >
      <p>
        When you sign in with a one-time code on email or WhatsApp, you open an account with us. We keep your name, email and/or mobile, saved addresses, bag and wishlist while you’re signed in, and your order history so we can deliver and help you later.
      </p>
      <p>
        Card and UPI details are entered in a secure payment window. We don’t keep your full card number, CVV, or UPI PIN. We only keep what’s needed to confirm your order and handle refunds if they apply.
      </p>
      <p>
        We use your details to send your order, share delivery updates, reply when you write to us, and keep your account safe. We don’t sell your personal information. The site uses cookies so you can stay signed in and complete checkout securely.
      </p>
      <p>
        Questions about your privacy? Write to us on{" "}
        <Link href="/contact" className="underline underline-offset-4">
          Contact & grievance
        </Link>
        .
      </p>
    </Editorial>
  );
}

export function TermsPage() {
  return (
    <Editorial eyebrow="Studio" title="Terms" lede="A simple agreement for shopping with Silken Knot.">
      <p>
        We describe products as honestly as we can. Colours on a screen may differ a little from what arrives. Sizes for clothing are listed on each piece. Ingredient and how-to notes are for everyday use—they’re not medical advice.
      </p>
      <p>
        When you place an order, you’re offering to buy. We accept when you see confirmation after a successful online payment, or when a cash-on-delivery order is confirmed. If we can’t send something you ordered, we’ll refund that item. For cancellations and refunds, read{" "}
        <Link href="/returns" className="underline underline-offset-4">
          Cancellation, returns & refunds
        </Link>
        . For how pricing and payment work, read{" "}
        <Link href="/payments" className="underline underline-offset-4">
          Payment & pricing
        </Link>
        .
      </p>
      <p>
        Online payment happens in a secure window after you place the order. We don’t store your full card number or CVV. Never share a PIN, password, or one-time code with anyone claiming to be our support team.
      </p>
      <p>
        By creating an account or placing an order you also agree to our{" "}
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/shipping" className="underline underline-offset-4">
          Shipping
        </Link>{" "}
        policy.
      </p>
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
