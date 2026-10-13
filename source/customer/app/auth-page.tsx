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
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Không thể thực hiện yêu cầu.");
      setMessage(result.message);
    } catch (reason) { setError((reason as Error).message); }
  }

  return <main className="auth-shell"><section className="auth-card"><a className="wordmark" href="/"><ShopWordmark name={shopName} /></a><p className="overline">{reset ? "SECURE YOUR ACCOUNT" : "ACCOUNT RECOVERY"}</p><h1>{reset ? <>Mật khẩu<br/><i>mới.</i></> : <>Lấy lại quyền<br/><i>truy cập.</i></>}</h1><p>{reset ? "Chọn mật khẩu mới dài ít nhất 10 ký tự. Liên kết chỉ dùng được một lần và hết hạn sau 30 phút." : "Nhập email đăng ký. Nếu email tồn tại, chúng mình sẽ gửi liên kết đặt lại mật khẩu."}</p><form className="form-stack" onSubmit={submit}>{reset ? <label>Mật khẩu mới<input type="password" autoComplete="new-password" minLength={10} maxLength={100} required value={password} onChange={e => setPassword(e.target.value)} /></label> : <label>Email đăng ký<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>}<button className="dark-button full">{reset ? "Đổi mật khẩu" : "Gửi liên kết đặt lại"}</button></form>{message && <p className="form-message" role="status">{message}</p>}{error && <p className="form-message" role="alert">{error}</p>}<p><a href="/">← Trở về {shopName}</a></p></section></main>;
}

function ShopWordmark({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "Cuti";
  const rest = parts.slice(1).join(" ");
  return <>{first}{rest ? <> <span>{rest}</span></> : null}</>;
}
