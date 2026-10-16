'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';

export default function UserAuthButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse border border-zinc-700/60" />
    );
  }

  if (!user) {
    return (
      <button
        onClick={() => signInWithGoogle()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 text-xs font-medium transition-all shadow-sm active:scale-95"
        title="Inicia sesión con Google para guardar tu progreso"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Acceder</span>
      </button>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const nombre = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Opositor';
  const email = user.email || '';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuAbierto(!menuAbierto)}
        className="flex items-center gap-2 p-1 pl-2 pr-1 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 transition-all text-left group"
      >
        <span className="text-xs font-medium text-zinc-300 max-w-[90px] truncate hidden sm:inline-block">
          {nombre}
        </span>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={nombre}
            className="w-7 h-7 rounded-full object-cover ring-1 ring-red-500/50"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-xs font-bold ring-1 ring-red-500/50">
            {nombre.slice(0, 1).toUpperCase()}
          </div>
        )}
      </button>

      {menuAbierto && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-zinc-800/80">
            <p className="text-sm font-semibold text-white truncate">{nombre}</p>
            <p className="text-xs text-zinc-400 truncate mt-0.5">{email}</p>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Progreso sincronizado en la nube</span>
            </div>
          </div>

          <div className="pt-1">
            <button
              onClick={() => {
                setMenuAbierto(false);
                signOut();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
