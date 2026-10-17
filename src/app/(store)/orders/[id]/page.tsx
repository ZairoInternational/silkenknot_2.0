import { OrderDetails } from "@/components/checkout/OrderDetails";

export const metadata = { title: "Order details" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderDetails id={id} />;
}
