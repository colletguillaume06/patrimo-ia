'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LogoStatic } from '@/components/layout/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <LogoStatic variant="light" size="md" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display font-semibold text-xl text-[#0F172A] text-center mb-1">
            Bon retour 👋
          </h1>
          <p className="text-slate-500 text-sm text-center mb-6">
            Accédez à votre espace de gestion immobilière
          </p>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-600">Mot de passe</label>
                <Link href="/reset-password" className="text-xs text-[#1D4ED8] hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all mt-1"
            >
              {loading ? 'Connexion en cours...' : 'Accéder à mon espace'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          {/* Réassurance */}
          <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-slate-400">
            <span>🔒</span>
            <span>Connexion sécurisée · Données chiffrées</span>
          </div>

          <div className="border-t border-slate-100 mt-5 pt-5">
            <p className="text-center text-sm text-slate-500">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-[#1D4ED8] hover:text-[#1E40AF] font-semibold">
                Essayer gratuitement →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
