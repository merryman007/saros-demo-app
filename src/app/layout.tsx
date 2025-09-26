import "./globals.css";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WalletProviders } from "@/components/providers/wallet-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-black text-white">
        <WalletProviders>
          <DashboardLayout>{children}</DashboardLayout>
        </WalletProviders>
      </body>
    </html>
  );
}
