"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { seedCategories, seedCoupons, seedProducts } from "@/lib/data";
import { couponDiscount, repairImageUrl, slugify, subtotal, withDerivedPrice } from "@/lib/format";
import type {
  Address,
  CartItem,
  Category,
  Coupon,
  Order,
  OrderStatus,
  Product,
  Result,
  Review,
  User,
} from "@/lib/types";

const BAG_KEY = "silkknot.bag.v1";

type ApiResult = {
  ok: boolean;
  message?: string;
  user?: User;
  order?: Order;
  orders?: Order[];
  products?: Product[];
  customers?: User[];
  admin?: boolean;
};

async function post(action: string, payload: Record<string, unknown> = {}) {
  const response = await fetch("/api/store", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  return (await response.json()) as ApiResult;
}

type Database = {
  version: 1;
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  orders: Order[];
  users: User[];
  sessionUserId: string | null;
  adminAuthed: boolean;
  cart: CartItem[];
  wishlist: string[];
  couponCode: string | null;
  extraReviews: Record<string, Review[]>;
  recentSearches: string[];
};

type Toast = { id: number; message: string } | null;

type StoreValue = {
  ready: boolean;
  products: Product[];
  categories: Category[];
  coupons: Coupon[];
  orders: Order[];
  users: User[];
  currentUser: User | null;
  adminAuthed: boolean;
  cart: CartItem[];
  wishlist: string[];
  couponCode: string | null;
  recentSearches: string[];
  cartOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  toast: Toast;
  activeProducts: Product[];
  openCart: () => void;
  closeCart: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  closeOverlays: () => void;
  notify: (message: string) => void;
  addToCart: (productId: string, variantLabel: string, quantity?: number) => Result;
  setQuantity: (lineId: string, quantity: number) => void;
  removeFromCart: (lineId: string) => void;
  moveToWishlist: (lineId: string) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => Result;
  clearCoupon: () => void;
  toggleWishlist: (productId: string) => Result;
  isWished: (productId: string) => boolean;
  register: (input: { name: string; email: string; password: string }) => Promise<Result>;
  login: (email: string, password: string) => Promise<Result>;
  logout: () => Promise<void>;
  updateProfile: (input: { name: string; phone: string }) => Promise<Result>;
  findAccount: (email: string) => Promise<Result>;
  resetPassword: (email: string, password: string) => Promise<Result>;
  saveAddress: (address: Address) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  loginAdmin: (email: string, password: string) => Promise<Result>;
  logoutAdmin: () => Promise<void>;
  placeOrder: (order: Omit<Order, "id" | "number" | "createdAt" | "status">) => Promise<Result & { order?: Order }>;
  saveProduct: (product: Product, isNew: boolean) => Promise<Result>;
  deleteProduct: (id: string) => Promise<Result>;
  saveCategory: (category: Category, isNew: boolean) => Promise<Result>;
  deleteCategory: (id: string) => Promise<Result>;
  moveCategory: (id: string, direction: -1 | 1) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  saveCoupon: (coupon: Coupon, isNew: boolean) => Promise<Result>;
  deleteCoupon: (id: string) => Promise<void>;
  addReview: (productId: string, review: Omit<Review, "id" | "date">) => Promise<void>;
  rememberSearch: (term: string) => void;
  productBySlug: (slug: string) => Product | undefined;
  productById: (id: string) => Product | undefined;
  reviewsFor: (productId: string) => Review[];
};

const StoreContext = createContext<StoreValue | null>(null);

function initialDatabase(): Database {
  return {
    version: 1,
    products: seedProducts,
    categories: seedCategories,
    coupons: seedCoupons,
    orders: [],
    users: [],
    sessionUserId: null,
    adminAuthed: false,
    cart: [],
    wishlist: [],
    couponCode: null,
    extraReviews: {},
    recentSearches: [],
  };
}

type Action =
  | { type: "hydrate"; db: Database }
  | { type: "patch"; patch: Partial<Database> }
  | { type: "set"; db: Database };

function reducer(state: Database, action: Action): Database {
  if (action.type === "hydrate" || action.type === "set") return action.db;
  return { ...state, ...action.patch };
}

function repairDatabase(db: Database): Database {
  return {
    ...db,
    products: db.products.map((product) => {
      const seed = seedProducts.find((item) => item.id === product.id);
      const stale = product.images.some((src) => src.includes("unsplash.com"));
      const images = seed && stale ? seed.images : product.images;
      return { ...product, images: images.map(repairImageUrl) };
    }),
    categories: db.categories.map((category) => {
      const seed = seedCategories.find((item) => item.id === category.id);
      const stale = !category.imageAlt || category.image.includes("unsplash.com");
      const next = seed && stale ? { ...category, image: seed.image, imageAlt: seed.imageAlt } : category;
      return {
        ...next,
        image: repairImageUrl(next.image),
        imageAlt: repairImageUrl(next.imageAlt || next.image),
      };
    }),
    cart: db.cart.map((item) => ({ ...item, image: repairImageUrl(item.image) })),
    orders: db.orders.map((order) => ({
      ...order,
      items: order.items.map((item) => ({ ...item, image: repairImageUrl(item.image) })),
    })),
  };
}

function variantOf(product: Product, label: string) {
  return product.variants.find((variant) => variant.label === label) ?? product.variants[0];
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, dispatch] = useReducer(reducer, undefined, initialDatabase);
  const [ready, setReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const dbRef = useRef(db);

  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  useEffect(() => {
    let bag: Partial<Database> = {};
    try {
      const saved = JSON.parse(localStorage.getItem(BAG_KEY) || "null") as Partial<Database> | null;
      if (saved) bag = saved;
    } catch {
      localStorage.removeItem(BAG_KEY);
    }
    let cancelled = false;
    fetch("/api/store")
      .then((response) => response.json())
      .then((data: ApiResult & { products?: Product[]; categories?: Category[]; coupons?: Coupon[]; orders?: Order[]; user?: User | null; customers?: User[]; admin?: boolean }) => {
        if (cancelled) return;
        const base = initialDatabase();
        dispatch({
          type: "hydrate",
          db: repairDatabase({
            ...base,
            products: data.products?.length ? data.products : base.products,
            categories: data.categories?.length ? data.categories : base.categories,
            coupons: data.coupons?.length ? data.coupons : base.coupons,
            orders: data.orders ?? [],
            users: data.user
              ? [{ ...data.user, password: "" }, ...(data.customers ?? []).map((customer) => ({ ...customer, password: "" }))]
              : [],
            sessionUserId: data.user?.id ?? null,
            adminAuthed: Boolean(data.admin),
            cart: bag.cart ?? [],
            wishlist: bag.wishlist ?? [],
            couponCode: bag.couponCode ?? null,
            recentSearches: bag.recentSearches ?? [],
          }),
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(
      BAG_KEY,
      JSON.stringify({
        cart: db.cart,
        wishlist: db.wishlist,
        couponCode: db.couponCode,
        recentSearches: db.recentSearches,
      }),
    );
  }, [db.cart, db.wishlist, db.couponCode, db.recentSearches, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  const patch = useCallback((next: Partial<Database>) => {
    dispatch({ type: "patch", patch: next });
  }, []);

  const closeOverlays = useCallback(() => {
    setCartOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, []);

  const addToCart = useCallback((productId: string, variantLabel: string, quantity = 1): Result => {
    const current = dbRef.current;
    const product = current.products.find((item) => item.id === productId && item.active);
    if (!product) return { ok: false, message: "This piece is unavailable." };
    const variant = variantOf(product, variantLabel);
    if (!variant) return { ok: false, message: "Choose a size." };
    const lineId = `${product.id}:${variant.label}`;
    const existing = current.cart.find((item) => item.id === lineId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (variant.stock < 1 || nextQuantity > variant.stock) {
      return { ok: false, message: "Only a few remain." };
    }
    const line: CartItem = {
      id: lineId,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0],
      categoryId: product.categoryId,
      variantLabel: variant.label,
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity: nextQuantity,
    };
    patch({
      cart: existing
        ? current.cart.map((item) => (item.id === lineId ? line : item))
        : [...current.cart, line],
    });
    return { ok: true, message: "Added to bag" };
  }, [patch]);

  const setQuantity = useCallback((lineId: string, quantity: number) => {
    const current = dbRef.current;
    const line = current.cart.find((item) => item.id === lineId);
    if (!line) return;
    if (quantity < 1) {
      patch({ cart: current.cart.filter((item) => item.id !== lineId) });
      return;
    }
    const product = current.products.find((item) => item.id === line.productId);
    const variant = product ? variantOf(product, line.variantLabel) : undefined;
    const cap = variant && variant.stock > 0 ? variant.stock : 99;
    patch({
      cart: current.cart.map((item) =>
        item.id === lineId ? { ...item, quantity: Math.min(quantity, cap) } : item,
      ),
    });
  }, [patch]);

  const removeFromCart = useCallback((lineId: string) => {
    patch({ cart: dbRef.current.cart.filter((item) => item.id !== lineId) });
  }, [patch]);

  const toggleWishlist = useCallback((productId: string): Result => {
    const current = dbRef.current;
    const exists = current.wishlist.includes(productId);
    patch({
      wishlist: exists
        ? current.wishlist.filter((id) => id !== productId)
        : [...current.wishlist, productId],
    });
    return { ok: true, message: exists ? "Removed from wishlist" : "Saved to wishlist" };
  }, [patch]);

  const moveToWishlist = useCallback((lineId: string) => {
    const current = dbRef.current;
    const line = current.cart.find((item) => item.id === lineId);
    if (!line) return;
    patch({
      cart: current.cart.filter((item) => item.id !== lineId),
      wishlist: current.wishlist.includes(line.productId)
        ? current.wishlist
        : [...current.wishlist, line.productId],
    });
    notify("Saved to wishlist");
  }, [notify, patch]);

  const applyCoupon = useCallback((code: string): Result => {
    const current = dbRef.current;
    const coupon = current.coupons.find(
      (item) => item.active && item.code.toLowerCase() === code.trim().toLowerCase(),
    );
    if (!coupon) return { ok: false, message: "That offer isn’t active." };
    if (couponDiscount(current.cart, coupon) <= 0) {
      return { ok: false, message: "This offer doesn’t apply to your bag." };
    }
    patch({ couponCode: coupon.code });
    return { ok: true, message: coupon.label };
  }, [patch]);

  const signedIn = useCallback((data: ApiResult, admin = false) => {
    if (!data.user) return;
    const self = { ...data.user, password: "" };
    const rest = data.customers
      ? data.customers.filter((customer) => customer.id !== self.id).map((customer) => ({ ...customer, password: "" }))
      : dbRef.current.users.filter((customer) => customer.id !== self.id);
    patch({
      users: [self, ...rest],
      sessionUserId: self.id,
      orders: data.orders ?? dbRef.current.orders,
      adminAuthed: admin || Boolean(data.admin),
    });
  }, [patch]);

  const register = useCallback(async (input: { name: string; email: string; password: string }): Promise<Result> => {
    const data = await post("register", input);
    if (!data.ok || !data.user) return { ok: false, message: data.message || "Could not create the account." };
    signedIn(data);
    return { ok: true, message: data.message };
  }, [signedIn]);

  const login = useCallback(async (email: string, password: string): Promise<Result> => {
    const data = await post("login", { email, password });
    if (!data.ok || !data.user) return { ok: false, message: data.message || "Email or password is incorrect." };
    signedIn(data);
    return { ok: true };
  }, [signedIn]);

  const findAccount = useCallback(async (email: string): Promise<Result> => {
    const data = await post("lookup", { email });
    if (!data.ok) return { ok: false, message: data.message || "We couldn’t find that account." };
    return { ok: true };
  }, []);

  const resetPassword = useCallback(async (email: string, password: string): Promise<Result> => {
    const data = await post("reset-password", { email, password });
    if (!data.ok) return { ok: false, message: data.message || "Could not update the password." };
    return { ok: true, message: data.message };
  }, []);

  const updateProfile = useCallback(async (input: { name: string; phone: string }): Promise<Result> => {
    const data = await post("profile", input);
    if (!data.ok || !data.user) return { ok: false, message: data.message || "Could not save your profile." };
    signedIn(data);
    return { ok: true, message: data.message || "Profile saved." };
  }, [signedIn]);

  const saveAddress = useCallback(async (address: Address) => {
    const data = await post("save-address", { address });
    if (data.ok && data.user) signedIn(data);
  }, [signedIn]);

  const deleteAddress = useCallback(async (id: string) => {
    const data = await post("delete-address", { id });
    if (data.ok && data.user) signedIn(data);
  }, [signedIn]);

  const loginAdmin = useCallback(async (email: string, password: string): Promise<Result> => {
    const data = await post("admin-login", { email, password });
    if (!data.ok || !data.user) return { ok: false, message: data.message || "Those studio details are not recognised." };
    signedIn(data, true);
    return { ok: true };
  }, [signedIn]);

  const logout = useCallback(async () => {
    await post("logout");
    patch({ sessionUserId: null, users: [], adminAuthed: false, orders: [] });
  }, [patch]);

  const logoutAdmin = useCallback(async () => {
    await post("admin-logout");
    patch({ sessionUserId: null, users: [], adminAuthed: false, orders: [] });
  }, [patch]);

  const placeOrder = useCallback(
    async (draft: Omit<Order, "id" | "number" | "createdAt" | "status">): Promise<Result & { order?: Order }> => {
      if (!draft.items.length) return { ok: false, message: "Your bag is empty." };
      const data = await post("place-order", { order: draft });
      if (!data.ok || !data.order) return { ok: false, message: data.message || "We couldn’t place that order." };
      patch({
        orders: [data.order, ...dbRef.current.orders],
        products: data.products ?? dbRef.current.products,
        cart: [],
        couponCode: null,
      });
      return { ok: true, order: data.order };
    },
    [patch],
  );

  const saveProduct = useCallback(async (product: Product, isNew: boolean): Promise<Result> => {
    const current = dbRef.current;
    const next = withDerivedPrice({
      ...product,
      slug: product.slug || slugify(product.name),
      id: product.id || `p-${Date.now()}`,
    });
    if (!next.name.trim()) return { ok: false, message: "Add a product name." };
    if (!next.images.length) return { ok: false, message: "Add at least one image." };
    if (!next.variants.length || next.variants.some((variant) => !variant.label || variant.price <= 0)) {
      return { ok: false, message: "Each option needs a label and a price." };
    }
    const slugTaken = current.products.some((item) => item.slug === next.slug && item.id !== next.id);
    if (slugTaken) next.slug = `${next.slug}-${next.id.slice(-4)}`;
    const data = await post("save-product", { product: next, isNew });
    if (!data.ok) return { ok: false, message: data.message || "Could not save the product." };
    patch({
      products: isNew
        ? [next, ...current.products]
        : current.products.map((item) => (item.id === next.id ? next : item)),
    });
    return { ok: true, message: data.message };
  }, [patch]);

  const deleteProduct = useCallback(async (id: string): Promise<Result> => {
    const data = await post("delete-product", { id });
    if (!data.ok) return { ok: false, message: data.message || "Could not delete the product." };
    patch({
      products: dbRef.current.products.filter((product) => product.id !== id),
      wishlist: dbRef.current.wishlist.filter((productId) => productId !== id),
    });
    return { ok: true, message: data.message };
  }, [patch]);

  const saveCategory = useCallback(async (category: Category, isNew: boolean): Promise<Result> => {
    const current = dbRef.current;
    if (!category.name.trim()) return { ok: false, message: "Name the category." };
    if (isNew && current.categories.some((item) => item.id === category.id)) {
      return { ok: false, message: "That category already exists." };
    }
    const data = await post("save-category", { category, isNew });
    if (!data.ok) return { ok: false, message: data.message || "Could not save the category." };
    patch({
      categories: isNew
        ? [...current.categories, category]
        : current.categories.map((item) => (item.id === category.id ? category : item)),
    });
    return { ok: true, message: data.message };
  }, [patch]);

  const deleteCategory = useCallback(async (id: string): Promise<Result> => {
    const data = await post("delete-category", { id });
    if (!data.ok) return { ok: false, message: data.message || "Could not delete the category." };
    patch({ categories: dbRef.current.categories.filter((category) => category.id !== id) });
    return { ok: true, message: data.message };
  }, [patch]);

  const moveCategory = useCallback(async (id: string, direction: -1 | 1) => {
    const categories = [...dbRef.current.categories].sort((a, b) => a.order - b.order);
    const index = categories.findIndex((category) => category.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categories.length) return;
    const next = categories[target];
    const current = categories[index];
    categories[index] = { ...next, order: current.order };
    categories[target] = { ...current, order: next.order };
    patch({ categories });
    await post("move-category", { categories });
  }, [patch]);

  const saveCoupon = useCallback(async (coupon: Coupon, isNew: boolean): Promise<Result> => {
    const current = dbRef.current;
    const code = coupon.code.trim().toUpperCase();
    if (!code) return { ok: false, message: "Add a code." };
    if (current.coupons.some((item) => item.code === code && item.id !== coupon.id)) {
      return { ok: false, message: "That code already exists." };
    }
    const next = { ...coupon, code };
    const data = await post("save-coupon", { coupon: next, isNew });
    if (!data.ok) return { ok: false, message: data.message || "Could not save the offer." };
    patch({
      coupons: isNew ? [...current.coupons, next] : current.coupons.map((item) => (item.id === next.id ? next : item)),
    });
    return { ok: true, message: data.message };
  }, [patch]);

  const deleteCoupon = useCallback(async (id: string) => {
    const data = await post("delete-coupon", { id });
    if (!data.ok) return;
    patch({ coupons: dbRef.current.coupons.filter((coupon) => coupon.id !== id) });
  }, [patch]);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    patch({ orders: dbRef.current.orders.map((order) => (order.id === id ? { ...order, status } : order)) });
    await post("order-status", { id, status });
  }, [patch]);

  const addReview = useCallback(async (productId: string, review: Omit<Review, "id" | "date">) => {
    const entry: Review = { ...review, id: `rev-${Date.now()}`, date: new Date().toISOString() };
    patch({
      products: dbRef.current.products.map((product) =>
        product.id === productId
          ? { ...product, reviews: [...product.reviews, entry], reviewCount: product.reviewCount + 1 }
          : product,
      ),
    });
    await post("review", { productId, review: entry });
  }, [patch]);

  const rememberSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (clean.length < 2) return;
    const recent = [clean, ...dbRef.current.recentSearches.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
    patch({ recentSearches: recent });
  }, [patch]);

  const currentUser = db.users.find((user) => user.id === db.sessionUserId) ?? null;
  const activeProducts = useMemo(
    () => db.products.filter((product) => product.active),
    [db.products],
  );

  const value = useMemo<StoreValue>(() => ({
    ready,
    products: db.products,
    categories: [...db.categories].sort((a, b) => a.order - b.order),
    coupons: db.coupons,
    orders: db.orders,
    users: db.users,
    currentUser,
    adminAuthed: db.adminAuthed,
    cart: db.cart,
    wishlist: db.wishlist,
    couponCode: db.couponCode,
    recentSearches: db.recentSearches,
    cartOpen,
    searchOpen,
    menuOpen,
    toast,
    activeProducts,
    openCart: () => {
      setSearchOpen(false);
      setMenuOpen(false);
      setCartOpen(true);
    },
    closeCart: () => setCartOpen(false),
    openSearch: () => {
      setCartOpen(false);
      setMenuOpen(false);
      setSearchOpen(true);
    },
    closeSearch: () => setSearchOpen(false),
    openMenu: () => {
      setCartOpen(false);
      setSearchOpen(false);
      setMenuOpen(true);
    },
    closeMenu: () => setMenuOpen(false),
    closeOverlays,
    notify,
    addToCart,
    setQuantity,
    removeFromCart,
    moveToWishlist,
    clearCart: () => patch({ cart: [] }),
    applyCoupon,
    clearCoupon: () => patch({ couponCode: null }),
    toggleWishlist,
    isWished: (productId: string) => db.wishlist.includes(productId),
    register,
    login,
    logout,
    updateProfile,
    findAccount,
    resetPassword,
    saveAddress,
    deleteAddress,
    loginAdmin,
    logoutAdmin,
    placeOrder,
    saveProduct,
    deleteProduct,
    saveCategory,
    deleteCategory,
    moveCategory,
    updateOrderStatus,
    saveCoupon,
    deleteCoupon,
    addReview,
    rememberSearch,
    productBySlug: (slug: string) => db.products.find((product) => product.slug === slug),
    productById: (id: string) => db.products.find((product) => product.id === id),
    reviewsFor: (productId: string) => {
      const product = db.products.find((item) => item.id === productId);
      return [...(product?.reviews ?? []), ...(db.extraReviews[productId] ?? [])];
    },
  }), [
    ready, db, currentUser, cartOpen, searchOpen, menuOpen, toast, activeProducts, closeOverlays, notify,
    addToCart, setQuantity, removeFromCart, moveToWishlist, applyCoupon, toggleWishlist, register, login, logout,
    findAccount, resetPassword, updateProfile, saveAddress, deleteAddress, loginAdmin, logoutAdmin, placeOrder, saveProduct, deleteProduct,
    saveCategory, deleteCategory, moveCategory, updateOrderStatus, saveCoupon, deleteCoupon, addReview, rememberSearch, patch,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

export function cartSubtotal(items: CartItem[]) {
  return subtotal(items);
}
