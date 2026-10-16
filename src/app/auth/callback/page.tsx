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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 animate-pulse">
          <Flame className="w-8 h-8 fill-red-500/30" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Iniciando sesión con Google...
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Sincronizando tu progreso y calendario SRS de Bombero CAM
          </p>
        </div>
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    </div>
  );
}
