'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Users, Phone, Mail, Building2, ChevronRight, CheckCircle, AlertCircle, Clock, Plus } from 'lucide-react'
import Link from 'next/link'

export default function LocatairesPage() {
  const [leases, setLeases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('leases')
      .select(`
        *,
        property:properties(id, name, address, city, type),
        payments(id, status, amount, due_date)
      `)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
      .then(r => { setLeases(r.data ?? []); setLoading(false) })
  }, [])

  const getStatut = (lease: any) => {
    if (!lease.is_active) return { label: 'Ancien locataire', color: '#6B7280', bg: '#F9FAFB', icon: Clock }
    const late = (lease.payments ?? []).filter((p: any) => p.status === 'late').length
    if (late > 0) return { label: `${late} loyer(s) en retard`, color: '#DC2626', bg: '#FEF2F2', icon: AlertCircle }
    return { label: 'À jour', color: '#059669', bg: '#F0FDF4', icon: CheckCircle }
  }

  const actifs = leases.filter(l => l.is_active)
  const anciens = leases.filter(l => !l.is_active)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Locataires</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {actifs.length} locataire(s) actif(s) · {anciens.length} ancien(s)
          </p>
        </div>
        <Link href="/baux"
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#1D4ED8' }}>
          <Plus className="h-4 w-4" /> Nouveau bail
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}</div>
      ) : leases.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Aucun locataire</p>
            <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
              Créez votre premier bail pour ajouter un locataire
            </p>
            <Link href="/baux"
              className="flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#1D4ED8' }}>
              <Plus className="h-4 w-4" /> Créer un bail
            </Link>
          </div>
        </GlassCard>
      ) : (
        <>
          {/* Locataires actifs */}
          {actifs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Locataires actifs
              </p>
              {actifs.map(lease => {
                const statut = getStatut(lease)
                const StatutIcon = statut.icon
                const totalLoyers = (lease.payments ?? []).filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + p.amount, 0)
                return (
                  <Link key={lease.id} href={`/locataires/${lease.id}`}>
                    <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      {/* Avatar */}
                      <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1D4ED8, #0891B2)' }}>
                        {lease.tenant_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>

                      {/* Infos principales */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {lease.tenant_name}
                          </p>
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: statut.bg, color: statut.color }}>
                            <StatutIcon className="h-3 w-3" />
                            {statut.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {lease.property && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {lease.property.name}
                            </span>
                          )}
                          {lease.tenant_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {lease.tenant_email}
                            </span>
                          )}
                          {lease.tenant_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {lease.tenant_phone}
                            </span>
                          )}
                        </div>
                        {lease.start_date && (
                          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                            Depuis le {format(new Date(lease.start_date), 'd MMMM yyyy', { locale: fr })}
                          </p>
                        )}
                      </div>

                      {/* KPIs */}
                      <div className="hidden md:flex items-center gap-6 text-right flex-shrink-0">
                        <div>
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loyer mensuel</p>
                          <p className="text-base font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(lease.monthly_rent)}
                          </p>
                        </div>
                        {totalLoyers > 0 && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Total encaissé</p>
                            <p className="text-base font-bold font-mono" style={{ color: '#059669' }}>
                              {formatCurrency(totalLoyers)}
                            </p>
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Anciens locataires */}
          {anciens.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Anciens locataires
              </p>
              {anciens.map(lease => (
                <Link key={lease.id} href={`/locataires/${lease.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:opacity-80 cursor-pointer opacity-60"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white bg-slate-400">
                      {lease.tenant_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{lease.tenant_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {lease.property?.name}
                        {lease.end_date && ` · Parti le ${format(new Date(lease.end_date), 'd MMMM yyyy', { locale: fr })}`}
                      </p>
                    </div>
                    <p className="text-sm font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {formatCurrency(lease.monthly_rent)}/mois
                    </p>
                    <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
