import Link from "next/link";
import { BrandLogo } from "@/components/ui";
import { sharedFaqs } from "@/lib/data";

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
    <div className="bg-white text-black">
      <article className="page-pad mx-auto max-w-5xl space-y-5 px-5 pb-24 text-base leading-7 md:px-10 lg:max-w-6xl">
        <h1 className="text-2xl font-bold uppercase tracking-wide md:text-3xl">Our Story – Silken Knot</h1>
        <h3 className="text-lg font-bold">A Little Knot of Luxury.</h3>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">Every Beautiful Journey Begins with a Little Passion.</h2>
        <p>
          Silken Knot was born out of something simple yet meaningful – a love for creating little moments of happiness
          through self-care.
        </p>
        <p>
          What started as making homemade bath and body products for our own use soon became something much bigger. We
          loved experimenting with textures, discovering beautiful fragrances, trying different ingredients and creating
          products that made our everyday self-care routines feel a little more special. It was never about building a
          business in the beginning. It was simply about creating something we genuinely enjoyed using ourselves.
        </p>
        <p>
          But something wonderful happened along the way. Friends, family and people around us started noticing our
          creations. They loved the textures, appreciated the fragrances and repeatedly asked us to make more for them.
          What began as a personal passion gradually became a shared experience, and those repeated requests gave us the
          confidence to take our little creations beyond our homes.
        </p>
        <p>That is how Silken Knot came to life.</p>
        <p>
          We decided to turn something we loved into something we could share with everyone – a brand built around
          thoughtful creations, beautiful fragrances and the simple joy of taking time for yourself.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">More Than Products, It&apos;s a Feeling.</h2>
        <p>
          At Silken Knot, we believe self-care should never feel like another task on your to-do list. It should be
          something you look forward to. A few peaceful minutes after a long day, a refreshing shower before starting
          your morning, a warm bath that helps you slow down or simply lighting your favourite candle and enjoying a
          quiet evening.
        </p>
        <p>These little moments matter.</p>
        <p>
          Our philosophy is simple: everyone deserves to feel relaxed, refreshed and cared for, even on the busiest
          days. We want to make those everyday experiences more enjoyable through products that appeal to your senses,
          feel wonderful to use and bring a little indulgence into your routine.
        </p>
        <p>
          From the moment you open a jar to the first touch of a creamy texture or the beautiful fragrance that fills
          your space, we want every Silken Knot experience to feel special.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">Thoughtfully Made, Lovingly Created.</h2>
        <p>
          We take pride in creating products through carefully considered processes, using thoughtfully selected
          ingredients and a natural approach to product making. We believe that looking after yourself should feel good,
          which is why we focus on creating products without harsh or harmful chemicals.
        </p>
        <p>Our collection is designed to bring together the little things that make self-care enjoyable.</p>

        <p>
          <strong>Body Butters – A Little Extra Love for Your Skin</strong>
        </p>
        <p>
          Rich, creamy and indulgent, our Body Butters are created to make your skincare routine feel like a treat.
          Their luxurious texture makes every application an enjoyable experience, leaving your skin feeling soft,
          nourished and cared for.
        </p>

        <p>
          <strong>Whipped Soaps – A Cloud of Everyday Happiness</strong>
        </p>
        <p>
          Who said cleansing has to be ordinary? Our Whipped Soaps bring a fun and delightful twist to everyday bathing.
          With their fluffy textures and lovely fragrances, they turn a simple shower into a little moment of
          indulgence.
        </p>

        <p>
          <strong>Sugar Scrubs – Scrub Away the Ordinary</strong>
        </p>
        <p>
          Sometimes, your skin deserves a little extra attention. Our Sugar Scrubs make exfoliation an enjoyable part of
          your routine, helping remove dead skin cells while leaving you with a refreshed and smoother-feeling skin
          experience.
        </p>

        <p>
          <strong>Bath Salts – Your Little Escape from the Everyday</strong>
        </p>
        <p>
          Not every escape requires a holiday. Sometimes, all you need is a warm bath, your favourite fragrance and a
          little time for yourself. Our Bath Salts are created to make your bathing moments feel more calming,
          refreshing and enjoyable.
        </p>

        <p>
          <strong>Handmade Scented Candles – Light It, Love It, Live It.</strong>
        </p>
        <p>
          Because relaxation isn&apos;t just about how you feel; it&apos;s also about the atmosphere around you. Our
          handmade scented candles come in a variety of delightful fragrances, bringing warmth, charm and beautiful
          aromas into your surroundings. Whether you&apos;re enjoying a relaxing bath, reading your favourite book or
          simply unwinding after a long day, a little candlelight can make the moment feel extraordinary.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">A Little Luxury in Every Little Detail.</h2>
        <p>
          We believe the magic of a product lies in the experience it creates. It is not just about what goes into a jar
          or how beautifully a candle is packaged. It is about how it makes you feel when you use it.
        </p>
        <p>
          That is why we pay attention to the little details – the textures, the fragrances, the overall experience and
          the care that goes into every creation.
        </p>
        <p>
          We want our products to feel like little gifts you give yourself. Something you reach for when you need a
          break, something that makes your everyday routine more exciting and something that reminds you to slow down
          and enjoy the present.
        </p>
        <p>
          Our approach is to keep things personal, thoughtful and full of love, just as they were when we first started
          making products at home.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">Growing Together, One Little Creation at a Time.</h2>
        <p>
          Silken Knot may have started with homemade creations and repeated requests, but our dream is much bigger. We
          want to build a brand that becomes a part of people&apos;s everyday self-care rituals – a name they associate
          with delightful fragrances, enjoyable textures, thoughtful creations and moments of pure relaxation.
        </p>
        <p>
          We know that the best brands are not built overnight. They grow through trust, genuine experiences and the
          people who believe in what they offer. Every person who chooses Silken Knot becomes a part of our journey, and
          every little piece of appreciation reminds us why we started.
        </p>
        <p>
          As we grow, we want to continue exploring new fragrances, creating exciting products and bringing more ways to
          make everyday self-care feel special.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">Our Promise to You.</h2>
        <p>
          We are here to remind you that taking care of yourself is never a luxury you have to earn. It is something you
          deserve every day.
        </p>
        <p>
          Whether it is a generous scoop of Body Butter, a fun and fluffy Whipped Soap, a refreshing Sugar Scrub, a
          soothing bath with our Bath Salts or the gentle glow of a beautifully scented candle, we hope every Silken
          Knot creation brings you closer to that feeling of complete relaxation and satisfaction.
        </p>
        <p>Because sometimes, happiness is found in the smallest rituals.</p>
        <p>A beautiful fragrance. A soft texture. A warm bath. A quiet evening. A little time just for yourself.</p>
        <p>
          <strong>Thank you for being a part of our journey.</strong>
        </p>
        <p>
          <strong>Welcome to Silken Knot – Where Every Little Ritual Feels Like Luxury.</strong>
        </p>
        <p>
          <em>Tie Yourself to the Art of Self-Care.</em>
        </p>
      </article>
    </div>
  );
}

