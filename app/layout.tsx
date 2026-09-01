import { Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";

// Orbitron: the wordmark and HUD chrome (eyebrows, labels, buttons).
// Rajdhani: chat and readout text — technical but legible at body sizes.
const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

export const metadata = {
  title: "ABEL",
  description: "Personal AI assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${rajdhani.variable}`}>
        {children}
      </body>
    </html>
  );
}
