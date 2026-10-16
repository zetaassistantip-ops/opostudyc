import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: 'OpostudyC - Bomberos CAM',
  description: 'Entrenamiento táctico contra la curva del olvido para los 35 temas oficiales de Bombero de la Comunidad de Madrid.',
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'OpostudyC',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark h-full bg-zinc-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-[100dvh] bg-zinc-950 text-zinc-100 antialiased flex flex-col overflow-x-hidden selection:bg-red-900/60 selection:text-red-100`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