export function IngredientsPage() {
  return (
    <Editorial eyebrow="Formulas" title="What goes into the jar." lede="Short lists. Recognisable materials. No theatre.">
      <p>Butters are built on shea and murumuru, softened with jojoba. Soaps are saponified olive, coconut, and shea, with glycerin left in the bar. Scrubs use sugar, not plastic beads. Salts are sea salt and magnesium. Candles are a coconut and soy wax with cotton wicks.</p>
      <p>Fragrance is an essential-oil blend, dosed to sit near the skin. If you are sensitive, begin with Everyday Olive Soap or a lightly scented formula.</p>
    </Editorial>
  );
}

export function TermsPage() {
  return (
    <div className="bg-white text-black">
      <div className="privacy-doc page-pad mx-auto w-full max-w-5xl px-5 pb-24 md:px-10">
        <h1>TERMS &amp; CONDITIONS</h1>
        <p>
          <BrandLogo placement="welcome" className="!mx-0" />
        </p>
        <p>
          <strong>Effective Date:</strong> 30 October 2026
        </p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to Silken Knot. These Terms &amp; Conditions govern your access to and use of our website, products,
          services and online shopping facilities.
        </p>
        <p>
          Silken Knot is a bath, body care and lifestyle brand specialising in thoughtfully crafted Body Butters, Whipped
          Soaps, Sugar Scrubs, Bath Salts and handmade scented candles.
        </p>
        <p>
          By accessing our website, browsing our products or placing an order, you acknowledge that you have read,
          understood and agreed to comply with these Terms &amp; Conditions.
        </p>
        <p>If you do not agree with any of these terms, please refrain from using our website or purchasing our products.</p>

        <h2>2. Products and Product Information</h2>
        <p>
          Silken Knot takes pride in offering carefully crafted products made using thoughtfully selected ingredients and
          considered production processes.
        </p>
        <p>Our product collection includes:</p>
        <ul>
          <li>
            <p>Body Butters</p>
          </li>
          <li>
            <p>Whipped Soaps</p>
          </li>
          <li>
            <p>Sugar Scrubs</p>
          </li>
          <li>
            <p>Bath Salts</p>
          </li>
          <li>
            <p>Handmade Scented Candles</p>
          </li>
          <li>
            <p>Other bath, body care and lifestyle products introduced from time to time.</p>
          </li>
        </ul>
        <p>
          We make reasonable efforts to ensure that all product descriptions, photographs, ingredient lists, quantities,
          pricing and other information displayed on our website are accurate and up to date.
        </p>
        <p>
          As several of our products are handmade, minor variations in colour, texture, consistency, appearance and
          fragrance may occur between individual batches. Such variations may be inherent to handcrafted production and
          do not automatically constitute a product defect.
        </p>

        <h2>3. Ingredient Awareness, Allergies and Personal Suitability</h2>
        <p>
          <strong>
            Customer safety and awareness are important to us. Every individual has different skin types, sensitivities
            and reactions to ingredients. Therefore, customers are strongly advised to review the complete ingredient
            list and product information before purchasing or using any Silken Knot product.
          </strong>
        </p>
        <p>By purchasing or using our products, customers acknowledge and agree to the following:</p>
        <ol>
          <li>
            <p>Read the complete ingredient list carefully before using any product.</p>
          </li>
          <li>
            <p>
              If you have a known allergy, sensitivity or intolerance to any ingredient, do not purchase or use a product
              containing that ingredient.
            </p>
          </li>
          <li>
            <p>Choose products according to your individual skin type, personal suitability and body&apos;s tolerance.</p>
          </li>
          <li>
            <p>Conduct a patch test on a small area of skin before using any new skincare or bath product.</p>
          </li>
          <li>
            <p>
              Do not assume that a product is suitable for everyone simply because its ingredients are naturally derived.
            </p>
          </li>
          <li>
            <p>
              Discontinue use immediately if you experience irritation, redness, itching, discomfort, swelling or any
              other unexpected reaction.
            </p>
          </li>
          <li>
            <p>Seek appropriate medical advice if an allergic reaction or persistent irritation occurs.</p>
          </li>
        </ol>
        <p>
          Natural ingredients can also cause allergic reactions in certain individuals. The use of naturally derived
          ingredients does not guarantee that a product will be allergy-free or suitable for every skin type.
        </p>
        <p>
          Silken Knot cannot guarantee individual compatibility with every product. Customers are responsible for
          reviewing the ingredient information and assessing personal suitability before use, subject to applicable
          consumer protection laws.
        </p>
        <p>
          <strong>Important:</strong> Our Body Butters, Whipped Soaps, Sugar Scrubs and Bath Salts are intended for their
          specified external-use purposes. They must not be consumed or ingested. Scented candles are intended for
          fragrance and ambience purposes only and are not edible products.
        </p>

        <h2>4. Product Usage and Storage Instructions</h2>
        <p>
          Customers must use all Silken Knot products according to their intended purpose and the instructions provided on
          the packaging or product description.
        </p>
        <p>We recommend the following precautions:</p>
        <ul>
          <li>
            <p>Store products in a cool, dry place unless otherwise instructed.</p>
          </li>
          <li>
            <p>Keep skincare and bath products away from direct sunlight and excessive heat.</p>
          </li>
          <li>
            <p>Use clean, dry hands or suitable applicators when handling products.</p>
          </li>
          <li>
            <p>
              Avoid introducing water or foreign substances into product containers unless the product instructions
              specifically permit it.
            </p>
          </li>
          <li>
            <p>Keep products properly sealed when not in use.</p>
          </li>
          <li>
            <p>Keep all products away from children and pets unless specifically designed for their use.</p>
          </li>
          <li>
            <p>Avoid contact with eyes, mouth and sensitive areas unless specifically intended for such use.</p>
          </li>
          <li>
            <p>Follow any product-specific storage, expiry and usage instructions.</p>
          </li>
        </ul>
        <p>
          Silken Knot shall not be responsible for product deterioration or damage resulting from improper storage,
          contamination, misuse or failure to follow the supplied instructions, to the extent permitted by applicable
          law.
        </p>

        <h2>5. Product Quality and Handmade Variations</h2>
        <p>
          Our products are created with care and attention to detail. However, handmade production may result in minor
          differences between batches.
        </p>
        <p>These differences may include:</p>
        <ul>
          <li>
            <p>Slight variations in colour or shade.</p>
          </li>
          <li>
            <p>Differences in texture or consistency.</p>
          </li>
          <li>
            <p>Minor variations in fragrance intensity.</p>
          </li>
          <li>
            <p>Natural changes in appearance due to ingredient characteristics.</p>
          </li>
        </ul>
        <p>Such variations are not necessarily indicators of poor quality or manufacturing defects.</p>
        <p>We remain committed to maintaining reasonable quality standards and addressing genuine product-related concerns.</p>

        <h2>6. Pricing and Payment Terms</h2>
        <p>All prices displayed on our website are in Indian Rupees (INR), unless otherwise specified.</p>
        <p>
          The applicable product price, taxes, shipping charges and any additional fees will be displayed during the
          checkout process, wherever applicable.
        </p>
        <p>
          Silken Knot reserves the right to revise product prices, promotional offers and discounts without prior notice.
          However, confirmed orders will generally be honoured at the price displayed at the time of purchase, subject to
          correction of genuine technical or pricing errors.
        </p>
        <p>Payments must be completed through the payment methods made available on our website.</p>
        <p>
          Customers are responsible for ensuring that their payment details are accurate and that sufficient funds are
          available to complete the transaction.
        </p>
        <p>
          An order will be considered successfully placed once the applicable payment and order confirmation process has
          been completed.
        </p>

        <h2>7. Order Confirmation and Cancellation</h2>
        <p>
          Upon successful placement of an order, customers will receive an order confirmation through the contact details
          provided during checkout.
        </p>
        <p>Customers wishing to cancel an order must contact our customer support team as soon as possible.</p>
        <p>Cancellation requests may be accepted before the order enters processing, packaging or dispatch.</p>
        <p>Once an order has been dispatched, cancellation may not be possible.</p>
        <p>Silken Knot reserves the right to cancel an order in circumstances involving:</p>
        <ul>
          <li>
            <p>Product unavailability.</p>
          </li>
          <li>
            <p>Incorrect or incomplete customer information.</p>
          </li>
          <li>
            <p>Suspected fraudulent or unauthorised transactions.</p>
          </li>
          <li>
            <p>Incorrect pricing or technical errors.</p>
          </li>
          <li>
            <p>Other legitimate operational or legal reasons.</p>
          </li>
        </ul>
        <p>
          Where payment has already been received for an order cancelled by Silken Knot, an appropriate refund will be
          initiated.
        </p>

        <h2>8. Handmade Candle Safety</h2>
        <p>
          Our scented candles are handcrafted to create a pleasant atmosphere and enhance your relaxation experience.
        </p>
        <p>For safe usage, customers must follow these precautions:</p>
        <ul>
          <li>
            <p>Never leave a burning candle unattended.</p>
          </li>
          <li>
            <p>Keep candles away from children, pets and flammable materials.</p>
          </li>
          <li>
            <p>Place candles on a stable, heat-resistant surface.</p>
          </li>
          <li>
            <p>Keep candles away from curtains, fans and direct airflow.</p>
          </li>
          <li>
            <p>Do not touch the container or melted wax while hot.</p>
          </li>
          <li>
            <p>Follow the burning and care instructions supplied with the candle.</p>
          </li>
          <li>
            <p>Stop using the candle when the remaining wax reaches the recommended safe level.</p>
          </li>
        </ul>
        <p>
          Customers are responsible for following candle safety instructions. Silken Knot shall not be liable for damage
          or injury resulting from improper usage, negligence or failure to follow safety instructions, to the extent
          permitted by applicable law.
        </p>

        <h2>9. Customer Responsibilities</h2>
        <p>By accessing our website or purchasing our products, customers agree to:</p>
        <ul>
          <li>
            <p>Provide accurate and complete personal and delivery information.</p>
          </li>
          <li>
            <p>Review product descriptions and ingredients before purchasing.</p>
          </li>
          <li>
            <p>Use products responsibly and according to their intended purpose.</p>
          </li>
          <li>
            <p>Follow all applicable usage, safety and storage instructions.</p>
          </li>
          <li>
            <p>Avoid fraudulent, unlawful or misleading activities.</p>
          </li>
          <li>
            <p>Not attempt unauthorised access to our website or systems.</p>
          </li>
          <li>
            <p>Respect the intellectual property and brand identity of Silken Knot.</p>
          </li>
        </ul>
        <p>
          Customers are responsible for making informed purchasing decisions based on their individual requirements and
          product suitability.
        </p>

        <h2>10. Intellectual Property Rights</h2>
        <p>
          All content displayed on the Silken Knot website and associated platforms is owned by or lawfully licensed to
          Silken Knot.
        </p>
        <p>This includes, but is not limited to:</p>
        <ul>
          <li>
            <p>Brand name, logo and visual identity.</p>
          </li>
          <li>
            <p>Product photographs and videos.</p>
          </li>
          <li>
            <p>Product descriptions and written content.</p>
          </li>
          <li>
            <p>Website design and layout.</p>
          </li>
          <li>
            <p>Graphics, illustrations and promotional materials.</p>
          </li>
          <li>
            <p>Marketing content, slogans and creative assets.</p>
          </li>
        </ul>
        <p>
          No individual or organisation may reproduce, distribute, modify, publish or commercially use our intellectual
          property without prior written permission.
        </p>
        <p>Unauthorised use may result in appropriate legal action under applicable intellectual property laws.</p>

        <h2>11. Privacy and Data Protection</h2>
        <p>Silken Knot respects customer privacy and is committed to handling personal information responsibly.</p>
        <p>Information collected during website visits, registrations, purchases and customer interactions may include:</p>
        <ul>
          <li>
            <p>Customer name and contact details.</p>
          </li>
          <li>
            <p>Email address and phone number.</p>
          </li>
          <li>
            <p>Billing and shipping information.</p>
          </li>
          <li>
            <p>Order and transaction details.</p>
          </li>
          <li>
            <p>Customer support communications.</p>
          </li>
        </ul>
        <p>
          Such information may be processed for order management, payment verification, shipping, customer support,
          service improvement and other legitimate purposes.
        </p>
        <p>
          Certain information may be shared with authorised payment processors, logistics partners and service providers
          where necessary to fulfil customer orders or provide services.
        </p>
        <p>
          Customer information will be handled in accordance with our Privacy Policy and applicable data protection laws.
        </p>
        <p>
          For further details, customers are advised to review our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>12. Promotions, Discounts and Special Offers</h2>
        <p>
          Silken Knot may introduce promotional campaigns, discount codes, seasonal offers, special collections and other
          marketing initiatives.
        </p>
        <p>All offers are subject to their respective terms and conditions.</p>
        <p>
          We reserve the right to modify, suspend or discontinue promotional campaigns, subject to applicable law and any
          commitments already made to customers.
        </p>
        <p>
          Unless specifically stated otherwise, promotional offers cannot be exchanged for cash or combined with other
          discounts.
        </p>

        <h2>13. Website Availability and Modifications</h2>
        <p>We make reasonable efforts to maintain the availability and proper functioning of our website.</p>
        <p>
          However, temporary interruptions may occur due to maintenance, technical issues, software updates, hosting
          problems or other circumstances beyond our reasonable control.
        </p>
        <p>
          Silken Knot reserves the right to modify, update, suspend or discontinue website features, services or content
          whenever necessary.
        </p>

        <h2>14. Limitation of Liability</h2>
        <p>
          Silken Knot makes reasonable efforts to maintain product quality, provide accurate product information and offer
          satisfactory customer service.
        </p>
        <p>
          To the extent permitted by applicable law, Silken Knot shall not be responsible for losses or damages arising
          from:
        </p>
        <ul>
          <li>
            <p>Failure to follow product usage instructions.</p>
          </li>
          <li>
            <p>Improper storage, handling or contamination of products.</p>
          </li>
          <li>
            <p>Use of products contrary to their intended purpose.</p>
          </li>
          <li>
            <p>Failure to review ingredient information or known allergies.</p>
          </li>
          <li>
            <p>Delays caused by third-party delivery or payment providers.</p>
          </li>
          <li>
            <p>Temporary website interruptions or technical failures.</p>
          </li>
        </ul>
        <p>
          Nothing in these Terms &amp; Conditions shall exclude or restrict liability that cannot legally be excluded or
          restricted under applicable Indian law, including statutory consumer rights.
        </p>

        <h2>15. Amendments to Terms &amp; Conditions</h2>
        <p>
          Silken Knot reserves the right to revise or update these Terms &amp; Conditions from time to time to reflect
          changes in business operations, product offerings, website practices or applicable legal requirements.
        </p>
        <p>The updated version will be published on our website along with the revised effective date.</p>
        <p>Customers are encouraged to review this section periodically.</p>

        <h2>16. Governing Law and Jurisdiction</h2>
        <p>These Terms &amp; Conditions shall be governed by and interpreted in accordance with the laws of India.</p>
        <p>
          Any disputes arising in connection with these terms shall be subject to the jurisdiction of the competent courts
          at <strong>Kanpur, Uttar Pradesh, India</strong>, subject to applicable consumer protection laws and other
          mandatory legal provisions.
        </p>

        <h2>17. Contact and Customer Support</h2>
        <p>
          For questions, product-related concerns, order assistance or clarification regarding these Terms &amp;
          Conditions, customers may contact Silken Knot through the official communication channels listed below.
        </p>
        <p>
          <strong>Brand Name:</strong> Silken Knot
        </p>
        <p>
          <strong>Official Email:</strong> <a href="mailto:care@silkenknot.com">care@silkenknot.com</a>
        </p>
        <p>
          <strong>Customer Support Number:</strong> <a href="tel:+919598023492">(+91) 95980 23492</a>
        </p>
        <p>
          <strong>Registered Business Address:</strong> 117/N/70 3rd Floor, Kakadeo, Kanpur, India
        </p>
        <p>
          <strong>Website:</strong>{" "}
          <a href="https://www.silkenknot.com" target="_blank" rel="noreferrer">
            https://www.silkenknot.com
          </a>
        </p>

        <div>
          <hr />
        </div>

        <h2>A Final Note from Silken Knot</h2>
        <p>We want every experience with Silken Knot to be enjoyable, thoughtful and satisfying.</p>
        <p>
          We encourage our customers to make informed choices, understand their individual skin requirements and use every
          product responsibly.
        </p>
        <p>Thank you for choosing Silken Knot and allowing us to be a part of your everyday self-care rituals.</p>
        <p>
          <BrandLogo placement="welcome" className="!mx-0" />
        </p>
        <p>
          <em>A Little Knot of Luxury.</em>
        </p>
      </div>
    </div>
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
