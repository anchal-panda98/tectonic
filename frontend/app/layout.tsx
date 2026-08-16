import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tectonica — Explore a living Earth",
  description: "An interactive globe for understanding tectonic plates and geological change.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
