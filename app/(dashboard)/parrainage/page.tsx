'use client'

import { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Copy, Gift, Users, Star, CheckCircle } from 'lucide-react'

export default function ParrainagePage() {
  const [data, setData] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/referral').then(r => r.json()).then(setData)
  }, [])

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
          Programme parrainage
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Parrainez un propriétaire, gagnez 2 mois offerts chacun
        </p>
      </div>

      {/* Comment ça marche */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Comment ça marche ?
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Copy, step: '1', title: 'Partagez votre lien', desc: 'Envoyez votre lien unique à un propriétaire de votre entourage' },
            { icon: Users, step: '2', title: 'Il s\'inscrit', desc: 'Votre filleul crée son compte avec votre lien' },
            { icon: Gift, step: '3', title: 'Vous gagnez', desc: '2 mois offerts pour vous · 1 mois offert pour votre filleul' },
          ].map(({ icon: Icon, step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="h-10 w-10 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ background: '#EFF6FF' }}>
                <Icon className="h-5 w-5" style={{ color: '#1D4ED8' }} />
              </div>
              <p className="text-xs font-bold mb-1" style={{ color: '#1D4ED8' }}>Étape {step}</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Votre lien */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Votre lien de parrainage
        </h2>

        {data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <span className="flex-1 text-sm font-mono truncate" style={{ color: 'var(--text-primary)' }}>
                {data.referral_link}
              </span>
              <button onClick={() => handleCopy(data.referral_link)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
                style={{ background: copied ? '#059669' : '#1D4ED8', color: 'white' }}>
                {copied ? <><CheckCircle className="h-3.5 w-3.5" /> Copié</> : <><Copy className="h-3.5 w-3.5" /> Copier</>}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Code court :
              </p>
              <button onClick={() => handleCopy(data.referral_code)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-mono font-bold"
                style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                {data.referral_code} <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        )}
      </GlassCard>

      {/* Vos stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-5 text-center">
          <Users className="h-6 w-6 mx-auto mb-2" style={{ color: '#1D4ED8' }} />
          <p className="text-3xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
            {data?.referral_count ?? 0}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Filleul{(data?.referral_count ?? 0) > 1 ? 's' : ''} parrainé{(data?.referral_count ?? 0) > 1 ? 's' : ''}</p>
        </GlassCard>
        <GlassCard className="p-5 text-center">
          <Gift className="h-6 w-6 mx-auto mb-2" style={{ color: '#059669' }} />
          <p className="text-3xl font-bold font-mono" style={{ color: '#059669' }}>
            {data?.months_offered ?? 0}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Mois offerts gagnés</p>
        </GlassCard>
      </div>

      {/* Message motivation */}
      <GlassCard>
        <div className="flex items-start gap-3">
          <Star className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Parrainez 5 propriétaires = 10 mois offerts
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Chaque filleul vous rapporte 2 mois gratuits sur votre abonnement Pro ou Premium.
              Pas de limite — plus vous parrainez, plus vous économisez.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}
