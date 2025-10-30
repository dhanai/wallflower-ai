import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallflower AI - Custom T-Shirt Designs",
  description: "Create custom t-shirt designs with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}