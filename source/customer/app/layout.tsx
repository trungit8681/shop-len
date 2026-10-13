import type { Metadata } from "next";
import "./style.css";
import "./style-product-styles.css";
import "./style-customer-flow.css";

export const metadata: Metadata = { title: "Cuti Mango — Len móc thủ công", description: "Túi, áo và phụ kiện len móc tay của Cuti Mango." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
