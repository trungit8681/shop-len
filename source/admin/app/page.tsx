"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ProductStyleEditor, blankProduct, styleGaps, type ProductDraft, type ProductStyle, type StyleDraft, type Variant } from "./product-editor";

type Product = { id: number; name: string; category: string; slug: string; material: string; description: string; imageUrl: string; sizeGuide: string; price: number; active: boolean; variants: Variant[]; styles: ProductStyle[] };
type Category = { id: number; name: string; description: string; active: boolean; displayOrder: number };
type OrderItem = { sku: string; productName: string; styleName: string; color: string; size: string; quantity: number; lineTotal: number };
type Order = { id: number; orderCode: string; userId: number | null; status: string; carrier: string; trackingCode: string; customerName: string; customerEmail: string; customerPhone: string; province: string; district: string; ward: string; addressLine: string; note: string; subtotal: number; shippingFee: number; total: number; createdAt: string; items: OrderItem[]; history: { fromStatus: string; toStatus: string; actor: string; note: string; createdAt: string }[] };
type Customer = { id: number; email: string; fullName: string; phone: string; role: string };
type Movement = { id: number; productId: number; sku: string; quantityDelta: number; reason: string; referenceCode: string; actor: string; note: string; createdAt: string };
type Report = { totalOrders: number; activeOrders: number; pendingOrders: number; revenue: number; lowStockVariants: number };
type Alert = { productId: number; productName: string; sku: string; styleName: string; color: string; size: string; stock: number; lowStockThreshold: number };
type ShopProfile = { shopName: string; shippingFee: number };

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const createSku = (name: string, color: string, size: string) => {
  const prefix = [name, color, size].map(value => slugify(value).replace(/-/g, "").slice(0, 8).toUpperCase()).filter(Boolean).join("-");
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  return `SL-${prefix}-${suffix}`;
};
const labels: Record<string, string> = { PENDING_CONFIRMATION: "Chờ xác nhận", CONFIRMED: "Đã xác nhận", PREPARING: "Đang chuẩn bị", SHIPPED: "Đang giao", DELIVERED: "Đã giao", COMPLETED: "Hoàn thành", CANCEL_REQUESTED: "Yêu cầu hủy", CANCELLED: "Đã hủy" };
const transitions: Record<string, string[]> = { PENDING_CONFIRMATION: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["PREPARING", "CANCELLED"], PREPARING: ["SHIPPED", "CANCELLED"], CANCEL_REQUESTED: ["PREPARING", "CANCELLED"], SHIPPED: ["DELIVERED"], DELIVERED: ["COMPLETED"] };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem("shoplen-admin-token") : null;
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    let message = `Yêu cầu thất bại (${response.status})`;
    try { message = JSON.parse(text).message ?? message; } catch { /* Keep the HTTP fallback. */ }
    throw new Error(message);
  }
  return text ? JSON.parse(text) as T : undefined as T;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [form, setForm] = useState<ProductDraft>(blankProduct);
  const [editing, setEditing] = useState<number | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [inventoryForm, setInventoryForm] = useState({ sku: "", delta: 0, reason: "RECEIVE", note: "", lowStockThreshold: 5 });
  const [activeView, setActiveView] = useState("overview");
  const [search, setSearch] = useState("");
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [productToHide, setProductToHide] = useState<Product | null>(null);
  const [productHiding, setProductHiding] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<{ id: number; email: string; fullName: string; phone: string } | null>(null);
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerPasswordSaving, setCustomerPasswordSaving] = useState(false);
  const [resettingCustomerId, setResettingCustomerId] = useState<number | null>(null);
  const [shippingForm, setShippingForm] = useState({ carrier: "", trackingCode: "" });
  const [orderQuery, setOrderQuery] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"" | "low" | "out">("");
  const [movementQuery, setMovementQuery] = useState("");
  const [shopName, setShopName] = useState("Cuti Mango");
  const [shippingFeeInput, setShippingFeeInput] = useState("0");
  const [shopSaving, setShopSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAll = useCallback(async () => {
    const [items, groups, orderList, customerList, inventory, stockAlerts, summary] = await Promise.all([
      api<Product[]>("/admin/products"), api<Category[]>("/admin/categories"), api<Order[]>("/admin/orders"),
      api<Customer[]>("/admin/customers"), api<Movement[]>("/admin/inventory/movements"),
      api<Alert[]>("/admin/inventory/low-stock"), api<Report>("/admin/reports/summary"),
    ]);
    setProducts(items); setCategories(groups); setOrders(orderList); setCustomers(customerList);
    setMovements(inventory); setAlerts(stockAlerts); setReport(summary);
  }, []);

  useEffect(() => {
    api<ShopProfile>("/shop").then(shop => {
      setShopName(shop.shopName);
      setShippingFeeInput(String(shop.shippingFee));
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("shoplen-admin-token");
    if (saved) { setToken(saved); loadAll().catch(() => { sessionStorage.removeItem("shoplen-admin-token"); setToken(""); }); }
  }, [loadAll]);

  function logoutAdmin() {
    sessionStorage.removeItem("shoplen-admin-token");
    setToken("");
    setUsername("");
    setPassword("");
    setActiveView("overview");
    setSearch("");
    setOrderQuery("");
    setCustomerQuery("");
    setStatusFilter("");
    setSelectedOrder(null);
    setCustomerDraft(null);
    setCustomerPassword("");
    setProductEditorOpen(false);
    setEditing(null);
    setForm(blankProduct());
    setProductToHide(null);
    setShippingForm({ carrier: "", trackingCode: "" });
    setProducts([]);
    setOrders([]);
    setCustomers([]);
    setMovements([]);
    setAlerts([]);
    setReport(null);
    setMessage("");
    setError("");
  }

  async function login(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const result = await api<{ accessToken: string }>("/auth/login/admin", { method: "POST", body: JSON.stringify({ username, password }) });
      sessionStorage.setItem("shoplen-admin-token", result.accessToken);
      try {
        await loadAll();
        setToken(result.accessToken);
      } catch (reason) {
        sessionStorage.removeItem("shoplen-admin-token");
        throw reason;
      }
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  function changeVariant(styleIndex: number, variantIndex: number, patch: Partial<Variant>) {
    setForm(current => ({ ...current, styles: current.styles.map((style, i) => i === styleIndex
      ? { ...style, variants: style.variants.map((variant, j) => j === variantIndex ? { ...variant, ...patch } : variant) }
      : style) }));
  }

  function changeStyle(styleIndex: number, patch: Partial<StyleDraft>) {
    setForm(current => ({ ...current, styles: current.styles.map((style, i) => i === styleIndex ? { ...style, ...patch } : style) }));
  }

  function editProduct(product: Product) {
    setEditing(product.id);
    setProductEditorOpen(true);
    setForm({ name: product.name, slug: product.slug, category: product.category, material: product.material ?? "",
      description: product.description ?? "", imageUrl: product.imageUrl ?? "", sizeGuide: product.sizeGuide ?? "", active: product.active,
      price: product.price, styles: product.styles.map(style => ({ name: style.name,
        imageUrls: style.imageUrls?.length ? [...style.imageUrls] : [style.imageUrl],
        price: style.price, material: style.material,
        variants: product.variants.filter(variant => variant.styleId === style.id).map(variant => ({ ...variant })) })) });
    setActiveView("catalog"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    try {
      if (!form.name.trim()) throw new Error("Nhập tên sản phẩm.");
      if (!form.category.trim()) throw new Error("Chọn danh mục cho sản phẩm.");
      const incomplete = form.styles.findIndex(style => styleGaps(style).length > 0);
      if (incomplete >= 0) {
        const style = form.styles[incomplete];
        throw new Error(`Kiểu "${style.name.trim() || incomplete + 1}" còn thiếu ${styleGaps(style).join(", ")}.`);
      }
      const path = editing === null ? "/admin/products" : `/admin/products/${editing}`;
      const payload = {
        ...form,
        price: form.styles[0].price,
        material: form.styles[0].material,
        imageUrl: form.styles[0]?.imageUrls.find(url => url.trim()) ?? "",
        slug: form.slug || slugify(form.name) || `san-pham-${Date.now()}`,
        styles: form.styles.map(style => ({
          ...style,
          imageUrls: style.imageUrls.map(url => url.trim()).filter(Boolean),
          imageUrl: style.imageUrls.find(url => url.trim()) ?? "",
          variants: style.variants.map(variant => ({
          ...variant,
          sku: variant.sku || createSku(`${form.name}-${style.name}`, variant.color, variant.size),
        })) })),
      };
      await api(path, { method: editing === null ? "POST" : "PUT", body: JSON.stringify(payload) });
      setMessage(editing === null ? "Sản phẩm đã được tạo." : "Thay đổi sản phẩm đã được lưu.");
      setEditing(null); setForm(blankProduct()); setProductEditorOpen(false); await loadAll();
    } catch (reason) { setError((reason as Error).message); }
    finally { setBusy(false); }
  }

  async function uploadStyleImage(styleIndex: number, file?: File) {
    if (!file) return;
    setError(""); setUploading(true);
    try {
      const data = new FormData(); data.set("file", file);
      const token = sessionStorage.getItem("shoplen-admin-token");
      const response = await fetch("/api/admin/media", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không tải được ảnh lên.");
      setForm(current => ({ ...current, styles: current.styles.map((style, index) => index === styleIndex
        ? { ...style, imageUrls: [...style.imageUrls.filter(url => url.trim()), result.url] }
        : style) }));
      setMessage("Ảnh đã được tải lên.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setUploading(false); }
  }

  async function uploadStyleImages(styleIndex: number, files?: FileList | null) {
    for (const file of Array.from(files ?? [])) await uploadStyleImage(styleIndex, file);
  }

  async function uploadProductImage(file?: File) {
    if (!file) return;
    setError(""); setUploading(true);
    try {
      const data = new FormData(); data.set("file", file);
      const token = sessionStorage.getItem("shoplen-admin-token");
      const response = await fetch("/api/admin/media", { method: "POST", headers: token ? { Authorization: "Bearer " + token } : {}, body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không tải được ảnh lên.");
      setForm(current => ({ ...current, imageUrl: result.url }));
      setMessage("Ảnh đã được tải lên.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setUploading(false); }
  }

  async function hideProduct(product: Product) {
    setError(""); setProductHiding(true);
    try {
      await api(`/admin/products/${product.id}`, { method: "DELETE" });
      setProductToHide(null); setMessage("Đã ẩn sản phẩm."); await loadAll();
    } catch (reason) { setError((reason as Error).message); }
    finally { setProductHiding(false); }
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault();
    try { await api("/admin/categories", { method: "POST", body: JSON.stringify({ ...categoryForm, active: true, displayOrder: categories.length }) }); setCategoryForm({ name: "", description: "" }); setMessage("Đã thêm danh mục."); await loadAll(); }
    catch (reason) { setError((reason as Error).message); }
  }

  async function toggleCategory(category: Category) {
    try {
      await api(`/admin/categories/${category.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: category.name, description: category.description ?? "", active: !category.active, displayOrder: category.displayOrder }),
      });
      setMessage(category.active ? `Đã ẩn danh mục "${category.name}" khỏi cửa hàng.` : `Đã bật danh mục "${category.name}".`);
      await loadAll();
    } catch (reason) { setError((reason as Error).message); }
  }

  async function adjustInventory(event: FormEvent) {
    event.preventDefault();
    try { await api("/admin/inventory/adjust", { method: "POST", body: JSON.stringify(inventoryForm) }); setMessage("Đã ghi nhận giao dịch kho."); setInventoryForm({ sku: "", delta: 0, reason: "RECEIVE", note: "", lowStockThreshold: 5 }); await loadAll(); }
    catch (reason) { setError((reason as Error).message); }
  }

  async function updateStatus(order: Order, status: string) {
    try {
      if (status === "SHIPPED" && (!shippingForm.carrier.trim() || !shippingForm.trackingCode.trim())) {
        setError("Cần nhập đơn vị vận chuyển và mã vận đơn trước khi bàn giao.");
        return;
      }
      await api(`/admin/orders/${order.id}/status`, { method: "PUT", body: JSON.stringify({ status, note: status === "CANCELLED" ? "Admin hủy đơn" : "", ...(status === "SHIPPED" ? shippingForm : {}) }) });
      setShippingForm({ carrier: "", trackingCode: "" });
      setSelectedOrder(null); setMessage(`Đã cập nhật đơn ${order.orderCode}.`); await loadAll();
    } catch (reason) { setError((reason as Error).message); }
  }

  async function saveCustomer(event: FormEvent) {
    event.preventDefault();
    if (!customerDraft) return;
    setError(""); setMessage(""); setCustomerSaving(true);
    try {
      const updated = await api<Customer>(`/admin/customers/${customerDraft.id}`, {
        method: "PUT",
        body: JSON.stringify({ fullName: customerDraft.fullName, phone: customerDraft.phone }),
      });
      setCustomers(current => current.map(customer => customer.id === updated.id ? updated : customer));
      closeCustomerEditor();
      setMessage("Đã cập nhật thông tin khách hàng.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setCustomerSaving(false); }
  }

  function closeCustomerEditor() {
    setCustomerDraft(null);
    setCustomerPassword("");
  }

  async function changeCustomerPassword(event: FormEvent) {
    event.preventDefault();
    if (!customerDraft) return;
    setError(""); setMessage(""); setCustomerPasswordSaving(true);
    try {
      const result = await api<{ message: string }>(`/admin/customers/${customerDraft.id}/password`, {
        method: "PUT",
        body: JSON.stringify({ password: customerPassword }),
      });
      setCustomerPassword("");
      setMessage(result.message);
    } catch (reason) { setError((reason as Error).message); }
    finally { setCustomerPasswordSaving(false); }
  }

  async function sendCustomerPasswordReset(customer: Customer) {
    if (!window.confirm(`Gửi liên kết đặt lại mật khẩu tới ${customer.email}?`)) return;
    setError(""); setMessage(""); setResettingCustomerId(customer.id);
    try {
      const result = await api<{ message: string }>(`/admin/customers/${customer.id}/password-reset`, { method: "POST" });
      setMessage(result.message);
      if (customerDraft?.id === customer.id) closeCustomerEditor();
    } catch (reason) { setError((reason as Error).message); }
    finally { setResettingCustomerId(null); }
  }

  async function saveShop(event: FormEvent) {
    event.preventDefault();
    const fee = Number(shippingFeeInput);
    if (!Number.isInteger(fee) || fee < 0 || fee > 10_000_000) {
      setError("Phí giao hàng là số tiền VND từ 0 đến 10.000.000.");
      return;
    }
    setShopSaving(true); setError(""); setMessage("");
    try {
      const saved = await api<ShopProfile>("/admin/shop", {
        method: "PUT",
        body: JSON.stringify({ shopName: shopName.trim(), shippingFee: fee }),
      });
      setShopName(saved.shopName);
      setShippingFeeInput(String(saved.shippingFee));
      setMessage("Đã lưu tên cửa hàng và phí giao hàng.");
    } catch (reason) { setError((reason as Error).message); }
    finally { setShopSaving(false); }
  }

  const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category} ${p.styles.map(style => style.name).join(" ")} ${p.variants.map(v => v.sku).join(" ")}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const visibleOrders = useMemo(() => {
    const needle = orderQuery.trim().toLowerCase();
    return orders.filter(order => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (!needle) return true;
      const haystack = [order.orderCode, order.customerName, order.customerPhone, order.customerEmail, order.province, order.ward, order.addressLine, labels[order.status], ...order.items.flatMap(item => [item.sku, item.productName, item.styleName, item.color, item.size])].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [orders, statusFilter, orderQuery]);
  const visibleCustomers = useMemo(() => {
    const needle = customerQuery.trim().toLowerCase();
    return customers.filter(customer => {
      if (!needle) return true;
      const orderCodes = orders.filter(order => order.userId === customer.id).map(order => order.orderCode).join(" ");
      return `${customer.fullName} ${customer.email} ${customer.phone} ${orderCodes}`.toLowerCase().includes(needle);
    });
  }, [customers, orders, customerQuery]);
  const nav = [["overview", "Tổng quan", "◫"], ["store", "Cửa hàng", "⌂"], ["catalog", "Sản phẩm", "◇"], ["categories", "Danh mục", "▧"], ["orders", "Đơn hàng", "▤"], ["inventory", "Kho hàng", "▦"], ["customers", "Khách hàng", "♙"], ["reports", "Báo cáo", "⌁"]] as const;

  if (!token) return <main className="login-screen"><div className="login-art"><a className="admin-brand" href="/"><ShopWordmark name={shopName} /></a><div><p>LEN MÓC<br/>THỦ CÔNG</p><h1>Chào mừng<br/>bạn trở lại.</h1><span>Quản trị cửa hàng · Bộ sưu tập 2026</span></div><small>{shopName.toUpperCase()} — LEN MÓC THỦ CÔNG</small></div><form className="login-panel" onSubmit={login}><div className="mobile-brand"><a className="admin-brand" href="/"><ShopWordmark name={shopName} /></a></div><p className="eyebrow">KHU VỰC QUẢN TRỊ</p><h2>Đăng nhập Admin</h2><p className="muted">Dùng email hoặc tên đăng nhập của tài khoản quản trị.</p><label>Email hoặc tên đăng nhập<input value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus required aria-label="Email hoặc tên đăng nhập Admin" /></label><label>Mật khẩu<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label><div className="forgot-row"><a href="/forgot-password">Quên mật khẩu?</a><span>Chỉ tài khoản Admin</span></div><button className="primary-button" disabled={busy}>{busy ? "Đang xác thực…" : "Đăng nhập quản trị"} <span>→</span></button>{error && <p className="notice error" role="alert">{error}</p>}<p className="login-hint">Đăng nhập bằng thông tin do quản trị viên hệ thống cấp.</p></form></main>;

  return <main className="admin-app"><aside className="sidebar"><a className="admin-brand" href="/"><ShopWordmark name={shopName} /></a><div className="store-chip"><span className="store-dot"></span> Cửa hàng đang hoạt động</div><p className="nav-caption">WORKSPACE</p><nav>{nav.map(([id, label, icon]) => <button className={activeView === id ? "active" : ""} key={id} onClick={() => { setActiveView(id); setSearch(""); setProductEditorOpen(false); }}><span className="nav-icon">{icon}</span>{label}{id === "orders" && report?.pendingOrders ? <b className="nav-count">{report.pendingOrders}</b> : null}</button>)}</nav><div className="sidebar-bottom"><div className="profile-chip"><div className="avatar">{shopInitials(shopName)}</div><div><b>Quản trị viên</b><small>Quản lý cửa hàng</small></div></div><button className="logout-button" onClick={async () => { try { await api("/auth/logout", { method: "POST" }); } finally { logoutAdmin(); } }}>Đăng xuất <span>↗</span></button></div></aside>
    <section className="admin-main"><header className="top-header"><div className="breadcrumbs">{shopName.toUpperCase()} <span>/</span> {nav.find(n => n[0] === activeView)?.[1].toUpperCase()}</div><div className="header-actions"><span className="live-pill"><i/> Local workspace</span><a className="store-link" href="http://localhost:3000" target="_blank">Xem cửa hàng ↗</a></div></header>
      <div className="page-content"><div className="page-title"><div><p className="eyebrow">{activeView === "overview" ? "SUNDAY, OCTOBER 04, 2026" : `${shopName.toUpperCase()} · VẬN HÀNH`}</p><h1>{activeView === "overview" ? "Một ngày thật tốt lành." : nav.find(n => n[0] === activeView)?.[1]}</h1><p>{activeView === "overview" ? "Đây là những gì đang diễn ra tại cửa hàng của bạn." : "Vận hành cửa hàng từ một không gian duy nhất."}</p></div>{activeView === "catalog" && <button className="primary-button compact-button" onClick={() => { setEditing(null); setForm(blankProduct()); setProductEditorOpen(true); }}>＋ Thêm sản phẩm</button>}</div>
        {message && !productEditorOpen && !productToHide && <div className="notice success">{message}<button onClick={() => setMessage("")}>×</button></div>}{error && !productEditorOpen && !productToHide && <div className="notice error">{error}<button onClick={() => setError("")}>×</button></div>}
        {activeView === "store" && <section className="surface shop-settings"><div className="surface-head"><div><p className="eyebrow">CỬA HÀNG</p><h2>Tên và phí giao</h2></div></div><p className="hint">Tên này hiện trên cửa hàng và trang quản trị. Phí áp dụng cho đơn COD mới; đơn đã đặt giữ phí lúc khách đặt.</p><form onSubmit={saveShop}><label>Tên cửa hàng<input required maxLength={80} value={shopName} onChange={e => setShopName(e.target.value)} /></label><label>Phí giao hàng (₫)<input required inputMode="numeric" min={0} max={10000000} step={1000} type="number" value={shippingFeeInput} onChange={e => setShippingFeeInput(e.target.value)} /></label><button className="primary-button" disabled={shopSaving}>{shopSaving ? "Đang lưu…" : "Lưu thiết lập"}</button></form></section>}
        {activeView === "overview" && <><div className="stats-grid"><Stat label="DOANH THU ĐÃ GIAO" value={money(report?.revenue ?? 0)} foot="Đơn đã giao / hoàn thành" icon="↗"/><Stat label="ĐƠN HÀNG" value={String(report?.totalOrders ?? 0)} foot={`${report?.activeOrders ?? 0} đơn chưa hủy`} icon="▤"/><Stat label="CHỜ XÁC NHẬN" value={String(report?.pendingOrders ?? 0)} foot="Cần xử lý sớm" icon="◷"/><Stat label="SKU TỒN THẤP" value={String(report?.lowStockVariants ?? 0)} foot="Chạm ngưỡng cảnh báo" icon="◇"/></div><div className="dashboard-grid"><section className="surface"><div className="surface-head"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Đơn hàng mới</h2></div><button className="subtle-link" onClick={() => setActiveView("orders")}>Xem tất cả →</button></div><OrderTable orders={orders.slice(0, 5)} select={setSelectedOrder}/></section><section className="surface alert-surface"><div className="surface-head"><div><p className="eyebrow">INVENTORY HEALTH</p><h2>Cần bổ sung</h2></div><button className="subtle-link" onClick={() => setActiveView("inventory")}>Kho hàng →</button></div>{alerts.length ? alerts.slice(0, 5).map(a => <div className="alert-row" key={a.sku}><span className="alert-dot"/><div><b>{a.productName}</b><small>{a.sku} · {a.color} / {a.size}</small></div><strong>{a.stock} <small>còn lại</small></strong></div>) : <div className="calm-empty">Tất cả biến thể đều đủ hàng ✳</div>}</section></div><section className="surface quick-section"><div className="surface-head"><div><p className="eyebrow">QUICK ACCESS</p><h2>Đi đến công việc</h2></div></div><div className="quick-grid">{nav.slice(1).map(([id,label,icon]) => <button key={id} onClick={() => setActiveView(id)}><span>{icon}</span><b>{label}</b><i>↗</i></button>)}</div></section></>}
        {activeView === "categories" && <div className="category-admin-layout"><section className="surface"><div className="surface-head"><div><p className="eyebrow">STORE TAXONOMY</p><h2>Tạo danh mục</h2></div></div><form className="category-create-form" onSubmit={saveCategory}><label>Tên danh mục<input placeholder="Ví dụ: Áo len" required value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})}/></label><label>Mô tả ngắn<input placeholder="Mô tả cho danh mục (không bắt buộc)" value={categoryForm.description} onChange={e=>setCategoryForm({...categoryForm,description:e.target.value})}/></label><button className="primary-button">Thêm danh mục <span>→</span></button></form></section><section className="surface"><div className="surface-head"><div><p className="eyebrow">ADMIN + CUSTOMER STOREFRONT</p><h2>{categories.length} danh mục · {categories.filter(c=>c.active).length} đang hiển thị</h2></div></div><div className="category-admin-list">{[...categories].sort((a,b)=>a.displayOrder-b.displayOrder || a.name.localeCompare(b.name)).map(category=><article className="category-admin-row" key={category.id}><div><b>{category.name}</b><small>{category.description || "Chưa có mô tả"} · {products.filter(p=>p.category===category.name).length} sản phẩm</small></div><span className={`product-state ${category.active?"is-active":""}`}>{category.active?"Đang hiển thị":"Đã ẩn"}</span><button className="outline-small" onClick={()=>toggleCategory(category)}>{category.active?"Ẩn khỏi shop":"Hiện trên shop"}</button></article>)}</div>{!categories.length&&<p className="calm-empty">Tạo danh mục đầu tiên để gán sản phẩm.</p>}</section></div>}
        {activeView === "catalog" && <section className="surface catalog-list">
          <div className="catalog-toolbar">
            <div><p className="eyebrow">YOUR COLLECTION</p><h2>{products.length} sản phẩm</h2><p>Quản lý thông tin, tồn kho và trạng thái hiển thị.</p></div>
            <label className="catalog-search"><span>Tìm sản phẩm</span><input className="table-search" placeholder="Tên sản phẩm, kiểu hoặc SKU…" value={search} onChange={e => setSearch(e.target.value)}/></label>
          </div>
          <div className="table-scroll"><table className="product-table"><thead><tr><th>SẢN PHẨM</th><th>KIỂU</th><th>GIÁ BÁN</th><th>TỒN KHO</th><th>TRẠNG THÁI</th><th>THAO TÁC</th></tr></thead><tbody>{filteredProducts.map(p => {
            const prices = p.styles.map(style => style.price);
            const minimumPrice = prices.length ? Math.min(...prices) : 0;
            const maximumPrice = prices.length ? Math.max(...prices) : 0;
            const totalStock = p.variants.reduce((sum, variant) => sum + variant.stock, 0);
            const lowStock = p.variants.some(variant => variant.stock <= variant.lowStockThreshold);
            return <tr key={p.id} className="click-row" onClick={() => editProduct(p)}>
              <td><div className="product-cell"><div className="tiny-photo">{p.imageUrl ? <img src={p.imageUrl} alt=""/> : "M"}</div><div><b>{p.name}</b><small>{p.category || "Chưa phân loại"}</small></div></div></td>
              <td><div className="pw-style-chips">{p.styles.length ? p.styles.slice(0, 2).map(style => <span key={style.id}>{style.name}</span>) : <span>Chưa có kiểu</span>}{p.styles.length > 2 && <span>+{p.styles.length - 2}</span>}</div><small>{p.variants.length} SKU</small></td>
              <td><b className="product-price">{minimumPrice === maximumPrice ? money(minimumPrice) : `${money(minimumPrice)} – ${money(maximumPrice)}`}</b></td>
              <td><b className={`stock-count ${lowStock ? "stock-low" : ""}`}>{totalStock}</b><small>{lowStock ? " có size dưới ngưỡng" : " sản phẩm"}</small></td>
              <td><span className={`product-state ${p.active ? "is-active" : ""}`}>{p.active ? "Đang bán" : "Đã ẩn"}</span></td>
              <td><div className="row-actions"><button onClick={event => { event.stopPropagation(); editProduct(p); }}>Chỉnh sửa</button>{p.active && <button className="action-hide" onClick={event => { event.stopPropagation(); setError(""); setProductToHide(p); }}>Ẩn</button>}</div></td>
            </tr>;
          })}</tbody></table>{!filteredProducts.length && <p className="calm-empty">{products.length ? "Không tìm thấy sản phẩm phù hợp." : "Chưa có sản phẩm. Hãy thêm sản phẩm đầu tiên."}</p>}</div>
        </section>}
        {activeView === "orders" && <section className="surface"><div className="surface-head"><div><p className="eyebrow">ORDER WORKFLOW</p><h2>{visibleOrders.length} đơn hàng</h2></div></div><div className="lookup-bar"><label>Truy vấn đơn hàng<input value={orderQuery} onChange={e => setOrderQuery(e.target.value)} placeholder="Mã đơn, tên, điện thoại, email, SKU…" /></label><label>Trạng thái<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><OrderTable orders={visibleOrders} select={setSelectedOrder}/></section>}
        {activeView === "inventory" && <StockDesk products={products} alerts={alerts} movements={movements} form={inventoryForm} setForm={setInventoryForm} onSubmit={adjustInventory} query={inventoryQuery} setQuery={setInventoryQuery} filter={stockFilter} setFilter={setStockFilter} movementQuery={movementQuery} setMovementQuery={setMovementQuery} />}
        {activeView === "customers" && <section className="surface"><div className="surface-head"><div><p className="eyebrow">CUSTOMER DIRECTORY</p><h2>{visibleCustomers.length} khách hàng</h2></div></div><div className="lookup-bar"><label>Truy vấn khách hàng<input value={customerQuery} onChange={e => setCustomerQuery(e.target.value)} placeholder="Tên, email, số điện thoại hoặc mã đơn…" /></label></div><div className="table-scroll"><table><thead><tr><th>KHÁCH HÀNG</th><th>EMAIL</th><th>ĐIỆN THOẠI</th><th>ĐƠN</th><th>THAO TÁC</th></tr></thead><tbody>{visibleCustomers.map(c=><tr key={c.id}><td><div className="customer-cell"><span className="avatar">{c.fullName.slice(0,1).toUpperCase()}</span><b>{c.fullName}</b></div></td><td>{c.email}</td><td>{c.phone}</td><td>{orders.filter(o=>o.userId===c.id).length}</td><td><div className="customer-actions"><button type="button" onClick={() => { setOrderQuery(c.phone || c.email); setStatusFilter(""); setActiveView("orders"); }}>Xem đơn</button><button type="button" onClick={()=>{setCustomerDraft({id:c.id,email:c.email,fullName:c.fullName,phone:c.phone});setCustomerPassword("");}}>Chỉnh sửa</button><button type="button" disabled={resettingCustomerId===c.id} onClick={()=>sendCustomerPasswordReset(c)}>{resettingCustomerId===c.id?"Đang gửi…":"Gửi link reset mật khẩu"}</button></div></td></tr>)}</tbody></table>{!visibleCustomers.length&&<p className="calm-empty">{customers.length ? "Không tìm thấy khách hàng phù hợp." : "Khách đã đăng ký sẽ xuất hiện tại đây."}</p>}</div></section>}
        {activeView === "reports" && <><div className="stats-grid"><Stat label="TỔNG ĐƠN" value={String(report?.totalOrders??0)} foot="Bao gồm đơn đã hủy" icon="▤"/><Stat label="ĐƠN ĐANG XỬ LÝ" value={String(report?.activeOrders??0)} foot="Chưa ở trạng thái đã hủy" icon="◷"/><Stat label="DOANH THU ĐÃ GIAO" value={money(report?.revenue??0)} foot="Đã giao và hoàn thành" icon="↗"/><Stat label="TỒN THẤP" value={String(report?.lowStockVariants??0)} foot="Biến thể dưới ngưỡng" icon="◇"/></div><section className="surface"><div className="surface-head"><div><p className="eyebrow">REVENUE RECONCILIATION</p><h2>Đơn giao thành công</h2></div></div><OrderTable orders={orders.filter(o=>["DELIVERED","COMPLETED"].includes(o.status))} select={setSelectedOrder}/><p className="report-note">Doanh thu được tính trên đơn đã giao hoặc hoàn thành, chưa trừ phí vận chuyển/chi phí vận hành.</p></section></>}
      </div>
    </section>
    {activeView === "catalog" && productEditorOpen && <div className="product-modal-backdrop" role="presentation" onKeyDown={event => { if (event.key === "Escape") { setProductEditorOpen(false); setEditing(null); setForm(blankProduct()); } }} onMouseDown={event => { if (event.target === event.currentTarget) { setProductEditorOpen(false); setEditing(null); setForm(blankProduct()); } }}>
      <div className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-editor-title">
        {message && <div className="notice success product-modal-notice">{message}<button onClick={() => setMessage("")}>×</button></div>}
        {error && <div className="notice error product-modal-notice" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
        <ProductStyleEditor
          key={editing ?? "new"}
          form={form} setForm={setForm} editing={editing} categories={categories} busy={busy} uploading={uploading}
          onSubmit={saveProduct} onCancel={() => { setProductEditorOpen(false); setEditing(null); setForm(blankProduct()); setError(""); }}
          changeStyle={changeStyle} changeVariant={changeVariant} uploadStyleImages={uploadStyleImages}
        />
      </div>
    </div>}
    {activeView === "catalog" && productToHide && <div className="product-modal-backdrop product-confirm-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !productHiding) setProductToHide(null); }}>
      <section className="product-confirm" role="alertdialog" aria-modal="true" aria-labelledby="hide-product-title" aria-describedby="hide-product-description">
        <span className="confirm-icon">!</span><p className="eyebrow">XÁC NHẬN THAO TÁC</p><h2 id="hide-product-title">Ẩn sản phẩm này?</h2>
        <p id="hide-product-description"><b>{productToHide.name}</b> sẽ không còn hiển thị trên cửa hàng. Dữ liệu và lịch sử kho vẫn được giữ lại.</p>
        {error && <div className="notice error product-modal-notice" role="alert">{error}</div>}
        <div className="product-editor-actions"><button type="button" className="outline-small" disabled={productHiding} onClick={() => setProductToHide(null)}>Quay lại</button><button type="button" className="danger-button" disabled={productHiding} onClick={() => void hideProduct(productToHide)}>{productHiding ? "Đang ẩn…" : "Ẩn sản phẩm"}</button></div>
      </section>
    </div>}
    {selectedOrder && <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedOrder(null);}}><aside className="order-drawer"><button className="drawer-close" onClick={()=>setSelectedOrder(null)}>×</button><p className="eyebrow">ORDER DETAILS</p><h2>{selectedOrder.orderCode}</h2><span className={`order-state state-${selectedOrder.status.toLowerCase()}`}>{labels[selectedOrder.status]??selectedOrder.status}</span><div className="drawer-block"><h3>Người nhận</h3><b>{selectedOrder.customerName}</b><span>{selectedOrder.customerPhone} · {selectedOrder.customerEmail}</span><span>{[selectedOrder.addressLine, selectedOrder.ward, selectedOrder.province].filter(Boolean).join(", ")}</span>{selectedOrder.note&&<small>Ghi chú: {selectedOrder.note}</small>}</div><div className="drawer-block"><h3>Sản phẩm</h3>{selectedOrder.items.map(i=><div className="drawer-item" key={i.sku}><span>{i.productName}<small>{i.sku} · {i.color}/{i.size} × {i.quantity}</small></span><b>{money(i.lineTotal)}</b></div>)}</div><div className="drawer-total"><span>Tạm tính</span><b>{money(selectedOrder.subtotal)}</b><span>Phí vận chuyển</span><b>{money(selectedOrder.shippingFee)}</b><strong>Tổng COD</strong><strong>{money(selectedOrder.total)}</strong></div>{selectedOrder.carrier&&<div className="drawer-block"><h3>Vận chuyển</h3><b>{selectedOrder.carrier}</b><span>Mã vận đơn: {selectedOrder.trackingCode}</span></div>}<div className="drawer-block"><h3>Lịch sử trạng thái</h3>{selectedOrder.history.map((h,i)=><div className="history-event" key={i}><b>{labels[h.toStatus]??h.toStatus}</b><small>{new Date(h.createdAt).toLocaleString("vi-VN")} · {h.actor}</small>{h.note&&<span>{h.note}</span>}</div>)}</div>{transitions[selectedOrder.status]?.length&&<div className="drawer-actions">{transitions[selectedOrder.status].includes("SHIPPED")&&<div className="shipping-inputs"><label>Đơn vị vận chuyển<input required placeholder="Ví dụ: GHN" value={shippingForm.carrier} onChange={e=>setShippingForm({...shippingForm,carrier:e.target.value})}/></label><label>Mã vận đơn<input required value={shippingForm.trackingCode} onChange={e=>setShippingForm({...shippingForm,trackingCode:e.target.value})}/></label></div>}{transitions[selectedOrder.status].map(next=><button className={next==="CANCELLED"?"danger-button":"primary-button"} key={next} onClick={()=>updateStatus(selectedOrder,next)}>{next==="CANCELLED"?"Hủy đơn":`Chuyển: ${labels[next]}`}</button>)}</div>}</aside></div>}
    {customerDraft && <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)closeCustomerEditor();}}><aside className="order-drawer customer-drawer"><button className="drawer-close" type="button" onClick={closeCustomerEditor}>×</button><p className="eyebrow">CUSTOMER PROFILE</p><h2>Chỉnh sửa khách hàng</h2><p className="customer-email">{customerDraft.email}</p><form className="customer-editor-form" onSubmit={saveCustomer}><label>Họ và tên<input required maxLength={120} value={customerDraft.fullName} onChange={e=>setCustomerDraft({...customerDraft,fullName:e.target.value})}/></label><label>Số điện thoại<input required maxLength={40} value={customerDraft.phone} onChange={e=>setCustomerDraft({...customerDraft,phone:e.target.value})}/></label><button className="primary-button" disabled={customerSaving}>{customerSaving?"Đang lưu…":"Lưu thông tin"} <span>→</span></button></form><form className="customer-password-form" onSubmit={changeCustomerPassword}><label>Mật khẩu mới<input type="password" required minLength={10} maxLength={100} autoComplete="new-password" value={customerPassword} onChange={e=>setCustomerPassword(e.target.value)}/></label><p>Ít nhất 10 ký tự. Sau khi đổi, khách sẽ cần đăng nhập lại.</p><button type="submit" className="outline-small" disabled={customerPasswordSaving}>{customerPasswordSaving?"Đang cập nhật…":"Cập nhật mật khẩu"}</button></form><div className="customer-reset-note"><b>Đặt lại mật khẩu</b><p>Khách sẽ nhận email có liên kết đặt mật khẩu mới. Liên kết có hiệu lực trong 30 phút.</p><button type="button" className="outline-small" disabled={resettingCustomerId===customerDraft.id} onClick={()=>{const customer=customers.find(item=>item.id===customerDraft.id);if(customer)void sendCustomerPasswordReset(customer);}}>{resettingCustomerId===customerDraft.id?"Đang gửi…":"Gửi link reset mật khẩu"}</button></div></aside></div>}
  </main>;
}

const stockReasonText: Record<string, string> = { RECEIVE: "Nhập kho", ADJUSTMENT: "Điều chỉnh", DAMAGED: "Hàng lỗi / mất", ORDER_RESERVED: "Giữ cho đơn", ORDER_CANCELLED: "Hoàn khi hủy", INITIAL_STOCK: "Tồn đầu kỳ", ADMIN_EDIT: "Sửa sản phẩm" };

function StockDesk({ products, alerts, movements, form, setForm, onSubmit, query, setQuery, filter, setFilter, movementQuery, setMovementQuery }: {
  products: Product[]; alerts: Alert[]; movements: Movement[];
  form: { sku: string; delta: number; reason: string; note: string; lowStockThreshold: number };
  setForm: (form: { sku: string; delta: number; reason: string; note: string; lowStockThreshold: number }) => void;
  onSubmit: (event: FormEvent) => void;
  query: string; setQuery: (value: string) => void;
  filter: "" | "low" | "out"; setFilter: (value: "" | "low" | "out") => void;
  movementQuery: string; setMovementQuery: (value: string) => void;
}) {
  const rows = products.flatMap(product => product.variants.map(variant => ({
    sku: variant.sku, productName: product.name, styleName: variant.styleName ?? "", color: variant.color, size: variant.size, stock: variant.stock, lowStockThreshold: variant.lowStockThreshold,
  })));
  const needle = query.trim().toLowerCase();
  const visible = rows.filter(row => {
    if (filter === "out" && row.stock !== 0) return false;
    if (filter === "low" && row.stock > row.lowStockThreshold) return false;
    return !needle || `${row.productName} ${row.styleName} ${row.color} ${row.size} ${row.sku}`.toLowerCase().includes(needle);
  });
  const picked = rows.find(row => row.sku === form.sku);
  const movementNeedle = movementQuery.trim().toLowerCase();
  const history = movements.filter(movement => !movementNeedle || `${movement.sku} ${movement.reason} ${movement.note} ${movement.actor} ${movement.referenceCode ?? ""}`.toLowerCase().includes(movementNeedle));
  const outCount = rows.filter(row => row.stock === 0).length;
  const lowCount = rows.filter(row => row.stock > 0 && row.stock <= row.lowStockThreshold).length;
  return <div className="stock-page">
    <div className="stock-stats">
      <article><span>SKU</span><b>{rows.length}</b></article>
      <article><span>Hết hàng</span><b>{outCount}</b></article>
      <article><span>Dưới ngưỡng</span><b>{lowCount}</b></article>
      <article><span>Cảnh báo</span><b>{alerts.length}</b></article>
    </div>
    <div className="stock-layout">
      <section className="surface stock-list">
        <div className="surface-head"><div><p className="eyebrow">TỒN THEO SKU</p><h2>Kho đang có</h2></div></div>
        <div className="lookup-bar"><label>Tìm trong kho<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên sản phẩm, SKU, màu, size…" /></label></div>
        <div className="stock-filters" role="tablist">
          <button type="button" className={filter === "" ? "is-on" : ""} onClick={() => setFilter("")}>Tất cả</button>
          <button type="button" className={filter === "low" ? "is-on" : ""} onClick={() => setFilter("low")}>Dưới ngưỡng</button>
          <button type="button" className={filter === "out" ? "is-on" : ""} onClick={() => setFilter("out")}>Hết hàng</button>
        </div>
        <div className="table-scroll"><table className="stock-table"><thead><tr><th>SẢN PHẨM</th><th>SKU</th><th>TỒN</th><th></th></tr></thead><tbody>{visible.map(row => <tr key={row.sku} className={row.stock === 0 ? "is-out" : row.stock <= row.lowStockThreshold ? "is-low" : ""}><td><b>{row.productName}</b><small>{[row.styleName, row.color, row.size].filter(Boolean).join(" · ")}</small></td><td>{row.sku}</td><td><b>{row.stock}</b><small>ngưỡng {row.lowStockThreshold}</small></td><td><button type="button" onClick={() => setForm({ ...form, sku: row.sku, lowStockThreshold: row.lowStockThreshold })}>Điều chỉnh</button></td></tr>)}</tbody></table>{!visible.length && <p className="calm-empty">{rows.length ? "Không có SKU phù hợp." : "Chưa có biến thể trong kho."}</p>}</div>
      </section>
      <section className="surface stock-form">
        <div className="surface-head"><div><p className="eyebrow">ĐIỀU CHỈNH</p><h2>Ghi nhận kho</h2></div></div>
        <form className="inventory-form" onSubmit={onSubmit}>
          <label>SKU<select required value={form.sku} onChange={e => { const row = rows.find(item => item.sku === e.target.value); setForm({ ...form, sku: e.target.value, lowStockThreshold: row?.lowStockThreshold ?? form.lowStockThreshold }); }}><option value="">Chọn SKU</option>{rows.map(row => <option key={row.sku} value={row.sku}>{row.sku} · {row.color || row.styleName} / {row.size} · còn {row.stock}</option>)}</select></label>
          {picked && <p className="stock-picked">{picked.productName}{picked.styleName ? ` · ${picked.styleName}` : ""} · đang còn <b>{picked.stock}</b></p>}
          <div className="input-pair"><label>Số lượng tăng / giảm<input required type="number" value={form.delta} onChange={e => setForm({ ...form, delta: Number(e.target.value) })} /></label><label>Ngưỡng tồn thấp<input required type="number" min="0" value={form.lowStockThreshold} onChange={e => setForm({ ...form, lowStockThreshold: Number(e.target.value) })} /></label></div>
          <label>Loại giao dịch<select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}><option value="RECEIVE">Nhập kho</option><option value="ADJUSTMENT">Điều chỉnh</option><option value="DAMAGED">Hàng lỗi / mất</option></select></label>
          <label>Lý do<input required value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Vì sao thay đổi tồn" /></label>
          <button className="primary-button">Ghi giao dịch kho <span>→</span></button>
        </form>
      </section>
    </div>
    <section className="surface">
      <div className="surface-head"><div><p className="eyebrow">LỊCH SỬ</p><h2>Giao dịch gần đây</h2></div></div>
      <div className="lookup-bar"><label>Lọc lịch sử<input value={movementQuery} onChange={e => setMovementQuery(e.target.value)} placeholder="SKU, lý do, người thực hiện…" /></label></div>
      <div className="table-scroll"><table><thead><tr><th>THỜI GIAN</th><th>SKU</th><th>THAY ĐỔI</th><th>LÝ DO</th><th>NGƯỜI THỰC HIỆN</th></tr></thead><tbody>{history.map(movement => <tr key={movement.id}><td>{new Date(movement.createdAt).toLocaleString("vi-VN")}</td><td><b>{movement.sku}</b></td><td className={movement.quantityDelta > 0 ? "delta-positive" : "delta-negative"}>{movement.quantityDelta > 0 ? "+" : ""}{movement.quantityDelta}</td><td>{stockReasonText[movement.reason] ?? movement.reason}<small>{movement.note}</small></td><td>{movement.actor}</td></tr>)}</tbody></table>{!history.length && <p className="calm-empty">{movements.length ? "Không có giao dịch phù hợp." : "Chưa có giao dịch."}</p>}</div>
    </section>
  </div>;
}

function ShopWordmark({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Cuti";
  const rest = parts.slice(1).join(" ");
  return <>{first}{rest ? <> <span>{rest}</span></> : null}</>;
}

function shopInitials(name: string) {
  return name.trim().split(/\s+/).filter(Boolean).map(part => part[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "CM";
}

function Stat({ label, value, foot, icon }: { label: string; value: string; foot: string; icon: string }) {
  return <article className="stat-card"><div className="stat-top"><span>{label}</span><i>{icon}</i></div><strong>{value}</strong><small>{foot}</small></article>;
}

function OrderTable({ orders, select }: { orders: Order[]; select: (order: Order) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>MÃ ĐƠN</th><th>KHÁCH HÀNG</th><th>NGÀY ĐẶT</th><th>TỔNG TIỀN</th><th>TRẠNG THÁI</th><th></th></tr></thead><tbody>{orders.map(order=><tr key={order.id} onClick={()=>select(order)} className="click-row"><td><b>{order.orderCode}</b><small>{order.items.length} mặt hàng</small></td><td>{order.customerName}<small>{order.customerPhone}</small></td><td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td><td>{money(order.total)}</td><td><span className={`order-state state-${order.status.toLowerCase()}`}>{labels[order.status]??order.status}</span></td><td>↗</td></tr>)}</tbody></table>{!orders.length&&<p className="calm-empty">Chưa có đơn hàng phù hợp.</p>}</div>;
}
