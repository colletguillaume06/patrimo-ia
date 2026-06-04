'use client'

import Link from 'next/link'
import { LogoStatic } from '@/components/layout/Logo'
import { Lock, ArrowRight, Mail } from 'lucide-react'

export default function AccesExpirePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <LogoStatic variant="light" size="md" />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF2F2' }}>
            <Lock className="h-7 w-7 text-red-500" />
          </div>

          <h1 className="font-display font-bold text-xl text-[#0F172A] mb-2">
            Votre période d'essai est terminée
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Votre accès gratuit de 2 mois est arrivé à son terme.
            Choisissez un abonnement pour continuer à gérer votre patrimoine.
          </p>

          <div className="space-y-3">
            <Link href="/#pricing"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#1D4ED8' }}>
              Voir les abonnements <ArrowRight className="h-4 w-4" />
            </Link>

            <a href="mailto:contact@patrimo-ia.fr"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Mail className="h-4 w-4" /> Contacter le support
            </a>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Vos données sont conservées — elles seront accessibles dès votre abonnement activé.
          </p>
        </div>
      </div>
    </div>
  )
}
