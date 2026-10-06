// Modified for the local Wanxiang workbench; upstream template is Apache-2.0.
import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import "./globals.css"


import { siteConfig } from "./siteConfig"

export const metadata: Metadata = {
  metadataBase: new URL("https://yoururl.com"),
  title: siteConfig.name,
  description: siteConfig.description,
  keywords: [],
  authors: [
    {
      name: "yourname",
      url: "",
    },
  ],
  creator: "yourname",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: "Tremor OSS Dashboard",
    creator: "@tremorlabs",
  },
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className="font-sans overflow-y-scroll scroll-auto antialiased selection:bg-indigo-100 selection:text-indigo-700 dark:bg-gray-950"
        suppressHydrationWarning
      >
        <div className="w-full">
          <ThemeProvider defaultTheme="system" attribute="class">
            <main>{children}</main>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
