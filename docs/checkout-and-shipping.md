# Checkout, payment, and shipping

This store uses the existing Next.js App Router checkout. The browser collects an address, a shipping option, and a payment method. The server recalculates the payable total before Razorpay or cash on delivery.

## Sequence

1. The customer signs in.
2. Checkout loads the saved address and asks `/api/checkout/shipping-options` for the PIN.
3. The customer must select Standard, Free shipping, or Express before payment. Express appears only when `SHIPPING_EXPRESS_PAISE` is greater than 0.
4. Review shows the server total. Pay now or Place COD order calls `/api/checkout/create-order`.
5. Prepaid checkout creates a pending order, reserves stock, and creates a Razorpay order for that paise amount. The browser return is not proof of payment. `/api/checkout/verify` checks the signature and fetches the payment. `/api/checkout/webhook` accepts signed Razorpay events.
6. A captured prepaid order, or a confirmed COD order, enqueues a shipment task. Delhivery is called by `POST /api/checkout/reconcile`, not inside the payment request.
7. A Delhivery failure leaves the order and its payment state in place and marks the shipment `exception` or `unknown`.

## State model

Payment: `pending`, `authorized`, `captured`, `failed`, `cancelled`, `refund_pending`, `partially_refunded`, `refunded`.

Order: `pending_payment`, `confirmed`, `processing`, `cancelled`, `completed`, plus status values `shipped`, `delivered`. Customers may cancel before dispatch. After delivery, claims follow the Return, Refund and Replacement Policy (eligible issues + unboxing video); opened/used personal-care items are generally not returned except where law requires.

Shipment: `not_created`, `pending`, `booked`, `pickup_scheduled`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `delivery_failed`, `cancelled`, `rto_initiated`, `rto_in_transit`, `rto_delivered`, `return_initiated`, `returned`, `exception`, `unknown`.

A later tracking event cannot move a delivered shipment backward. COD collection stays `due` until it is reconciled outside this checkout. Delivery does not mark a COD order paid.

## Delhivery Express API

Documented host: `https://staging-express.delhivery.com` for staging and `https://track.delhivery.com` for production. Authentication is `Authorization: Token <DELHIVERY_API_TOKEN>`.

| Use | Method and path |
| --- | --- |
| PIN serviceability | `GET /c/api/pin-codes/json/?filter_codes=` |
| Shipment create, including reverse pickup (`payment_mode=Pickup`) | `POST /api/cmu/create.json` with `format=json&data=` |
| Tracking pull | `GET /api/v1/packages/json/?waybill=` |
| Cancellation | `POST /api/p/edit` with `{ waybill, cancellation: "true" }` |
| Pickup request | `POST /fm/request/new/` |

The PIN API does not return a freight quote. Checkout prices shipping from the invoice-charges estimate for the configured parcel weight, adds ₹10, and rounds to the nearest rupee. Express is offered when that estimate succeeds, and it is sent as Delhivery `shipping_mode=Express` only when that option was selected. A missing estimate does not fall back to a store rate. Confirm the account can create Express, COD, pickup, and reverse shipments before enabling them.

The tracking pull limit published by Delhivery is 750 requests per 5 minutes per IP. The reconcile job polls active waybills at most every 10 minutes. Delivered and cancelled shipments are not polled.

Push tracking is not authenticated by a published signature. `/api/delhivery/webhook` stays disabled until `DELHIVERY_WEBHOOK_TOKEN` is set. Ask Delhivery to send `Authorization: Token <that value>`. Payloads that do not match a stored waybill are stored and do not change an order.

## Account setup

- Create a staging API token.
- Register the pickup warehouse and set `DELHIVERY_PICKUP_LOCATION` to that name, including case.
- Set `DELHIVERY_ORIGIN_PIN` to that warehouse’s 6-digit PIN. Expected TAT uses it as the origin.
- Delhivery’s order-create notes require seller GST TIN and HSN. Set `DELHIVERY_SELLER_GST_TIN` and `DELHIVERY_HSN_CODE`, or leave booking manual.
- Parcel weight = sum of (variant weight if set, else product `weightGrams`, else `SHIPPING_DEFAULT_WEIGHT_GRAMS`) × quantity, plus `SHIPPING_PACKING_WEIGHT_GRAMS` once (default 40 g for outer packing). Set each size’s Weight (g) in Studio when a product has 250 g / 400 g options.
- Enable COD in both the store setting and the PIN response before the checkout shows it.

## Local testing

Do not use live Razorpay keys, live Delhivery tokens, or production refunds. `requestRefund` refuses to call Razorpay unless `NODE_ENV=production`.

For checkout without a courier token, set `DELHIVERY_ENABLED=0`. The API then returns store-managed rates and does not pretend the PIN was checked with Delhivery. With the flag unset and no token, shipping options return a configuration error.

To exercise tracking without a courier, set `DELHIVERY_MODE=mock` and restart the dev server. Production ignores this flag. A paid order is saved, then a test shipment is written with `shipment.test: true`, provider `mock`, and a waybill starting with `TEST`. Refresh tracking on the order page, or the admin fulfilment panel, adds one event per click: pickup confirmed, in transit, out for delivery, delivered. The customer page and admin panel label these as test records. Mock mode does not call Delhivery.

```bash
npm test
npx tsc --noEmit
npm run lint
```

Schedule `POST /api/checkout/reconcile` with header `x-silkknot-reconcile`. There is no in-app worker. That call releases expired reservations, retries Razorpay webhook events, books queued shipments, and refreshes tracking.

`GET /api/shipping/serviceability?pin=110001` checks a 6-digit PIN without creating a shipment. A live Delhivery call happens only when `DELHIVERY_LIVE_READS_ENABLED=1`, a server token is set, and the host is `track.delhivery.com` or `staging-express.delhivery.com`. When that PIN is serviceable and `DELHIVERY_ORIGIN_PIN` is the warehouse’s 6-digit PIN, the same request also asks Expected TAT for surface and express. The origin PIN comes from the server environment. Delhivery does not return it from the pickup location name. If the origin PIN is missing or TAT fails, the date stays the store estimate. The freight quote is a separate call used by checkout.

Live shipment creation, pickup, and cancellation stay off unless `NODE_ENV=production` and `DELHIVERY_LIVE_SHIPMENT_CREATION_ENABLED=1`. A request field cannot turn them on. Waybills that start with `TEST` are not sent to Delhivery. Expected TAT is a read and uses the warehouse PIN in `DELHIVERY_ORIGIN_PIN`. Checkout also reads the invoice-charges estimate and adds ₹10.

Indexes are created when the app opens Mongo: unique order id, Razorpay ids, shipping quote id, shipment task order id, waybill, and Delhivery event id.

## Production checklist

- Replica set so stock and the order update in one transaction.
- Live Razorpay key, key secret, and a separate webhook secret.
- Webhook URL `https://<domain>/api/checkout/webhook` for `payment.captured`, `payment.failed`, `order.paid`, `refund.processed`, and `refund.failed`.
- Staging test of one PIN, one manifest, one cancellation, and one tracking pull before switching `DELHIVERY_ENVIRONMENT=production`.
- Confirm pickup is enabled on the account. A 404 on pickup is reported as an account limitation.
- Keep API tokens in the server environment. Shipping settings in Studio store rates and the pickup name only.
