import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const inter = Inter({ subsets: ["latin"] });

const GA_MEASUREMENT_ID = "G-W99FH06X3T";

export const metadata: Metadata = {
  title: {
    default: "ONCEPOSTED - Vintage Postcards",
    template: "%s | ONCEPOSTED",
  },
  description: "Explore our curated collection of vintage postcards from around the world. Each card tells a story of places, people, and moments captured in time.",
  openGraph: {
    title: "ONCEPOSTED - Vintage Postcards",
    description: "Explore our curated collection of vintage postcards from around the world. Each card tells a story of places, people, and moments captured in time.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          defer
          src="https://analytics.stff.me/script.js"
          data-website-id="4226f0dd-3609-4962-b89b-1c37f56753bb"
          data-domains="onceposted.com"
        />
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Header />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
