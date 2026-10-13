"use client";

import { Dispatch, DragEvent, FormEvent, SetStateAction, useState } from "react";

export type Variant = { sku: string; color: string; size: string; stock: number; lowStockThreshold: number; styleId?: number; styleName?: string; styleImageUrl?: string };
export type ProductStyle = { id: number; name: string; imageUrl: string; imageUrls: string[]; price: number; material: string };
export type StyleDraft = { name: string; imageUrls: string[]; price: number; material: string; variants: Variant[] };
export type ProductDraft = { name: string; slug: string; category: string; material: string; description: string; imageUrl: string; sizeGuide: string; active: boolean; price: number; styles: StyleDraft[] };

const QUICK_SIZES = ["S", "M", "L", "XL"];

export const blankVariant = (): Variant => ({ sku: "", color: "", size: "", stock: 0, lowStockThreshold: 5 });
export const blankStyle = (name = "Kiểu mặc định"): StyleDraft => ({ name, imageUrls: [], price: 0, material: "", variants: [blankVariant()] });
export const blankProduct = (): ProductDraft => ({ name: "", slug: "", category: "", material: "", description: "", imageUrl: "", sizeGuide: "", active: true, price: 0, styles: [blankStyle()] });

const formatVndInput = (value: number) => value ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value) : "";
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
const imagesOf = (style: StyleDraft) => style.imageUrls.map(url => url.trim()).filter(Boolean);

export function styleGaps(style: StyleDraft) {
  const gaps: string[] = [];
  if (!style.name.trim()) gaps.push("tên");
  if (!imagesOf(style).length) gaps.push("ảnh");
  if (style.price <= 0) gaps.push("giá");
  if (!style.material.trim()) gaps.push("chất liệu");
  if (!style.variants.length || style.variants.some(variant => !variant.size.trim())) gaps.push("kích cỡ");
  return gaps;
}

