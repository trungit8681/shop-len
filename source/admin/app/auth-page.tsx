"use client";

import { FormEvent, useEffect, useState } from "react";

export default function AuthPage({ reset }: { reset: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [shopName, setShopName] = useState("Cuti Mango");
  useEffect(() => { setToken(new URLSearchParams(window.location.search).get("token") ?? ""); }, []);
  useEffect(() => {
    fetch("/api/shop").then(response => response.ok ? response.json() : null).then(shop => {
      if (shop?.shopName) setShopName(shop.shopName);
    }).catch(() => undefined);
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const response = await fetch("/api/auth/" + (reset ? "reset-password" : "forgot-password"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { token, password } : { email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? "Không thể xử lý yêu cầu.");
      setMessage(body.message);
    } catch (reason) { setError((reason as Error).message); }
  }
  return <main className="auth-shell"><section className="auth-card"><a className="admin-brand" href="/"><ShopWordmark name={shopName} /></a><p className="eyebrow">{reset ? "SECURE ADMIN ACCESS" : "ACCOUNT RECOVERY"}</p><h1>{reset ? <>Mật khẩu<br/><i>mới.</i></> : <>Khôi phục<br/><i>truy cập.</i></>}</h1><p>{reset ? "Đặt mật khẩu mới dài tối thiểu 10 ký tự. Link chỉ dùng một lần và hết hạn sau 30 phút." : "Nhập email Admin đã đăng ký. Nếu email tồn tại, liên kết bảo mật sẽ được gửi tới hộp thư."}</p><form className="form-stack" onSubmit={submit}>{reset ? <label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={10} maxLength={100} required value={password} onChange={e=>setPassword(e.target.value)}/></label> : <label>Email Admin<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}<button className="primary-button">{reset ? "Cập nhật mật khẩu" : "Gửi liên kết đặt lại"} <span>→</span></button></form>{message&&<p className="notice success">{message}</p>}{error&&<p className="notice error">{error}</p>}<p><a href="/">← Trở về đăng nhập</a></p></section></main>;
}

function ShopWordmark({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Cuti";
  const rest = parts.slice(1).join(" ");
  return <>{first}{rest ? <> <span>{rest}</span></> : null}</>;
}
