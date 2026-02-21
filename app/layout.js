import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./_components/SessionProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Envoi",
  description: "Secure file sharing platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}