export function ProductStyleEditor({ form, setForm, editing, categories, busy, uploading, onSubmit, onCancel, changeStyle, changeVariant, uploadStyleImages }: {
  form: ProductDraft;
  setForm: Dispatch<SetStateAction<ProductDraft>>;
  editing: number | null;
  categories: { id: number; name: string }[];
  busy: boolean;
  uploading: boolean;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
  changeStyle: (index: number, patch: Partial<StyleDraft>) => void;
  changeVariant: (styleIndex: number, variantIndex: number, patch: Partial<Variant>) => void;
  uploadStyleImages: (index: number, files?: FileList | null) => Promise<void>;
}) {
  const [panel, setPanel] = useState<"info" | number>("info");
  const styleIndex = typeof panel === "number" && form.styles[panel] ? panel : null;
  const activeStyle = styleIndex === null ? null : form.styles[styleIndex];

  function addStyle() {
    const next = form.styles.length;
    setForm(current => ({ ...current, styles: [...current.styles, blankStyle(`Kiểu ${current.styles.length + 1}`)] }));
    setPanel(next);
  }

  function removeStyle(index: number) {
    setForm(current => ({ ...current, styles: current.styles.filter((_, i) => i !== index) }));
    setPanel(current => {
      if (current === "info") return current;
      if (current === index) return index > 0 ? index - 1 : "info";
      return current > index ? current - 1 : current;
    });
  }

  return <form className="surface product-editor product-workspace" onSubmit={onSubmit}>
    <div className="surface-head product-editor-heading pw-head">
      <div>
        <p className="eyebrow">{editing === null ? "PRODUCT SETUP" : "EDIT DETAILS"}</p>
        <h2 id="product-editor-title">{editing === null ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}</h2>
        <p>Điền thông tin chung, rồi chọn từng kiểu để gắn ảnh, giá và tồn theo size.</p>
      </div>
      <div className="pw-head-actions">
        <label className="pw-switch"><input type="checkbox" checked={form.active} onChange={e => setForm(current => ({ ...current, active: e.target.checked }))}/><span>{form.active ? "Đang bán" : "Đang ẩn"}</span></label>
        <button type="button" className="drawer-close" aria-label="Đóng cửa sổ" onClick={onCancel}>×</button>
      </div>
    </div>
    <div className="pw-body">
      <nav className="pw-rail" aria-label="Các phần của sản phẩm">
        <button type="button" className={`pw-nav ${panel === "info" ? "is-on" : ""}`} onClick={() => setPanel("info")}>
          <span>
            <b>Thông tin chung</b>
            <small>{form.name.trim() || "Chưa đặt tên"}{form.category ? ` · ${form.category}` : ""}</small>
          </span>
        </button>
        <p className="pw-rail-label">Kiểu sản phẩm</p>
        {form.styles.map((style, index) => {
          const gaps = styleGaps(style);
          const cover = imagesOf(style)[0];
          const stock = style.variants.reduce((sum, variant) => sum + variant.stock, 0);
          return <button type="button" key={index} className={`pw-style ${styleIndex === index ? "is-on" : ""}`} onClick={() => setPanel(index)}>
            <span className="pw-cover">{cover ? <img src={cover} alt=""/> : index + 1}</span>
            <span>
              <b>{style.name.trim() || `Kiểu ${index + 1}`}</b>
              <small>{style.price > 0 ? money(style.price) : "Chưa có giá"} · {stock} tồn</small>
              {gaps.length > 0 && <em>Thiếu {gaps.join(", ")}</em>}
            </span>
          </button>;
        })}
        <button type="button" className="pw-add" onClick={addStyle}>＋ Thêm kiểu</button>
      </nav>
      <div className="pw-main">
        {activeStyle === null || styleIndex === null ? <section className="pw-pane">
          <h3>Thông tin khách sẽ thấy</h3>
          <label>Tên sản phẩm<input required value={form.name} placeholder="Ví dụ: Áo len ôm họa tiết" onChange={e => setForm(current => ({ ...current, name: e.target.value }))}/></label>
          <label>Danh mục<select required value={form.category} onChange={e => setForm(current => ({ ...current, category: e.target.value }))}><option value="">Chọn danh mục</option>{categories.map(category => <option key={category.id}>{category.name}</option>)}</select></label>
          <label>Mô tả<textarea rows={4} placeholder="Chất liệu cảm nhận, form dáng, cách phối." value={form.description} onChange={e => setForm(current => ({ ...current, description: e.target.value }))}/></label>
          <label>Hướng dẫn chọn size<textarea rows={3} placeholder="Ví dụ: Size M phù hợp 50–60 kg" value={form.sizeGuide} onChange={e => setForm(current => ({ ...current, sizeGuide: e.target.value }))}/></label>
        </section> : <StylePane
          key={styleIndex}
          style={activeStyle}
          styleIndex={styleIndex}
          editing={editing}
          uploading={uploading}
          canRemove={form.styles.length > 1}
          changeStyle={changeStyle}
          changeVariant={changeVariant}
          uploadStyleImages={uploadStyleImages}
          removeStyle={() => removeStyle(styleIndex)}
        />}
      </div>
    </div>
    <div className="product-editor-actions pw-foot">
      <p>{form.styles.length} kiểu · {form.styles.reduce((sum, style) => sum + style.variants.length, 0)} SKU</p>
      <div>
        <button type="button" className="outline-small" onClick={onCancel}>Hủy</button>
        <button className="primary-button" disabled={busy || uploading}>{busy ? "Đang lưu…" : editing === null ? "Tạo sản phẩm" : "Lưu thay đổi"} <span>→</span></button>
      </div>
    </div>
  </form>;
}

