import { BrandLogo } from "@/components/ui";

export function ShippingPolicyPage() {
  return (
    <div className="bg-white text-black">
      <article className="page-pad mx-auto max-w-5xl space-y-5 px-5 pb-24 text-base leading-7 md:px-10 lg:max-w-6xl">
        <div className="flex justify-center pb-2">
          <BrandLogo placement="welcome" />
        </div>

        <h1 className="text-2xl font-bold uppercase tracking-wide md:text-3xl">
          Shipping & Delivery Policy
        </h1>
        <p>
          <strong>SILKEN KNOT</strong>
        </p>
        <p>
          <strong>Effective Date:</strong> 30 October 2026
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">1. Introduction</h2>
        <p>
          At Silken Knot, we believe that your experience should be special from the moment you place an order until it
          reaches your doorstep.
        </p>
        <p>
          We take care to prepare, package and dispatch every order securely to ensure that our Body Butters, Whipped
          Soaps, Sugar Scrubs, Bath Salts and handmade scented candles reach you in the best possible condition.
        </p>
        <p>
          This Shipping & Delivery Policy outlines our order processing procedures, shipping arrangements, estimated
          delivery timelines and responsibilities associated with the delivery of products purchased through our
          website.
        </p>
        <p>By placing an order with Silken Knot, you acknowledge and agree to the terms outlined in this policy.</p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">2. Order Processing and Dispatch</h2>
        <p>All orders are subject to payment confirmation and product availability.</p>
        <p>Once an order is successfully placed, our team will begin the processing and packaging procedure.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Orders are generally processed within 1–3 business days.</p>
          </li>
          <li>
            <p>Orders placed on Sundays or public holidays may be processed on the next working day.</p>
          </li>
          <li>
            <p>
              Processing time may vary during festive seasons, promotional campaigns or periods of high order volume.
            </p>
          </li>
          <li>
            <p>Handmade or specially prepared products may require additional preparation time.</p>
          </li>
          <li>
            <p>Customers will receive an order confirmation once their purchase is successfully registered.</p>
          </li>
          <li>
            <p>
              A shipping confirmation and tracking details will be shared once the order has been dispatched, wherever
              tracking is available.
            </p>
          </li>
        </ul>
        <p>Please note that order processing time is separate from the estimated shipping and delivery time.</p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">3. Estimated Delivery Timeline</h2>
        <p>Silken Knot aims to deliver orders within the estimated timeframes mentioned below:</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <tbody>
              <tr className="border-b border-black/20">
                <th className="py-2 pr-4 font-bold">Delivery Location</th>
                <th className="py-2 font-bold">Estimated Delivery Time</th>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-2 pr-4">Within the same city</td>
                <td className="py-2">2–4 business days</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-2 pr-4">Within the same state</td>
                <td className="py-2">3–6 business days</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="py-2 pr-4">Other locations in India</td>
                <td className="py-2">4–8 business days</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Remote and extended delivery areas</td>
                <td className="py-2">7–12 business days</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          These timelines are indicative and may vary depending on the customer&apos;s location, courier service
          availability, weather conditions, public holidays and other logistical circumstances.
        </p>
        <p>Actual delivery timelines may be longer in exceptional circumstances.</p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">4. Shipping Charges</h2>
        <p>
          Applicable shipping charges, if any, will be displayed during the checkout process before the order is
          confirmed.
        </p>
        <p>Shipping charges may depend on:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Delivery location and postal code.</p>
          </li>
          <li>
            <p>Total order weight and package dimensions.</p>
          </li>
          <li>
            <p>Courier service availability.</p>
          </li>
          <li>
            <p>Promotional offers or applicable shipping discounts.</p>
          </li>
        </ul>
        <p>
          Silken Knot may introduce free shipping offers or special delivery promotions from time to time. Such offers
          will be subject to their respective conditions.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">5. Order Tracking</h2>
        <p>
          Once an order has been dispatched, customers may receive a tracking number or tracking link through their
          registered email address, phone number or other available communication channels.
        </p>
        <p>Customers can use the provided tracking information to monitor their shipment status.</p>
        <p>
          Please note that tracking information may take some time to become active after dispatch, depending on the
          courier partner.
        </p>
        <p>For assistance with tracking or delivery updates, customers may contact our support team.</p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">6. Shipping Address and Customer Information</h2>
        <p>Customers are responsible for providing complete and accurate delivery information when placing an order.</p>
        <p>This includes:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Full name of the recipient.</p>
          </li>
          <li>
            <p>Complete residential or business address.</p>
          </li>
          <li>
            <p>Correct PIN code.</p>
          </li>
          <li>
            <p>Active contact number.</p>
          </li>
          <li>
            <p>Any additional delivery instructions, where necessary.</p>
          </li>
        </ul>
        <p>
          Silken Knot shall not be responsible for delivery failures or delays arising from incorrect, incomplete or
          inaccurate information provided by the customer, to the extent permitted by applicable law.
        </p>
        <p>
          If a customer identifies an error in the shipping address after placing an order, they must contact our
          support team immediately.
        </p>
        <p>Address modifications may not be possible once the order has been processed or dispatched.</p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">7. Delivery Attempts and Failed Deliveries</h2>
        <p>Our courier partners may make multiple delivery attempts depending on their operational policies.</p>
        <p>A delivery may be unsuccessful due to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Recipient being unavailable.</p>
          </li>
          <li>
            <p>Incorrect or incomplete delivery address.</p>
          </li>
          <li>
            <p>Incorrect or unreachable contact number.</p>
          </li>
          <li>
            <p>Refusal to accept the package.</p>
          </li>
          <li>
            <p>Restricted access to the delivery location.</p>
          </li>
          <li>
            <p>Other circumstances beyond the courier partner&apos;s control.</p>
          </li>
        </ul>
        <p>
          If a shipment is returned to Silken Knot because of an incorrect address, repeated unsuccessful delivery
          attempts or refusal to accept the package, customers may be required to bear applicable additional shipping
          charges for reshipment.
        </p>
        <p>Any such charges will be communicated to the customer before reshipment.</p>
        <p>
          Where the failure is attributable to Silken Knot or its delivery arrangements, an appropriate resolution will
          be provided.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">8. Damaged, Missing or Incorrect Deliveries</h2>
        <p>
          At Silken Knot, we take reasonable precautions to ensure that every package is securely packed before
          dispatch.
        </p>
        <p>
          However, if a customer receives a damaged, incomplete or incorrect order, they must notify our support team as
          soon as possible.
        </p>
        <p>
          <strong>Mandatory Unboxing Video Requirement</strong>
        </p>
        <p>
          To help verify delivery-related claims, customers are required to provide a clear, continuous and unedited
          video of the complete unboxing process.
        </p>
        <p>The video must:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Begin before opening the original shipping package.</p>
          </li>
          <li>
            <p>Clearly show the external packaging and shipping label.</p>
          </li>
          <li>
            <p>Capture the complete opening process without cuts, edits or interruptions.</p>
          </li>
          <li>
            <p>Clearly display the products received and any visible damage or missing items.</p>
          </li>
        </ul>
        <p>
          Claims relating to damaged, missing, incorrect or other delivery discrepancies will ordinarily be considered
          for approval only after submission and verification of valid unboxing evidence.
        </p>
        <p>
          Customers should also provide their order number and any additional photographs or information requested by
          our team.
        </p>
        <p>
          Each claim will be reviewed individually, and an appropriate resolution will be provided in accordance with
          our Return, Refund and Replacement Policy and applicable consumer protection laws.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">9. Delayed or Lost Shipments</h2>
        <p>While we make every effort to ensure timely delivery, certain circumstances may cause unexpected delays.</p>
        <p>These may include:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Courier service disruptions.</p>
          </li>
          <li>
            <p>Severe weather conditions.</p>
          </li>
          <li>
            <p>Public holidays or regional restrictions.</p>
          </li>
          <li>
            <p>Transportation or logistical interruptions.</p>
          </li>
          <li>
            <p>Incorrect shipment routing.</p>
          </li>
          <li>
            <p>Other unforeseen circumstances.</p>
          </li>
        </ul>
        <p>If your order has not arrived within the estimated delivery period, please contact our support team.</p>
        <p>
          We will coordinate with the relevant courier partner and make reasonable efforts to investigate the shipment
          status.
        </p>
        <p>
          If a shipment is confirmed as lost, Silken Knot will review the matter and provide an appropriate resolution
          in accordance with applicable laws and our policies.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">10. Shipping Restrictions and Serviceability</h2>
        <p>Delivery availability depends on courier partner serviceability and the delivery PIN code.</p>
        <p>
          Certain remote locations, restricted areas or locations without courier coverage may not be eligible for
          delivery.
        </p>
        <p>
          Silken Knot reserves the right to decline or cancel an order where delivery cannot reasonably be arranged,
          subject to providing an appropriate refund if payment has already been received.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">11. Product Packaging and Handling</h2>
        <p>
          We take care to package our products appropriately to minimise the possibility of damage during
          transportation.
        </p>
        <p>Special attention is given to our skincare, bath and body products and handmade scented candles.</p>
        <p>Customers are advised to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <p>Handle packages carefully after delivery.</p>
          </li>
          <li>
            <p>Store products according to the instructions provided.</p>
          </li>
          <li>
            <p>Avoid exposing products to excessive heat or direct sunlight.</p>
          </li>
          <li>
            <p>Check the package condition upon receipt.</p>
          </li>
          <li>
            <p>Report visible damage or discrepancies promptly.</p>
          </li>
        </ul>
        <p>
          Silken Knot shall not be responsible for product deterioration caused by improper storage or handling after
          successful delivery, subject to applicable law.
        </p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">12. Changes to Shipping Policy</h2>
        <p>
          Silken Knot reserves the right to revise, update or modify this Shipping & Delivery Policy whenever necessary
          to reflect changes in business operations, courier arrangements, delivery coverage or applicable legal
          requirements.
        </p>
        <p>Any updated version will be published on our website with the revised effective date.</p>
        <p>Customers are encouraged to review this policy periodically.</p>

        <h2 className="pt-2 text-xl font-bold md:text-2xl">13. Contact and Shipping Assistance</h2>
        <p>
          For questions relating to order processing, shipping, tracking, delayed deliveries or delivery-related
          concerns, customers may contact our support team through the following channels:
        </p>
        <p>
          <strong>Brand Name:</strong> Silken Knot
        </p>
        <p>
          <strong>Customer Support Email:</strong>{" "}
          <a href="mailto:care@silkenknot.com" target="_blank" rel="noreferrer">
            care@silkenknot.com
          </a>
        </p>
        <p>
          <strong>Business Address:</strong>117/N/70 3rd Floor Kakdeo Kanpur 208025
          <br />
          <strong>Website:</strong> [Insert Website URL]
        </p>

        <hr className="border-black/20" />

        <h2 className="pt-2 text-xl font-bold md:text-2xl">Our Commitment</h2>
        <p>
          Every Silken Knot order is prepared with care, attention and love. We want your experience to be just as
          delightful when your package arrives as it is when you first discover our products.
        </p>
        <p>Thank you for choosing Silken Knot and making us a part of your everyday self-care rituals.</p>
        <p>
          <strong>SILKEN KNOT</strong>
        </p>
        <p>
          <em>A Little Knot of Luxury.</em>
        </p>

        <div className="flex justify-center pt-4">
          <BrandLogo placement="welcome" />
        </div>
      </article>
    </div>
  );
}
