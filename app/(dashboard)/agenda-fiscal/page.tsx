'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format, differenceInDays, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Calendar, Bell, BellOff, AlertCircle, CheckCircle, Clock, Mail } from 'lucide-react'
import { toast } from 'sonner'

interface Echeance {
  id: string
  date: Date
  label: string
  description: string
  type: 'lmnp' | 'foncier' | 'sci' | 'commun' | 'cfm'
  urgent: boolean
  alerte_email: boolean
}

const now = new Date()
const year = now.getFullYear()

function getEcheances(hasSci: boolean, hasLmnp: boolean, hasFoncier: boolean): Echeance[] {
  const echeances: Echeance[] = [
    // ── Communes ──
    { id: 'tf_oct', date: new Date(year, 9, 15), label: 'Taxe foncière', description: 'Paiement de la taxe foncière (avis reçu en septembre)', type: 'commun', urgent: false, alerte_email: true },
    { id: 'ir_mai', date: new Date(year, 4, 20), label: 'Déclaration revenus (papier)', description: 'Date limite déclaration IR revenus N-1 — formulaire papier', type: 'commun', urgent: false, alerte_email: true },
    { id: 'ir_juin', date: new Date(year, 5, 5), label: 'Déclaration revenus (en ligne)', description: 'Date limite déclaration IR revenus N-1 — déclaration en ligne (zones 1-3)', type: 'commun', urgent: false, alerte_email: true },
    { id: 'ps_sept', date: new Date(year, 8, 15), label: 'Prélèvements sociaux', description: 'Acompte prélèvements sociaux sur revenus du patrimoine (15.5%)', type: 'commun', urgent: false, alerte_email: false },
  ]

  if (hasLmnp) {
    echeances.push(
      { id: 'cfe_dec', date: new Date(year, 11, 15), label: 'CFE — Cotisation Foncière', description: 'Paiement de la Cotisation Foncière des Entreprises (LMNP)', type: 'lmnp', urgent: false, alerte_email: true },
      { id: 'bic_mai', date: new Date(year, 4, 3), label: 'Déclaration 2042-C-PRO', description: 'Revenus BIC LMNP — formulaire 2042-C-PRO annexé à la déclaration', type: 'lmnp', urgent: false, alerte_email: true },
      { id: 'lmnp_bilan', date: new Date(year, 2, 31), label: 'Bilan comptable LMNP', description: 'Transmission du bilan à votre expert-comptable (régime réel)', type: 'lmnp', urgent: false, alerte_email: false },
    )
  }

  if (hasFoncier) {
    echeances.push(
      { id: 'foncier_2044', date: new Date(year, 4, 20), label: 'Formulaire 2044', description: 'Déclaration revenus fonciers (régime réel) — charges et intérêts déductibles', type: 'foncier', urgent: false, alerte_email: true },
      { id: 'foncier_micro', date: new Date(year, 4, 20), label: 'Micro-foncier (< 15 000€)', description: 'Si revenus fonciers bruts < 15 000€ — déclaration simplifiée 2042', type: 'foncier', urgent: false, alerte_email: false },
    )
  }

  if (hasSci) {
    echeances.push(
      { id: 'sci_2072', date: new Date(year, 3, 30), label: 'Formulaire 2072 (SCI IR)', description: 'Déclaration de résultats SCI soumise à l\'IR — dépôt avant fin avril', type: 'sci', urgent: false, alerte_email: true },
      { id: 'sci_is', date: new Date(year, 3, 30), label: 'Déclaration IS (SCI IS)', description: 'Déclaration de résultats SCI soumise à l\'IS — liasse fiscale', type: 'sci', urgent: false, alerte_email: true },
      { id: 'sci_is_solde', date: new Date(year, 8, 15), label: 'Solde IS dû', description: 'Paiement du solde de l\'Impôt sur les Sociétés', type: 'sci', urgent: false, alerte_email: false },
    )
  }

  // Marquer les urgentes (dans les 30 prochains jours)
  return echeances
    .map(e => ({ ...e, urgent: differenceInDays(e.date, now) >= 0 && differenceInDays(e.date, now) <= 30 }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

const TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  lmnp:    { bg: '#EFF6FF', color: '#1D4ED8', label: 'LMNP' },
  foncier: { bg: '#F0FDF4', color: '#166534', label: 'Foncier nu' },
  sci:     { bg: '#F5F3FF', color: '#5B21B6', label: 'SCI' },
  commun:  { bg: '#F8FAFC', color: '#475569', label: 'Tous' },
  cfm:     { bg: '#FFFBEB', color: '#92400E', label: 'CFM' },
}

export default function AgendaFiscalPage() {
  const [hasLmnp, setHasLmnp] = useState(false)
  const [hasFoncier, setHasFoncier] = useState(false)
  const [hasSci, setHasSci] = useState(false)
  const [alertes, setAlertes] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState('')
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: props } = await supabase.from('properties').select('type')
      setHasLmnp((props ?? []).some(p => p.type === 'lmnp'))
      setHasFoncier((props ?? []).some(p => p.type === 'nu' || p.type === 'commerce'))
      setHasSci((props ?? []).some(p => p.type === 'sci'))

      // Charger les préférences d'alertes
      const { data: profile } = await supabase.from('profiles').select('agenda_alertes').single()
      if (profile?.agenda_alertes) setAlertes(profile.agenda_alertes as Record<string, boolean>)
    }
    load()
  }, [])

  const echeances = getEcheances(hasSci, hasLmnp, hasFoncier)

  const toggleAlerte = async (id: string) => {
    setSaving(id)
    const newAlertes = { ...alertes, [id]: !alertes[id] }
    setAlertes(newAlertes)
    await supabase.from('profiles').update({ agenda_alertes: newAlertes } as any).eq('id', (await supabase.auth.getUser()).data.user!.id)
    setSaving('')
    toast.success(newAlertes[id] ? 'Rappel email activé' : 'Rappel désactivé')
  }

  const passees = echeances.filter(e => differenceInDays(e.date, now) < 0)
  const avenir = echeances.filter(e => differenceInDays(e.date, now) >= 0)
  const urgentes = avenir.filter(e => e.urgent)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Agenda fiscal {year}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Échéances fiscales avec rappels email automatiques
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
          <Mail className="h-3.5 w-3.5" />
          Rappel 7 jours avant
        </div>
      </div>

      {/* Alertes urgentes */}
      {urgentes.length > 0 && (
        <div className="p-4 rounded-2xl" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> {urgentes.length} échéance{urgentes.length > 1 ? 's' : ''} dans les 30 prochains jours
          </p>
          {urgentes.map(e => (
            <p key={e.id} className="text-sm text-red-600">
              • <strong>{e.label}</strong> — {format(e.date, 'd MMMM yyyy', { locale: fr })} ({differenceInDays(e.date, now)} jours)
            </p>
          ))}
        </div>
      )}

      {/* Prochaines échéances */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Calendar className="h-4 w-4" /> Prochaines échéances
        </h2>
        <div className="space-y-2">
          {avenir.map(e => {
            const daysLeft = differenceInDays(e.date, now)
            const alerteActive = alertes[e.id] !== false && e.alerte_email
            const tc = TYPE_COLORS[e.type]
            return (
              <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl transition-all"
                style={{ background: e.urgent ? '#FEF2F2' : 'var(--bg-secondary)', border: `1px solid ${e.urgent ? '#FECACA' : 'var(--border)'}` }}>
                <div className="flex-shrink-0 w-14 text-center">
                  <p className="text-lg font-bold font-mono" style={{ color: e.urgent ? '#DC2626' : 'var(--text-primary)' }}>
                    {format(e.date, 'd', { locale: fr })}
                  </p>
                  <p className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>
                    {format(e.date, 'MMM', { locale: fr })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{e.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: tc.bg, color: tc.color }}>
                      {tc.label}
                    </span>
                    {daysLeft <= 7 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-600">Urgent</span>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{e.description}</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: daysLeft <= 30 ? '#DC2626' : 'var(--text-secondary)' }}>
                    Dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={() => toggleAlerte(e.id)} disabled={saving === e.id}
                  className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: alerteActive ? '#EFF6FF' : 'var(--bg-secondary)' }}
                  title={alerteActive ? 'Rappel email activé' : 'Activer le rappel email'}>
                  {alerteActive
                    ? <Bell className="h-4 w-4" style={{ color: '#1D4ED8' }} />
                    : <BellOff className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                  }
                </button>
              </div>
            )
          })}
        </div>
      </GlassCard>

      {/* Échéances passées */}
      {passees.length > 0 && (
        <GlassCard>
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
            <CheckCircle className="h-4 w-4" /> Passées ({year})
          </h2>
          <div className="space-y-2 opacity-60">
            {passees.map(e => {
              const tc = TYPE_COLORS[e.type]
              return (
                <div key={e.id} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                  <div className="flex-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.label}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-tertiary)' }}>
                      {format(e.date, 'd MMMM', { locale: fr })}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.color }}>{tc.label}</span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
