import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "RiseLoops | Intelligent Technology. Secure by Design.",
  description:
    "RiseLoops builds secure, intelligent enterprise software products across privacy, security, governance, and digital operations.",
  openGraph: {
    title: "RiseLoops | Intelligent Technology. Secure by Design.",
    description:
      "RiseLoops builds secure, intelligent enterprise software products across privacy, security, governance, and digital operations.",
    siteName: "RiseLoops",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RiseLoops | Intelligent Technology. Secure by Design.",
    description:
      "RiseLoops builds secure, intelligent enterprise software products across privacy, security, governance, and digital operations.",
  },
  metadataBase: new URL("https://riseloops.sa"),
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans bg-ink text-white antialiased selection:bg-accent/30">
        {children}
      </body>
    </html>
  );
}
