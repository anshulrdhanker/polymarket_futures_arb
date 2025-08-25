import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sement - Reach",
  description: "Who are you looking for?",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body 
        className="min-h-screen w-full"
        style={{
          backgroundImage: `url(https://images.unsplash.com/photo-1658853148703-e037de399735?w=1600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjYyfHxjbG91ZCUyMHNreSUyMGJhY2tncm91bmR8ZW58MHx8MHx8fDA%3D)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      >
        {children}
      </body>
    </html>
  );
}
