'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { LogoStatic } from '@/components/layout/Logo'

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
    `w-full h-11 px-4 rounded-xl border text-[#0F172A] placeholder:text-slate-400 text-sm focus:outline-none transition-all bg-white ${
      errors[field]
        ? 'border-red-400 focus:border-red-500'
        : 'border-slate-200 focus:border-blue-500'
    }`

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <LogoStatic variant="light" size="md" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="font-display font-semibold text-xl text-[#0F172A] text-center mb-1">
            Créer votre espace gratuit
          </h1>
          <p className="text-slate-500 text-sm text-center mb-2">
            2 biens inclus · Sans carte bancaire · Annulez quand vous voulez
          </p>
          {/* Badges réassurance */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="text-xs text-slate-500 flex items-center gap-1">🔒 RGPD</span>
            <span className="text-slate-200">|</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">🇫🇷 Hébergé en France</span>
            <span className="text-slate-200">|</span>
            <span className="text-xs text-slate-500 flex items-center gap-1">⚡ Accès immédiat</span>
          </div>

          {errors.global && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {errors.global}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div>
              <input type="text" placeholder="Votre nom complet" value={form.full_name}
                onChange={set('full_name')} className={inputClass('full_name')} />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name}</p>}
            </div>

            <div>
              <input type="email" placeholder="votre@email.fr" value={form.email}
                onChange={set('email')} className={inputClass('email')} />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.email}{' '}
                  {errors.email.includes('déjà utilisé') && (
                    <Link href="/login" className="underline hover:text-red-400">Se connecter →</Link>
                  )}
                </p>
              )}
            </div>

            <div>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe (8 caractères min.)" value={form.password}
                  onChange={set('password')} className={`${inputClass('password')} pr-11`} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
            </div>

            <div>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirmer le mot de passe" value={form.confirm}
                  onChange={set('confirm')} className={`${inputClass('confirm')} pr-11`} />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm && <p className="mt-1 text-xs text-red-500">{errors.confirm}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all mt-1">
              {loading ? 'Création de votre espace...' : 'Créer mon espace gratuit'}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="text-xs text-center text-slate-400 mt-2">
              En créant un compte, vous acceptez nos <Link href="/cgu" className="underline hover:text-slate-600">CGU</Link> et notre <Link href="/confidentialite" className="underline hover:text-slate-600">politique de confidentialité</Link>.
            </p>
          </form>

          <div className="border-t border-slate-100 mt-5 pt-5">
            <p className="text-center text-sm text-slate-500">
              Déjà un compte ?{' '}
              <Link href="/login" className="text-[#1D4ED8] hover:text-[#1E40AF] font-semibold">
                Se connecter →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
