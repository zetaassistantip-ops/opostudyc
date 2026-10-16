'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Flame } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const sb = supabase;
    if (!sb) {
      router.replace('/');
      return;
    }

    // Supabase procesa el token de OAuth de la URL
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/');
      } else {
        // En caso de PKCE o flujo de hash
        const { data: authListener } = sb.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session) {
            authListener.subscription.unsubscribe();
            router.replace('/');
          }
        });
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="OpostudyC"
          className="w-16 h-16 rounded-2xl object-contain bg-white p-1 border border-slate-200 shadow-lg shadow-slate-200/50 animate-pulse"
        />
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Iniciando sesión con Google...
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Sincronizando tu progreso y calendario SRS de Bombero CAM
          </p>
        </div>
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    </div>
  );
}
