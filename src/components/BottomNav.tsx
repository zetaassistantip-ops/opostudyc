'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, BookOpen, Zap, UploadCloud } from 'lucide-react';

export default function BottomNav() {
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
      badge: '15',
    },
    {
      href: '/chuleta',
      label: 'Chuletas',
      icon: Zap,
      active: pathname.startsWith('/chuleta'),
    },
    {
      href: '/admin/ingesta',
      label: 'Ingesta IA',
      icon: UploadCloud,
      active: pathname.startsWith('/admin/ingesta'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
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
                  ? 'text-red-500 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    item.active ? 'scale-110 stroke-[2.25]' : 'stroke-[1.75]'
                  }`}
                />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-600 text-white text-[10px] font-bold px-1 py-0.2 rounded-full leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
