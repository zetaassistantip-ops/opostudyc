import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const jakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
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
        className={`${jakartaSans.variable} ${jetbrainsMono.variable} font-sans min-h-[100dvh] bg-slate-50 text-slate-900 antialiased flex flex-col overflow-x-hidden selection:bg-red-100 selection:text-red-900`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
