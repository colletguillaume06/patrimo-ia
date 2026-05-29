'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sparkles, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
  }

  return (
    <div className="min-h-screen bg-[#0B1628] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white">
            Propilot <span className="text-blue-400">AI</span>
          </span>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
          <h1 className="font-display font-semibold text-xl text-white text-center mb-1">
            Connexion
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Accédez à votre tableau de bord immobilier
          </p>

          {sent ? (
            <div className="text-center py-6">
              <div className="h-12 w-12 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-white font-medium mb-2">Email envoyé !</p>
              <p className="text-slate-400 text-sm">
                Vérifiez votre boîte mail à <strong className="text-white">{email}</strong>
              </p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white text-sm font-medium transition-all mb-4"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continuer avec Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-xs text-slate-600">ou</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  placeholder="votre@email.fr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all"
                />
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all"
                >
                  {loading ? 'Envoi...' : 'Recevoir le lien de connexion'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}

          <p className="text-center text-xs text-slate-600 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
