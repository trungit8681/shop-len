"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Variant = { sku: string; color: string; size: string; stock: number; styleId: number; styleName: string; styleImageUrl: string; stylePrice: number; styleMaterial: string };
type ProductStyle = { id: number; name: string; imageUrl: string; imageUrls: string[]; price: number; material: string };
type Product = { id: number; name: string; category: string; description: string; material: string; imageUrl: string; sizeGuide: string; price: number; variants: Variant[]; styles: ProductStyle[] };
type CartLine = { sku: string; quantity: number };
type Order = { id: number; orderCode: string; status: string; customerName: string; customerPhone: string; addressLine: string; province: string; district: string; ward: string; subtotal: number; shippingFee: number; total: number; createdAt: string; items: { sku: string; productName: string; styleName: string; color: string; size: string; quantity: number; lineTotal: number }[]; history: { toStatus: string; note: string; createdAt: string }[] };
type User = { id: number; username: string; email: string; role: string; fullName: string; phone: string };
type Address = { id: number; recipientName: string; phone: string; province: string; district: string; ward: string; addressLine: string; isDefault: boolean };

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const statusText: Record<string, string> = { PENDING_CONFIRMATION: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", PREPARING: "Đang chuẩn bị", SHIPPED: "Đang giao", DELIVERED: "Đã giao", COMPLETED: "Hoàn thành", CANCEL_REQUESTED: "Chờ duyệt hủy", CANCELLED: "Đã hủy" };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("shoplen-customer-token") : null;
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...init, headers });
  const content = await response.text();
  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try { message = JSON.parse(content).message ?? message; } catch { /* Keep the HTTP fallback. */ }
    throw new Error(message);
  }
  return content ? JSON.parse(content) as T : undefined as T;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [priceBand, setPriceBand] = useState("");
  const [inStock, setInStock] = useState(true);
  const [sort, setSort] = useState("newest");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const [catalogReady, setCatalogReady] = useState(false);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [selectedStyle, setSelectedStyle] = useState<Record<number, number>>({});
  const [selectedImage, setSelectedImage] = useState<Record<number, number>>({});
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [panel, setPanel] = useState<"account" | "orders" | null>(null);
  const [accountTab, setAccountTab] = useState<"profile" | "orders" | "addresses">("profile");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [customerForm, setCustomerForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [addressForm, setAddressForm] = useState({ recipientName: "", phone: "", province: "", district: "", ward: "", addressLine: "", isDefault: true });
  const [loginMode, setLoginMode] = useState<"login" | "register">("login");
  const [accountBusy, setAccountBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [checkout, setCheckout] = useState({ customerName: "", customerEmail: "", customerPhone: "", province: "", district: "", ward: "", addressLine: "", note: "" });
  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState({ code: "", phone: "" });
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [shippingFee, setShippingFee] = useState(0);
  const [shopName, setShopName] = useState("Cuti Mango");

  const refreshActiveCatalog = useCallback(async () => {
    try {
      const activeProducts = await api<Product[]>("/products");
      const activeById = new Map(activeProducts.map(product => [product.id, product]));
      setCatalog(activeProducts);
      setProducts(current => current.flatMap(product => {
        const activeProduct = activeById.get(product.id);
        return activeProduct ? [activeProduct] : [];
      }));
      setCatalogReady(true);
    } catch (error) {
      setMessage((error as Error).message);
    }
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("shoplen-cart") ?? "[]");
      setCart(Array.isArray(saved) ? saved.filter((line): line is CartLine => line && typeof line.sku === "string" && Number.isInteger(line.quantity) && line.quantity > 0) : []);
    } catch { setCart([]); }
    finally { setCartReady(true); }
    const saved = sessionStorage.getItem("shoplen-customer-token");
    if (saved) {
      setToken(saved);
      api<User>("/customer/me").then(profile => {
        setUser(profile);
        setProfileForm({ fullName: profile.fullName, phone: profile.phone });
        setCheckout(current => ({ ...current, customerName: profile.fullName, customerEmail: profile.email, customerPhone: profile.phone }));
        return api<Address[]>("/customer/addresses");
      }).then(savedAddresses => {
        setAddresses(savedAddresses);
        if (savedAddresses[0]) {
          const address = savedAddresses[0];
          setCheckout(current => ({ ...current, customerName: address.recipientName, customerPhone: address.phone,
            province: address.province, district: "", ward: address.ward, addressLine: address.addressLine }));
        }
      }).catch(() => { sessionStorage.removeItem("shoplen-customer-token"); setToken(""); });
    }
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    localStorage.setItem("shoplen-cart", JSON.stringify(cart));
  }, [cart, cartReady]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (color) params.set("color", color);
    if (size) params.set("size", size);
    if (priceBand) {
      const [minimum, maximum] = priceBand.split("-");
      if (minimum) params.set("minPrice", minimum);
      if (maximum) params.set("maxPrice", maximum);
    }
    if (inStock) params.set("inStock", "true");
    params.set("sort", sort);
    setLoading(true);
    Promise.all([api<Product[]>(`/products?${params}`), api<Product[]>("/products"), api<{ id: number; name: string }[]>("/categories")])
      .then(([items, allItems, groups]) => { setProducts(items); setCatalog(allItems); setCatalogReady(true); setCategories(groups); setMessage(""); })
      .catch(error => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [query, category, color, size, priceBand, inStock, sort]);

  useEffect(() => {
    api<{ shopName: string; shippingFee: number }>("/shop").then(shop => {
      if (shop.shopName) setShopName(shop.shopName);
      setShippingFee(shop.shippingFee);
      document.title = `${shop.shopName || "Cuti Mango"} — Len móc thủ công`;
    }).catch(error => setMessage(error.message));
  }, []);
  useEffect(() => {
    if (!cartReady || !catalogReady) return;
    const availableSkus = new Set(catalog.flatMap(product => product.variants.map(variant => variant.sku)));
    setCart(current => current.filter(line => availableSkus.has(line.sku)));
  }, [cartReady, catalogReady, catalog]);
  useEffect(() => {
    const refreshOnFocus = () => { void refreshActiveCatalog(); };
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") void refreshActiveCatalog(); };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const interval = window.setInterval(refreshWhenVisible, 30_000);
    return () => {
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(interval);
    };
  }, [refreshActiveCatalog]);

  const cartItems = useMemo(() => cart.map(line => {
    const product = catalog.find(p => p.variants.some(v => v.sku === line.sku));
    const variant = product?.variants.find(v => v.sku === line.sku);
    return product && variant ? { ...line, product, variant } : null;
  }).filter((line): line is NonNullable<typeof line> => line !== null), [cart, catalog]);
  const subtotal = cartItems.reduce((total, line) => total + line.variant.stylePrice * line.quantity, 0);
  const itemCount = cartItems.reduce((sum, line) => sum + line.quantity, 0);

  function addToCart(product: Product) {
    const styleId = selectedStyle[product.id] ?? product.styles.find(style => product.variants.some(v => v.styleId === style.id && v.stock > 0))?.id;
    const styleVariants = product.variants.filter(v => v.styleId === styleId);
    const sku = styleVariants.some(v => v.sku === selected[product.id]) ? selected[product.id] : styleVariants.find(v => v.stock > 0)?.sku;
    if (!sku) { setMessage("Kiểu sản phẩm này hiện đã hết hàng."); return; }
    const variant = product.variants.find(v => v.sku === sku);
    if (!variant || variant.stock < 1) { setMessage("Biến thể này hiện đã hết hàng."); return; }
    setCart(current => {
      const existing = current.find(line => line.sku === sku);
      if (existing) return current.map(line => line.sku === sku ? { ...line, quantity: Math.min(line.quantity + 1, variant.stock) } : line);
      return [...current, { sku, quantity: 1 }];
    });
    setMessage("Đã thêm vào túi.");
  }

  function setQuantity(sku: string, quantity: number) {
    if (quantity < 1) setCart(current => current.filter(line => line.sku !== sku));
    else setCart(current => current.map(line => line.sku === sku ? { ...line, quantity } : line));
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault(); setMessage(""); setAuthError(""); setAccountBusy(true);
    try {
      if (loginMode === "register") {
        await api("/auth/register", { method: "POST", body: JSON.stringify({ email: customerForm.email, password: customerForm.password, fullName: customerForm.fullName, phone: customerForm.phone }) });
      }
      const result = await api<{ accessToken: string; user: User }>("/auth/login/customer", { method: "POST", body: JSON.stringify({ username: customerForm.email, password: customerForm.password }) });
      if (result.user.role !== "CUSTOMER") throw new Error("Tài khoản này không có quyền đăng nhập khu vực khách hàng.");
      sessionStorage.setItem("shoplen-customer-token", result.accessToken); setToken(result.accessToken); setUser(result.user);
      setCheckout(current => ({ ...current, customerName: result.user.fullName, customerEmail: result.user.email, customerPhone: result.user.phone }));
      setProfileForm({ fullName: result.user.fullName, phone: result.user.phone });
      const savedAddresses = await api<Address[]>("/customer/addresses");
      setAddresses(savedAddresses);
      if (savedAddresses[0]) {
        const address = savedAddresses[0];
        setCheckout(current => ({ ...current, customerName: address.recipientName, customerPhone: address.phone, province: address.province, district: "", ward: address.ward, addressLine: address.addressLine }));
      }
      setPanel(null); setMessage("Đăng nhập thành công.");
    } catch (error) { setAuthError((error as Error).message); }
    finally { setAccountBusy(false); }
  }

  function logoutCustomer() {
    sessionStorage.removeItem("shoplen-customer-token");
    setToken("");
    setUser(null);
    setPanel(null);
    setAccountTab("profile");
    setLoginMode("login");
    setCustomerForm({ fullName: "", email: "", phone: "", password: "" });
    setProfileForm({ fullName: "", phone: "" });
    setAddressForm({ recipientName: "", phone: "", province: "", district: "", ward: "", addressLine: "", isDefault: true });
    setAddresses([]);
    setMyOrders([]);
    setAuthError("");
    setCheckout({ customerName: "", customerEmail: "", customerPhone: "", province: "", district: "", ward: "", addressLine: "", note: "" });
    setCheckoutOpen(false);
    setTracking({ code: "", phone: "" });
    setOrder(null);
    setShowOrderConfirmation(false);
    setMessage("Đã đăng xuất.");
  }

  async function openAccount() {
    setAccountTab("profile");
    setMessage("");
    setPanel("account");
    if (token) {
      try {
        const [orders, savedAddresses] = await Promise.all([api<Order[]>("/customer/orders"), api<Address[]>("/customer/addresses")]);
        setMyOrders(orders); setAddresses(savedAddresses);
      } catch (error) { setMessage((error as Error).message); }
    }
  }

  async function submitCheckout(event: FormEvent) {
    event.preventDefault(); setMessage("");
    setSubmittingOrder(true);
    try {
      const created = await api<Order>("/orders", { method: "POST", body: JSON.stringify({ ...checkout, customerEmail: checkout.customerEmail || null, items: cart.map(line => ({ sku: line.sku, quantity: line.quantity })) }) });
      setOrder(created); setShowOrderConfirmation(true); setCart([]); setCheckoutOpen(false); setPanel(null);
      document.getElementById("bag")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { setMessage((error as Error).message); }
    finally { setSubmittingOrder(false); }
  }

  async function trackOrder(event: FormEvent) {
    event.preventDefault(); setMessage(""); setShowOrderConfirmation(false);
    try { setOrder(await api<Order>(`/orders/lookup?code=${encodeURIComponent(tracking.code)}&phone=${encodeURIComponent(tracking.phone)}`)); }
    catch (error) { setOrder(null); setMessage((error as Error).message); }
  }

  async function cancelOrder(current: Order) {
    try {
      const updated = await api<Order>("/orders/cancel", { method: "POST", body: JSON.stringify({ orderCode: current.orderCode, phone: current.customerPhone, note: "Khách yêu cầu hủy" }) });
      setOrder(updated); setMyOrders(items => items.map(item => item.id === updated.id ? updated : item)); setMessage("Đã ghi nhận yêu cầu hủy đơn.");
    } catch (error) { setMessage((error as Error).message); }
  }

  async function saveAddress(event: FormEvent) {
    event.preventDefault();
    try {
      const created = await api<Address>("/customer/addresses", { method: "POST", body: JSON.stringify({ ...addressForm, isDefault: addresses.length === 0 || addressForm.isDefault }) });
      setAddresses(items => [created, ...items]); setMessage("Đã lưu địa chỉ.");
    } catch (error) { setMessage((error as Error).message); }
  }

  async function deleteAddress(address: Address) {
    try {
      await api(`/customer/addresses/${address.id}`, { method: "DELETE" });
      setAddresses(items => items.filter(item => item.id !== address.id));
      setMessage("Đã xóa địa chỉ.");
    } catch (error) { setMessage((error as Error).message); }
  }

  function useAddress(address: Address) {
    setCheckout(current => ({ ...current, customerName: address.recipientName, customerPhone: address.phone,
      province: address.province, district: "", ward: address.ward, addressLine: address.addressLine }));
    setCheckoutOpen(true);
    setPanel(null);
    document.getElementById("bag")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await api<User>("/customer/me", { method: "PUT", body: JSON.stringify(profileForm) });
      setUser(updated); setMessage("Thông tin tài khoản đã được cập nhật.");
    } catch (error) { setMessage((error as Error).message); }
  }

  const canCancel = (status: string) => ["PENDING_CONFIRMATION", "CONFIRMED", "PREPARING"].includes(status);
  const categorySize = (name: string, requireStock: boolean) => catalog.filter(product => product.category === name && (!requireStock || product.variants.some(variant => variant.stock > 0))).length;
  const bannerShots = catalog.flatMap(product => {
    const style = product.styles.find(item => product.variants.some(variant => variant.styleId === item.id && variant.stock > 0));
    if (!style) return [];
    const url = style.imageUrls?.[0] || style.imageUrl || product.imageUrl;
    return url ? [{ url, name: product.name }] : [];
  }).slice(0, 3);
  const shownCategories = categories.filter(item => categorySize(item.name, false) > 0 && (!inStock || item.name === category || categorySize(item.name, true) > 0));
  const colorOptions = [...new Set(catalog.flatMap(product => product.variants.map(variant => variant.color)))].filter(item => item?.trim());

  return <main className="shop">
    <header className="masthead"><a className="wordmark" href="/"><ShopWordmark name={shopName} /></a><nav><a href="#collection">Bộ sưu tập</a><a href="#story">Câu chuyện</a><button className="nav-link" onClick={() => { setPanel("orders"); setOrder(null); }}>Tra cứu đơn</button></nav>
      <div className="head-actions"><button className="icon-button" aria-label="Tài khoản" onClick={openAccount}><span className="user-icon">♙</span><span className="desktop-label">{user ? user.fullName : "Tài khoản"}</span></button><a className="bag-button" href="#bag">Túi hàng <b>{itemCount}</b></a></div></header>
    <section className="hero"><div className="hero-copy"><p className="overline">{shopName.toUpperCase()} · LEN MÓC THỦ CÔNG</p><h1>Dễ thương<br />từ từng <i>mũi móc.</i></h1><p>Túi, áo và phụ kiện làm bằng tay. Chọn món bạn thích, đặt COD, shop gọi xác nhận trước khi gửi.</p><a className="dark-button" href="#collection">Xem hàng mới <span>↗</span></a></div><div className="banner-stage">{bannerShots.length ? <div className={`banner-collage shots-${bannerShots.length}`}>{bannerShots.map(shot => <figure key={shot.url}><img src={shot.url} alt={shot.name} /></figure>)}</div> : <div className="banner-fallback" />}<div className="hero-seal">MÓC<br />TAY</div></div></section>
    <section className="benefits"><span>✳ Len móc thủ công</span><span>✳ Mẫu dễ thương</span><span>✳ Gói hàng có tâm</span><span>✳ Giao COD toàn quốc</span></section>
    <section className="collection" id="collection"><div className="section-top"><div><p className="overline">{shopName.toUpperCase()}</p><h2>Hàng móc <i>mới.</i></h2></div><p>Túi, áo và phụ kiện<br />làm thủ công.</p></div>
      <div className="filters"><label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm mẫu len bạn yêu..." /></label><select aria-label="Danh mục" value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{shownCategories.map(item => <option value={item.name} key={item.id}>{item.name}</option>)}</select><select aria-label="Màu sắc" value={color} onChange={e => setColor(e.target.value)}><option value="">Mọi màu sắc</option>{colorOptions.map(item => <option key={item}>{item}</option>)}</select><select aria-label="Kích cỡ" value={size} onChange={e => setSize(e.target.value)}><option value="">Mọi kích cỡ</option>{["XS", "S", "M", "L", "XL", "Free size"].map(item => <option key={item}>{item}</option>)}</select><select aria-label="Khoảng giá" value={priceBand} onChange={e => setPriceBand(e.target.value)}><option value="">Mọi mức giá</option><option value="0-300000">Dưới 300.000 ₫</option><option value="300000-700000">300.000–700.000 ₫</option><option value="700000-">Trên 700.000 ₫</option></select><select aria-label="Sắp xếp" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Mới nhất</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option></select><label className="stock-filter"><input type="checkbox" checked={inStock} onChange={e => setInStock(e.target.checked)} /> Còn hàng</label></div>
      <nav className="category-browser" aria-label="Lọc theo danh mục"><button className={!category?"selected":""} onClick={()=>setCategory("")}>Tất cả sản phẩm</button>{shownCategories.map(item=><button className={category===item.name?"selected":""} key={item.id} onClick={()=>setCategory(category===item.name?"":item.name)}>{item.name}<span>{categorySize(item.name, inStock)}</span></button>)}</nav>
      {message && !panel && <div className="toast" role="status">{message}<button onClick={() => setMessage("")}>×</button></div>}
      {loading ? <div className="loading">Đang chọn những món len thật xinh cho bạn…</div> : products.length ? <div className="product-grid">{products.map((product, index) => {
        const activeStyleId = selectedStyle[product.id] ?? product.styles.find(style => product.variants.some(v => v.styleId === style.id && v.stock > 0))?.id ?? product.styles[0]?.id;
        const styleVariants = product.variants.filter(v => v.styleId === activeStyleId);
        const available = styleVariants.filter(v => v.stock > 0);
        const soldOut = !product.variants.some(v => v.stock > 0);
        const blurb = product.description.replace(/https?:\/\/\S+/g, "").replace(/Nguồn sản phẩm:\s*/gi, "").replace(/\s{2,}/g, " ").trim();
        const chosen = styleVariants.some(v => v.sku === selected[product.id]) ? selected[product.id] : available[0]?.sku ?? styleVariants[0]?.sku;
        const activeStyle = product.styles.find(style => style.id === activeStyleId);
        const styleImages = activeStyle?.imageUrls?.length ? activeStyle.imageUrls : [activeStyle?.imageUrl || product.imageUrl].filter(Boolean);
        const activeImageIndex = Math.min(selectedImage[product.id] ?? 0, Math.max(0, styleImages.length - 1));
        const activeImageUrl = styleImages[activeImageIndex];
        return <article className="product-card" key={product.id}><div className={`product-photo tone-${index % 4}`}>{activeImageUrl ? <img src={activeImageUrl} alt={`${product.name} · ${activeStyle?.name ?? ""}`} /> : <div className="knit-art"><span>{product.category}</span><b>LEN</b><small>SOFT / NATURAL / YOU</small></div>}{(!soldOut && index === 0 || soldOut) && <span className={`product-badge${soldOut ? " is-out" : ""}`}>{soldOut ? "Hết hàng" : "Bán chạy"}</span>}</div>
          {styleImages.length > 1 && <div className="product-gallery" role="group" aria-label={`Ảnh ${activeStyle?.name ?? "sản phẩm"} ${product.name}`}>{styleImages.map((imageUrl, imageIndex) => <button type="button" key={`${imageUrl}-${imageIndex}`} className={imageIndex === activeImageIndex ? "selected" : ""} aria-label={`Xem ảnh ${imageIndex + 1} của kiểu ${activeStyle?.name ?? ""}`} aria-pressed={imageIndex === activeImageIndex} onClick={() => setSelectedImage(current => ({ ...current, [product.id]: imageIndex }))}><img src={imageUrl} alt=""/></button>)}</div>}
          <div className="product-info"><p className="product-category">{product.category} <span>{activeStyle?.material ?? product.material}</span></p><h3 title={product.name}>{product.name}</h3>{blurb && <p className="product-description">{blurb}</p>}<div className="product-bottom"><strong>{money(activeStyle?.price ?? product.price)}</strong><span>{available.length ? `${available.length} lựa chọn còn hàng` : "Hết hàng"}</span></div>
            <div className="style-options" role="group" aria-label={`Chọn kiểu cho ${product.name}`}>{product.styles.map(style => <button type="button" key={style.id} className={style.id === activeStyleId ? "selected" : ""} aria-pressed={style.id === activeStyleId} onClick={() => { setSelectedStyle(current => ({ ...current, [product.id]: style.id })); setSelectedImage(current => ({ ...current, [product.id]: 0 })); setSelected(current => ({ ...current, [product.id]: product.variants.find(v => v.styleId === style.id && v.stock > 0)?.sku ?? "" })); }}><img src={style.imageUrls?.[0] || style.imageUrl || product.imageUrl} alt=""/><span>{style.name}</span></button>)}</div>
            <div className="variant-select"><select aria-label={`Chọn màu và kích cỡ cho ${product.name}`} value={chosen ?? ""} disabled={!styleVariants.length} onChange={e => setSelected(current => ({ ...current, [product.id]: e.target.value }))}>{styleVariants.map(v => <option key={v.sku} value={v.sku} disabled={v.stock < 1}>{[v.color, v.size].filter(Boolean).join(" · ")}{v.stock < 1 ? " · Hết hàng" : ""}</option>)}</select><button disabled={!available.length} onClick={() => addToCart(product)}>Thêm vào túi</button></div>{product.sizeGuide&&<details className="size-guide"><summary>Hướng dẫn chọn size</summary><p>{product.sizeGuide}</p></details>}</div>
        </article>;
      })}</div> : <div className="empty-state"><span>✳</span><h3>Chưa tìm thấy món len này</h3><p>Thử đổi từ khóa hoặc chọn bộ lọc khác nhé.</p></div>}
    </section>
    <section className="story" id="story"><p className="overline">{shopName.toUpperCase()}</p><h2>Móc chậm,<br /><i>dễ thương lâu.</i></h2><p>Mỗi món được móc tay, từ túi đến áo. Chọn một chiếc bạn muốn dùng đi dùng lại.</p><a href="#collection">Xem bộ sưu tập ↗</a><span className="story-mark">{shopName.trim().split(/\s+/).filter(Boolean).map(part => part[0]?.toUpperCase()).join(" / ")}</span></section>
    <section className="flow-shop" id="bag">
      <div className="flow-bag">
        <div className="flow-head"><div><p className="overline">YOUR LITTLE COLLECTION</p><h2>Túi hàng <i>({itemCount})</i></h2></div><p>{shippingFee ? `Phí giao ${money(shippingFee)}` : "Giao hàng theo chính sách cửa hàng"}</p></div>
        {showOrderConfirmation && order && !panel && <div className="flow-confirm" role="status"><p className="overline">CẢM ƠN BẠN ĐÃ CHỌN {shopName.toUpperCase()}</p><h3>Đơn <i>{order.orderCode}</i> đã được ghi nhận.</h3><p>Trạng thái: <b>{statusText[order.status] ?? order.status}</b>. Chúng mình sẽ gọi xác nhận trước khi gửi.</p><strong>{money(order.total)} · Thanh toán khi nhận hàng</strong><button className="text-action" onClick={() => { setOrder(null); setShowOrderConfirmation(false); }}>Tiếp tục mua sắm</button></div>}
        {cartItems.length ? cartItems.map(line => <article className="flow-line" key={line.sku}>
          <div className="flow-photo">{line.variant.styleImageUrl ? <img src={line.variant.styleImageUrl} alt={`${line.product.name} · ${line.variant.styleName}`}/> : "LEN"}</div>
          <div><h3>{line.product.name}</h3><p>{[...new Set([line.variant.styleName, line.variant.color, line.variant.size].filter(Boolean))].join(" · ")}</p><span className="flow-meta">{line.variant.styleMaterial}</span><strong>{money(line.variant.stylePrice)}</strong></div>
          <div className="flow-line-actions"><div className="flow-qty"><button aria-label={`Giảm số lượng ${line.product.name}`} onClick={() => setQuantity(line.sku, line.quantity - 1)}>−</button><span>{line.quantity}</span><button aria-label={`Tăng số lượng ${line.product.name}`} disabled={line.quantity >= line.variant.stock} onClick={() => setQuantity(line.sku, line.quantity + 1)}>+</button></div><button className="flow-remove" onClick={() => setQuantity(line.sku, 0)}>Xóa</button></div>
        </article>) : <p className="flow-empty">Túi hàng đang chờ món len đầu tiên của bạn. Chọn một mẫu ở bộ sưu tập phía trên.</p>}
      </div>
      <aside className="flow-side">
        <div className="flow-card">
          <h3>Thanh toán</h3>
          <div className="flow-totals"><span>Tiền hàng · {itemCount} sản phẩm</span><b>{money(subtotal)}</b><span>Phí vận chuyển</span><b>{shippingFee ? money(shippingFee) : "Miễn phí"}</b><strong>Tổng COD</strong><strong>{money(subtotal + shippingFee)}</strong></div>
          <button className="dark-button" disabled={!cartItems.length} onClick={() => { setCheckoutOpen(current => !current); setMessage(""); }}>{checkoutOpen ? "Đóng form đặt hàng" : "Đặt hàng COD"} <span>{checkoutOpen ? "−" : "→"}</span></button>
          <p className="flow-note">{user ? `Đặt với tài khoản ${user.email}. Không cần thanh toán trước.` : "Khách vãng lai đặt được ngay, không cần tài khoản."}</p>
        </div>
        <button className="flow-track" onClick={() => { setPanel("orders"); setOrder(null); }}>Đã có đơn? Tra cứu hành trình</button>
      </aside>
      {checkoutOpen && cartItems.length > 0 && <form className="flow-card flow-checkout" onSubmit={submitCheckout}>
        <h3 id="checkout-heading">Thông tin nhận hàng</h3>
        <p className="flow-lead">Điền người nhận và địa chỉ. Shop gọi xác nhận trước khi giao.</p>
        {addresses.length > 0 && <div className="flow-addresses">{addresses.map(address => <button type="button" key={address.id} onClick={() => useAddress(address)}>{address.recipientName}{address.isDefault ? " · Mặc định" : ""}<small>{[address.addressLine, address.ward, address.province].filter(Boolean).join(", ")}</small></button>)}</div>}
        <div className="flow-fields">
          <div className="flow-row"><label>Người nhận<input autoComplete="name" required value={checkout.customerName} onChange={e => setCheckout({ ...checkout, customerName: e.target.value })} /></label><label>Số điện thoại<input autoComplete="tel" type="tel" required pattern="[+0-9 ()-]{8,20}" value={checkout.customerPhone} onChange={e => setCheckout({ ...checkout, customerPhone: e.target.value })} /></label></div>
          <label>Email <span className="flow-optional">(không bắt buộc)</span><input autoComplete="email" type="email" value={checkout.customerEmail} onChange={e => setCheckout({ ...checkout, customerEmail: e.target.value })} /></label>
          <div className="flow-row"><label>Tỉnh / Thành phố<input autoComplete="address-level1" required value={checkout.province} onChange={e => setCheckout({ ...checkout, province: e.target.value })} /></label><label>Phường / Xã<input autoComplete="address-level2" required value={checkout.ward} onChange={e => setCheckout({ ...checkout, ward: e.target.value })} /></label></div>
          <label>Số nhà, tên đường<input autoComplete="street-address" required value={checkout.addressLine} onChange={e => setCheckout({ ...checkout, addressLine: e.target.value })} /></label>
          <label>Ghi chú <span className="flow-optional">(không bắt buộc)</span><textarea value={checkout.note} onChange={e => setCheckout({ ...checkout, note: e.target.value })} /></label>
        </div>
        <button className="dark-button" disabled={submittingOrder}>{submittingOrder ? "Đang tạo đơn hàng…" : "Xác nhận đặt hàng COD"} <span>→</span></button>
        {message && <p className="form-message" role="alert">{message}</p>}
      </form>}
    </section>
    <footer className="footer"><a className="wordmark" href="/"><ShopWordmark name={shopName} /></a><span>Len móc thủ công, gói hàng có tâm.</span><span>© 2026 {shopName}</span></footer>

    {panel && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setPanel(null); }}><section className={`modal ${panel === "account" && user ? "dash" : ""} ${panel === "orders" ? "flow-orders" : ""}`} role="dialog" aria-modal="true" aria-label={panel === "orders" ? "Tra cứu đơn hàng" : "Tài khoản"}>
      <div className="modal-pin"><button className="close-button" onClick={() => { setPanel(null); setMessage(""); }} aria-label="Đóng">×</button></div>
      {panel === "account" && <>{user ? <><div className="dash-hero"><p className="overline">TÀI KHOẢN {shopName.toUpperCase()}</p><h2>Xin chào, <i>{user.fullName}</i></h2><p>{user.email}</p></div>
        <div className="dash-tabs" role="tablist"><button type="button" className={accountTab === "profile" ? "is-on" : ""} onClick={() => setAccountTab("profile")}>Hồ sơ</button><button type="button" className={accountTab === "orders" ? "is-on" : ""} onClick={() => setAccountTab("orders")}>Đơn hàng</button><button type="button" className={accountTab === "addresses" ? "is-on" : ""} onClick={() => setAccountTab("addresses")}>Địa chỉ</button></div>
        {accountTab === "profile" && <form className="dash-form" onSubmit={saveProfile}><label>Họ tên<input required value={profileForm.fullName} onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })} /></label><label>Số điện thoại<input required value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} /></label><button className="outline-button">Cập nhật thông tin</button></form>}
        {accountTab === "profile" && <div className="dash-links"><a className="text-action" href="/forgot-password">Đổi mật khẩu</a><button className="text-action" onClick={async () => { try { await api("/auth/logout", { method: "POST" }); } finally { logoutCustomer(); } }}>Đăng xuất</button></div>}
        {accountTab === "orders" && <>{myOrders.length ? myOrders.map(item => <OrderCard key={item.id} order={item} cancel={() => cancelOrder(item)} canCancel={canCancel(item.status)} />) : <p className="muted">Bạn chưa có đơn hàng nào.</p>}</>}
        {accountTab === "addresses" && <><div>{addresses.map(address => <div className="dash-address" key={address.id}><b>{address.recipientName}{address.isDefault ? " · Mặc định" : ""}</b><span>{[address.addressLine, address.ward, address.province].filter(Boolean).join(", ")}</span><span>{address.phone}</span><div className="address-actions"><button className="text-action" onClick={() => useAddress(address)}>Dùng để đặt hàng</button><button className="text-action" onClick={() => deleteAddress(address)}>Xóa</button></div></div>)}{!addresses.length && <p className="muted">Chưa có địa chỉ đã lưu.</p>}</div>
        <form className="dash-form" onSubmit={saveAddress}><h3>Thêm địa chỉ</h3><label>Người nhận<input required value={addressForm.recipientName} onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })} /></label><label>Số điện thoại<input required value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} /></label><label>Tỉnh / Thành phố<input autoComplete="address-level1" required value={addressForm.province} onChange={e => setAddressForm({ ...addressForm, province: e.target.value })} /></label><label>Phường / Xã<input required value={addressForm.ward} onChange={e => setAddressForm({ ...addressForm, ward: e.target.value })} /></label><label>Số nhà, tên đường<input autoComplete="street-address" required value={addressForm.addressLine} onChange={e => setAddressForm({ ...addressForm, addressLine: e.target.value })} /></label><button className="outline-button">Lưu địa chỉ</button></form></>}
      </> : <><p className="overline">{shopName.toUpperCase()} · TÀI KHOẢN KHÁCH HÀNG</p><h2>{loginMode === "login" ? "Rất vui gặp lại." : "Tạo tài khoản mới."}</h2><p className="muted">{loginMode === "login" ? "Đăng nhập bằng email khách hàng đã đăng ký." : "Tạo tài khoản để lưu địa chỉ và theo dõi đơn hàng."}</p><form className="form-stack" onSubmit={submitAccount}>{loginMode === "register" && <label>Họ và tên<input autoComplete="name" required value={customerForm.fullName} onChange={e => setCustomerForm({ ...customerForm, fullName: e.target.value })} /></label>}<label>Email<input type="email" autoComplete="email" required value={customerForm.email} onChange={e => setCustomerForm({ ...customerForm, email: e.target.value })} /></label>{loginMode === "register" && <label>Số điện thoại<input type="tel" autoComplete="tel" required value={customerForm.phone} onChange={e => setCustomerForm({ ...customerForm, phone: e.target.value })} /></label>}<label>Mật khẩu<input type="password" autoComplete={loginMode === "login" ? "current-password" : "new-password"} minLength={loginMode === "register" ? 10 : undefined} required value={customerForm.password} onChange={e => setCustomerForm({ ...customerForm, password: e.target.value })} /></label>{authError && <p className="form-message form-error" role="alert">{authError}</p>}<button className="dark-button full" disabled={accountBusy}>{accountBusy ? "Đang xác thực…" : loginMode === "login" ? "Đăng nhập tài khoản khách" : "Tạo tài khoản"}</button></form><div className="modal-actions"><a href="/forgot-password" className="text-action">Quên mật khẩu?</a><button className="text-action" disabled={accountBusy} onClick={() => { setAuthError(""); setLoginMode(loginMode === "login" ? "register" : "login"); }}>{loginMode === "login" ? "Tạo tài khoản" : "Đã có tài khoản? Đăng nhập"}</button></div></>}
      </>}
      {panel === "orders" && <><p className="overline">ORDER JOURNEY</p><h2>Đơn hàng của bạn<br /><i>đang ở đâu?</i></h2>{user && <div className="order-tabs"><button onClick={async () => setMyOrders(await api<Order[]>("/customer/orders"))}>Đơn của tôi</button><span>hoặc tra cứu với đơn khách</span></div>}<form className="form-stack" onSubmit={trackOrder}><label>Mã đơn hàng<input required placeholder="VD: SL..." value={tracking.code} onChange={e => setTracking({ ...tracking, code: e.target.value })} /></label><label>Số điện thoại đặt hàng<input required value={tracking.phone} onChange={e => setTracking({ ...tracking, phone: e.target.value })} /></label><button className="dark-button full">Tra cứu đơn <span>↗</span></button></form>{order && <OrderCard order={order} cancel={() => cancelOrder(order)} canCancel={canCancel(order.status)} />}{user && myOrders.map(item => <OrderCard key={item.id} order={item} cancel={() => cancelOrder(item)} canCancel={canCancel(item.status)} />)}</>}
      {message && <p className="form-message" role="status">{message}</p>}
    </section></div>}
  </main>;
}

function ShopWordmark({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Cuti";
  const rest = parts.slice(1).join(" ");
  return <>{first}{rest ? <> <span>{rest}</span></> : null}</>;
}

function OrderCard({ order, cancel, canCancel }: { order: Order; cancel: () => void; canCancel: boolean }) {
  return <article className="order-card"><div className="order-card-head"><b>{order.orderCode}</b><span className={`status-chip status-${order.status.toLowerCase()}`}>{statusText[order.status] ?? order.status}</span></div><p>{new Date(order.createdAt).toLocaleString("vi-VN")} · {money(order.total)}</p><div className="order-items">{order.items.map(item => <span key={item.sku}>{item.productName} · {item.styleName} · {item.color}/{item.size} × {item.quantity}</span>)}</div><div className="timeline">{order.history.map((entry, i) => <span key={`${entry.toStatus}-${i}`}><b>{statusText[entry.toStatus] ?? entry.toStatus}</b><small>{new Date(entry.createdAt).toLocaleString("vi-VN")}</small></span>)}</div>{canCancel && <button className="cancel-link" onClick={cancel}>Yêu cầu hủy đơn</button>}</article>;
}
