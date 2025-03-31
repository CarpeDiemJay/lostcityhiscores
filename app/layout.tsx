import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";

// Font setup
const inter = Inter({ subsets: ["latin"] });

// Metadata
export const metadata: Metadata = {
  title: "Lost City Hiscores",
  description: "Track your OSRS progress in the Lost City",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Add favicon */}
        <link rel="icon" href="/favicon.ico" />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, main, #root-layout, #root-layout-main, .sidebar-container, .main-content {
            background-color: #0A0B0F;
          }
          html, body {
            min-height: 100vh;
            margin: 0;
            padding: 0;
            color: white;
            overflow-x: hidden;
          }
          #root-layout {
            min-height: 100vh;
            position: relative;
          }
          .sidebar-container {
            background-color: #0A0B0F;
            z-index: 40;
          }
          @media (min-width: 768px) {
            .main-content {
              margin-left: 50px;
              transition: margin-left 0.3s ease;
              position: relative;
              z-index: 10;
            }
          }
        `}} />
      </head>
      <body className={inter.className}>
        <div id="root-layout">
          <Header />
          <main id="root-layout-main" className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
