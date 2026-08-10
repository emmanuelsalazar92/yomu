import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const protocol = incoming.get("x-forwarded-proto") || "http";
  const host = incoming.get("x-forwarded-host") || incoming.get("host") || "localhost:3000";
  const base = new URL(`${protocol}://${host}`);
  const description = "Práctica infantil de vocales y lectura inicial, tranquila y adaptativa.";
  return {
    metadataBase: base,
    title: { default: "Yomu — Aprender a leer jugando", template: "%s · Yomu" },
    description,
    applicationName: "Yomu",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/yomu-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/yomu-512.png", sizes: "512x512", type: "image/png" }
      ],
      apple: [{ url: "/icons/yomu-180.png", sizes: "180x180", type: "image/png" }],
      shortcut: "/icons/yomu-192.png"
    },
    appleWebApp: { capable: true, title: "Yomu", statusBarStyle: "default" },
    other: { "apple-mobile-web-app-capable": "yes" },
    openGraph: {
      title: "Yomu",
      description,
      type: "website",
      images: [
        { url: "/og.png", width: 1536, height: 1024, alt: "Yomu — Pequeñas letras, grandes logros" }
      ]
    },
    twitter: { card: "summary_large_image", title: "Yomu", description, images: ["/og.png"] }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffaf2"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
