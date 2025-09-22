import "./globals.css";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white">
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}
