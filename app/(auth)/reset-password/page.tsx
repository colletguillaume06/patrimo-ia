'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, MailCheck } from 'lucide-react'
import Link from 'next/link'
import { LogoStatic } from '@/components/layout/Logo'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const emailValue = (fd.get('email') as string || email).trim()
    if (!emailValue) {
      toast.error('Veuillez saisir votre adresse email.')
      return
    }

    setLoading(true)
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(emailValue, { redirectTo })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      // On affiche toujours le même message (ne pas révéler si l'email existe)
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <LogoStatic variant="light" size="md" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="flex items-center justify-center mb-4">
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                  <MailCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <h1 className="font-display font-semibold text-xl text-[#0F172A] mb-2">
                Vérifiez votre boîte mail
              </h1>
              <p className="text-slate-500 text-sm mb-6">
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien
                pour réinitialiser votre mot de passe.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-[#1D4ED8] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" /> Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display font-semibold text-xl text-[#0F172A] text-center mb-1">
                Mot de passe oublié ?
              </h1>
              <p className="text-slate-500 text-sm text-center mb-6">
                Entrez votre email, on vous envoie un lien de réinitialisation
              </p>

              <form onSubmit={handleReset} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="votre@email.fr"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-[#0F172A] placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all mt-1"
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien'}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <div className="border-t border-slate-100 mt-5 pt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#1D4ED8]"
                >
                  <ArrowLeft className="h-4 w-4" /> Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
