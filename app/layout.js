import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "./_components/SessionProvider";
import { AppearanceProvider } from "./_components/AppearanceProvider";
import ServiceWorkerRegistration from "./_components/ServiceWorkerRegistration";

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Envoi",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body 
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <ServiceWorkerRegistration />
        <AppearanceProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
