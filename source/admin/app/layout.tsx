import type { Metadata } from "next";
import "./style.css";
import "./style-product-styles.css";

export const metadata: Metadata = { title: "Cuti Mango | Quản trị", description: "Không gian vận hành cửa hàng Cuti Mango" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
