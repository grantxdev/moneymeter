import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const instrumentSans = localFont({
  src: [
    { path: "../fonts/InstrumentSans-Variable.woff2", weight: "400 700", style: "normal" },
    { path: "../fonts/InstrumentSans-Italic-Variable.woff2", weight: "400 700", style: "italic" },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Moneymeter",
  description: "A constitution for money",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={instrumentSans.className}>
      <body>{children}</body>
    </html>
  );
}
