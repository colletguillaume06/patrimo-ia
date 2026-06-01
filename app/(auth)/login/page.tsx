'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

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
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-[#0F172A]">
            Patrimo <span style={{ color: '#1D4ED8' }}>IA</span>
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display font-semibold text-xl text-[#0F172A] text-center mb-1">
            Connexion
          </h1>
          <p className="text-slate-500 text-sm text-center mb-6">
            Accédez à votre tableau de bord immobilier
          </p>

          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="votre@email.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 transition-all"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-[#1D4ED8] hover:text-[#1E40AF] font-medium">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
