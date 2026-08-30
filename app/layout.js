import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Warranty Vault",
  description: "Never let your warranty expire in silence",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

import { ThemeProvider } from "./theme-provider";
import SessionGuard from "./session-guard";
import VaultLock from "./vault-lock";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider />
        <SessionGuard />
        <VaultLock />
        {children}
      </body>
    </html>
  );
}
