export type CategoryId = "body-care" | "bath-soap" | "aromatherapy" | "lifestyle";

export type Variant = {
  id: string;
  label: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  date: string;
};

export type Faq = {
  question: string;
  answer: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  type: string;
  scent: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  shortDescription: string;
  description: string;
  benefits: string[];
  ingredients: string[];
  howToUse: string[];
  images: string[];
  variants: Variant[];
  featured: boolean;
  bestseller: boolean;
  newArrival: boolean;
  active: boolean;
  createdAt: string;
  reviews: Review[];
  faqs: Faq[];
};

export type Category = {
  id: string;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  order: number;
};

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  categoryId: string;
  variantLabel: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
};

export type Address = {
  id: string;
  label: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: "customer" | "admin";
  addresses: Address[];
};

export type DeliveryMethod = "standard" | "express";
export type PaymentMethod = "card" | "upi" | "cod";
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  email: string;
  customerName: string;
  phone: string;
  userId?: string;
  address: Address;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  scope: "order" | "product" | "category";
  productId?: string;
  categoryId?: string;
  active: boolean;
  label: string;
};

export type JournalEntry = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  paragraphs: string[];
};

export type Result = { ok: true; message?: string } | { ok: false; message: string };
