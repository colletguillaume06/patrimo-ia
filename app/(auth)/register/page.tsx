'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  full_name: z.string().min(2, 'Nom trop court'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, '8 caractères minimum'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

type FormErrors = Partial<Record<'full_name' | 'email' | 'password' | 'confirm' | 'global', string>>

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors(prev => ({ ...prev, [k]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormErrors
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.full_name } },
    })
    setLoading(false)

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        setErrors({ email: 'Cet email est déjà utilisé. Connectez-vous.' })
      } else {
        setErrors({ global: error.message })
      }
      return
    }

    router.push('/onboarding')
  }

  const inputClass = (field: keyof FormErrors) =>
    `w-full h-11 px-4 rounded-xl bg-white/[0.06] border text-white placeholder-slate-600 text-sm focus:outline-none transition-all ${
      errors[field]
        ? 'border-red-500/60 focus:border-red-500'
        : 'border-white/[0.10] focus:border-blue-500/50'
    }`

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
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
            Créer un compte
          </h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            Commencez gratuitement, sans carte bancaire
          </p>

          {errors.global && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            {/* Nom */}
            <div>
              <input
                type="text"
                placeholder="Votre nom complet"
                value={form.full_name}
                onChange={set('full_name')}
                className={inputClass('full_name')}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-400">{errors.full_name}</p>}
            </div>

            {/* Email */}
            <div>
              <input
                type="email"
                placeholder="votre@email.fr"
                value={form.email}
                onChange={set('email')}
                className={inputClass('email')}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.email}{' '}
                  {errors.email.includes('déjà utilisé') && (
                    <Link href="/login" className="underline hover:text-red-300">Se connecter →</Link>
                  )}
                </p>
              )}
            </div>

            {/* Mot de passe */}
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe (8 caractères min.)"
                  value={form.password}
                  onChange={set('password')}
                  className={`${inputClass('password')} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password}</p>}
            </div>

            {/* Confirmation */}
            <div>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe"
                  value={form.confirm}
                  onChange={set('confirm')}
                  className={`${inputClass('confirm')} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-xs text-red-400">{errors.confirm}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all mt-1"
            >
              {loading ? 'Création...' : 'Créer mon compte'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

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
