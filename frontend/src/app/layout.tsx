import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Platforma – Food Delivery & Events",
  description: "Discover restaurants with Zesty or book events with Eventra — all in one platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="zesty">
      <body>
        {children}
      </body>
    </html>
  );
}
