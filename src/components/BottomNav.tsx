'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, BookOpen, Zap, BarChart3 } from 'lucide-react';

interface BottomNavProps {
  badgeRepaso?: number;
}

export default function BottomNav({ badgeRepaso }: BottomNavProps = {}) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/',
      label: 'Temario',
      icon: BookOpen,
      active: pathname === '/',
    },
    {
      href: '/jugar?modo=repaso',
      label: 'Repaso SRS',
      icon: Flame,
      active: pathname.startsWith('/jugar') && !pathname.includes('modo=fallos'),
      badge:
        badgeRepaso && badgeRepaso > 0
          ? badgeRepaso > 25
            ? '25'
            : String(badgeRepaso)
          : undefined,
    },
    {
      href: '/fichas',
      label: 'Fichas Clave',
      icon: Zap,
      active: pathname.startsWith('/fichas') || pathname.startsWith('/chuleta'),
    },
    {
      href: '/estadisticas',
      label: 'Estadísticas',
      icon: BarChart3,
      active: pathname.startsWith('/estadisticas'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-2 border-slate-900 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 ${
                item.active
                  ? 'text-red-600 font-bold'
                  : 'text-slate-600 hover:text-slate-900 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    item.active ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-tight border border-slate-900 shadow-2xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
