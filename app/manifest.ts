import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yomu — Aprender a leer jugando",
    short_name: "Yomu",
    description: "Práctica infantil de lectura inicial, tranquila y adaptativa.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFAF2",
    theme_color: "#B9DCCB",
    orientation: "any",
    icons: [
      { src: "/icons/yomu-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/yomu-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/yomu-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
