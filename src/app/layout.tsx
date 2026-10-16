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
  themeColor: '#f8fafc',
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
    statusBarStyle: 'default',
    title: 'OpostudyC',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full bg-slate-50 text-slate-900">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-[100dvh] bg-slate-50 text-slate-900 antialiased flex flex-col overflow-x-hidden selection:bg-red-100 selection:text-red-900`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
