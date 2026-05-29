'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1628] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
            Créer un compte
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Commencez gratuitement, sans carte bancaire
          </p>

          {sent ? (
            <div className="text-center py-6">
              <p className="text-white font-medium mb-2">Vérifiez votre email !</p>
              <p className="text-slate-400 text-sm">
                Un lien de connexion a été envoyé à <strong className="text-white">{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <input
                type="text"
                placeholder="Votre nom"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              />
              <input
                type="email"
                placeholder="votre@email.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-sm font-semibold transition-all"
              >
                {loading ? 'Création...' : 'Créer mon compte'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-600 mt-6">
            Déjà un compte ?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