function StylePane({ style, styleIndex, editing, uploading, canRemove, changeStyle, changeVariant, uploadStyleImages, removeStyle }: {
  style: StyleDraft;
  styleIndex: number;
  editing: number | null;
  uploading: boolean;
  canRemove: boolean;
  changeStyle: (index: number, patch: Partial<StyleDraft>) => void;
  changeVariant: (styleIndex: number, variantIndex: number, patch: Partial<Variant>) => void;
  uploadStyleImages: (index: number, files?: FileList | null) => Promise<void>;
  removeStyle: () => void;
}) {
  const [link, setLink] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const images = imagesOf(style);

  function setImages(next: string[]) {
    changeStyle(styleIndex, { imageUrls: next });
  }

  function addLink() {
    const url = link.trim();
    if (!url) return;
    setImages([...images, url]);
    setLink("");
  }

  function addSize(size = "") {
    const duplicate = size && style.variants.some(variant => !variant.color.trim() && variant.size.trim().toLowerCase() === size.toLowerCase());
    if (duplicate) return;
    changeStyle(styleIndex, { variants: [...style.variants, { ...blankVariant(), size }] });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragOver(false);
    void uploadStyleImages(styleIndex, event.dataTransfer.files);
  }

  return <section className="pw-pane">
    <div className="pw-pane-head">
      <h3>{style.name.trim() || `Kiểu ${styleIndex + 1}`}</h3>
      {canRemove && <button type="button" className="remove-variant" onClick={removeStyle}>Xóa kiểu này</button>}
    </div>
    <div className="pw-style-fields">
      <label>Tên kiểu<input required maxLength={120} placeholder="Ví dụ: Ếch, Bò sữa, Gấu" value={style.name} onChange={e => changeStyle(styleIndex, { name: e.target.value })}/></label>
      <label>Giá bán (VND)<input required type="text" inputMode="numeric" value={formatVndInput(style.price)} onChange={e => changeStyle(styleIndex, { price: Number(e.target.value.replace(/\D/g, "")) })}/></label>
      <label>Chất liệu<input required maxLength={255} placeholder="Len merino, cotton…" value={style.material} onChange={e => changeStyle(styleIndex, { material: e.target.value })}/></label>
    </div>
    <div className="pw-block">
      <div className="pw-block-head"><h3>Ảnh kiểu này</h3><small>JPEG, PNG hoặc WebP, tối đa 5 MB. Ảnh đầu tiên là ảnh bìa.</small></div>
      <div className="pw-gallery">
        {images.map((url, imageIndex) => <figure key={`${url}-${imageIndex}`}>
          <img src={url} alt={`${style.name || "Kiểu"} · ảnh ${imageIndex + 1}`}/>
          {imageIndex === 0 && <figcaption>Bìa</figcaption>}
          <button type="button" aria-label={`Gỡ ảnh ${imageIndex + 1}`} onClick={() => setImages(images.filter((_, index) => index !== imageIndex))}>×</button>
        </figure>)}
        <label className={`pw-drop ${dragOver ? "is-over" : ""}`} onDragOver={event => { event.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={e => { void uploadStyleImages(styleIndex, e.target.files); e.currentTarget.value = ""; }}/>
          <b>{uploading ? "Đang tải…" : "Thả ảnh hoặc bấm để chọn"}</b>
          <small>Có thể chọn nhiều ảnh một lúc</small>
        </label>
      </div>
      <div className="pw-link">
        <input type="text" aria-label="URL ảnh" placeholder="Hoặc dán URL ảnh (https://… hoặc /api/media/…)" value={link} onChange={e => setLink(e.target.value)} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); addLink(); } }}/>
        <button type="button" className="outline-small" onClick={addLink}>Thêm URL</button>
      </div>
    </div>
    <div className="pw-block">
      <div className="pw-block-head"><h3>Màu và kích cỡ</h3><small>Mỗi dòng là một SKU. Mã SKU giữ nguyên sau khi lưu để không đứt lịch sử kho.</small></div>
      <div className="pw-quick">
        {QUICK_SIZES.map(size => <button type="button" key={size} onClick={() => addSize(size)}>+ {size}</button>)}
        <button type="button" onClick={() => addSize()}>+ Size khác</button>
      </div>
      <div className="pw-table-scroll">
        <table className="pw-variants">
          <thead><tr><th>Màu</th><th>Kích cỡ</th><th>Tồn</th><th>Ngưỡng cảnh báo</th><th></th></tr></thead>
          <tbody>
            {style.variants.map((variant, variantIndex) => <tr key={variantIndex}>
              <td><input aria-label="Màu sắc" maxLength={120} placeholder="Không bắt buộc" value={variant.color} onChange={e => changeVariant(styleIndex, variantIndex, { color: e.target.value })}/>{editing !== null && variant.sku ? <small className="pw-sku">{variant.sku}</small> : <small className="pw-sku">SKU tự tạo khi lưu</small>}</td>
              <td><input aria-label="Kích cỡ" required maxLength={120} placeholder="S, M, 1–2 tuổi…" value={variant.size} onChange={e => changeVariant(styleIndex, variantIndex, { size: e.target.value })}/></td>
              <td><input aria-label="Tồn kho" type="number" min="0" value={variant.stock} onChange={e => changeVariant(styleIndex, variantIndex, { stock: Number(e.target.value) })}/></td>
              <td><input aria-label="Ngưỡng cảnh báo" type="number" min="0" value={variant.lowStockThreshold} onChange={e => changeVariant(styleIndex, variantIndex, { lowStockThreshold: Number(e.target.value) })}/></td>
              <td>{style.variants.length > 1 && <button type="button" className="remove-variant" onClick={() => changeStyle(styleIndex, { variants: style.variants.filter((_, index) => index !== variantIndex) })}>Xóa</button>}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}
