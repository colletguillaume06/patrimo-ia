'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ChevronLeft, Phone, Mail, Building2, FileText, User,
  Shield, Edit3, Save, X, CheckCircle, AlertCircle, Clock, Plus, Trash2, TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RevisionModal } from '@/components/loyers/RevisionModal'
import { IRL_CURRENT, ILC_CURRENT, ILAT_CURRENT, getQuarterLabel, calculateRevisionLoyer } from '@/lib/fiscal/indices'

export default function LocataireDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [revisionLease, setRevisionLease] = useState<any | null>(null)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('tenants')
      .select(`
        *,
        leases(
          id, is_active, monthly_rent, charges, deposit, start_date, end_date,
          irl_reference_valeur, irl_reference_trimestre, irl_reference_annee, irl_reference_indice,
          tenant_email, tenant_phone, tenant_name,
          property:properties(id, name, address, city, type, indice_revision),
          payments(id, status, amount, due_date)
        )
      `)
      .eq('id', id)
      .single()

    // Fallback : chercher les baux par tenant_name si aucun bail lié par tenant_id
    let enriched = data
    if (data && (!data.leases || data.leases.length === 0)) {
      const { data: byName } = await supabase
        .from('leases')
        .select(`
          id, is_active, monthly_rent, charges, deposit, start_date, end_date,
          irl_reference_valeur, irl_reference_trimestre, irl_reference_annee, irl_reference_indice,
          tenant_email, tenant_phone, tenant_name,
          property:properties(id, name, address, city, type, indice_revision),
          payments(id, status, amount, due_date)
        `)
        .ilike('tenant_name', data.full_name)
      enriched = { ...data, leases: byName ?? [] }

      // Relier automatiquement ces baux au locataire (repair silencieux)
      if (byName && byName.length > 0) {
        await supabase.from('leases').update({ tenant_id: id }).in('id', byName.map((l: any) => l.id))
      }
    }

    setTenant(enriched)
    setForm({
      full_name: data?.full_name ?? '',
      email: data?.email ?? '',
      phone: data?.phone ?? '',
      address_before: data?.address_before ?? '',
      guarantor_name: data?.guarantor_name ?? '',
      guarantor_phone: data?.guarantor_phone ?? '',
      guarantor_email: data?.guarantor_email ?? '',
      notes: data?.notes ?? '',
    })
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    const { error } = await supabase.from('tenants').delete().eq('id', id)
    setDeleting(false)
    if (error) { toast.error('Erreur suppression : ' + error.message); return }
    toast.success('Fiche locataire supprimée')
    router.push('/locataires')
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('tenants').update(form).eq('id', id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Fiche mise à jour')
    setEditing(false)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="animate-spin h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent" /></div>
  if (!tenant) return <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>Locataire introuvable</div>

  const activeLease = tenant.leases?.find((l: any) => l.is_active)
  const activeLeases = tenant.leases?.filter((l: any) => l.is_active) ?? []
  const totalLoyerMensuel = activeLeases.reduce((s: number, l: any) => s + (l.monthly_rent ?? 0) + (l.charges ?? 0), 0)
  const totalDG = activeLeases.reduce((s: number, l: any) => s + (l.deposit ?? 0), 0)
  const allPayments = tenant.leases?.flatMap((l: any) => l.payments ?? []) ?? []
  const paid = allPayments.filter((p: any) => p.status === 'paid')
  const late = allPayments.filter((p: any) => p.status === 'late')
  const totalEncaisse = paid.reduce((s: number, p: any) => s + p.amount, 0)
  const totalRetard = late.reduce((s: number, p: any) => s + p.amount, 0)

  const inputClass = "w-full h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
  const inputStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/locataires" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <ChevronLeft className="h-4 w-4" /> Locataires
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            {tenant.full_name}
          </h1>
          {activeLease
            ? <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Bail actif</span>
            : <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">Sans bail</span>
          }
        </div>
        <div className="flex gap-2">
          {!activeLease && (
            <>
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border"
                style={{ borderColor: '#EF4444', color: '#EF4444', background: '#FEF2F2' }}>
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
              <Link href="/baux"
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border"
                style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
                <Plus className="h-4 w-4" /> Créer un bail
              </Link>
            </>
          )}
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="h-9 px-3 rounded-xl border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                <X className="h-4 w-4" />
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: '#059669' }}>
                <Save className="h-4 w-4" /> {saving ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}>
              <Edit3 className="h-4 w-4" /> Modifier
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {activeLeases.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: activeLeases.length > 1 ? `Loyers mensuels (${activeLeases.length} baux)` : 'Loyer mensuel', value: formatCurrency(totalLoyerMensuel), color: 'var(--text-primary)' },
            { label: 'Total encaissé', value: formatCurrency(totalEncaisse), color: '#059669' },
            { label: 'En retard', value: formatCurrency(totalRetard), color: totalRetard > 0 ? '#DC2626' : 'var(--text-tertiary)' },
            { label: activeLeases.length > 1 ? 'DG total' : 'Dépôt de garantie', value: formatCurrency(totalDG), color: '#1D4ED8' },
          ].map(({ label, value, color }) => (
            <GlassCard key={label} className="p-4">
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
              <p className="text-lg font-bold font-mono" style={{ color }}>{value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Infos locataire */}
        <GlassCard>
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <User className="h-4 w-4" /> Informations personnelles
          </h2>
          {editing ? (
            <div className="space-y-3">
              {[
                { key: 'full_name', label: 'Nom complet *' },
                { key: 'email', label: 'Email', type: 'email' },
                { key: 'phone', label: 'Téléphone' },
                { key: 'address_before', label: 'Adresse précédente' },
              ].map(({ key, label, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    className={inputClass} style={inputStyle} />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {[
                { icon: User, value: tenant.full_name },
                { icon: Mail, value: tenant.email || '—' },
                { icon: Phone, value: tenant.phone || '—' },
                { icon: Building2, value: tenant.address_before || '—' },
              ].map(({ icon: Icon, value }, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Garant */}
        <GlassCard>
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield className="h-4 w-4" /> Garant
          </h2>
          {editing ? (
            <div className="space-y-3">
              {[
                { key: 'guarantor_name', label: 'Nom du garant' },
                { key: 'guarantor_phone', label: 'Téléphone' },
                { key: 'guarantor_email', label: 'Email', type: 'email' },
              ].map(({ key, label, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                  <input type={type} value={form[key]} onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                    className={inputClass} style={inputStyle} />
                </div>
              ))}
            </div>
          ) : tenant.guarantor_name ? (
            <div className="space-y-2">
              {[
                { icon: User, value: tenant.guarantor_name },
                { icon: Phone, value: tenant.guarantor_phone || '—' },
                { icon: Mail, value: tenant.guarantor_email || '—' },
              ].map(({ icon: Icon, value }, i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>Aucun garant renseigné</p>
          )}
        </GlassCard>

        {/* Tous les baux */}
        <GlassCard>
          <h2 className="font-display font-semibold mb-4 flex items-center justify-between" style={{ color: 'var(--text-primary)' }}>
            <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Baux ({tenant.leases?.length || 0})</span>
            <Link href="/baux" className="text-xs px-2 py-1 rounded-lg"
              style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
              + Nouveau bail
            </Link>
          </h2>
          {tenant.leases?.length > 0 ? (
            <div className="space-y-2">
              {tenant.leases.map((lease: any) => {
                const indice = (lease.irl_reference_indice ?? lease.indexation_index ?? 'irl') as 'irl' | 'ilc' | 'ilat'
                const nouvelIndice = indice === 'ilc' ? ILC_CURRENT : indice === 'ilat' ? ILAT_CURRENT : IRL_CURRENT
                const calcul = lease.irl_reference_valeur && lease.is_active
                  ? calculateRevisionLoyer({ loyer_actuel: lease.monthly_rent, indice_reference: lease.irl_reference_valeur, indice_nouveau: nouvelIndice })
                  : null
                const variation = calcul ? calcul.nouveau_loyer - lease.monthly_rent : 0
                const dejaPrisEnCompte = calcul && Math.abs(variation) < 0.5
                return (
                  <div key={lease.id} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: `1px solid ${lease.is_active ? '#86EFAC' : 'var(--border)'}` }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                        <Link href={`/baux/${lease.id}`} className="text-sm font-semibold hover:underline" style={{ color: 'var(--text-primary)' }}>
                          {lease.property?.name || '—'}
                        </Link>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lease.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {lease.is_active ? 'Actif' : 'Terminé'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(lease.monthly_rent)}/mois</span>
                      {lease.start_date && <span>Depuis {format(new Date(lease.start_date), 'd MMM yyyy', { locale: fr })}</span>}
                      {lease.deposit > 0 && <span>Dépôt {formatCurrency(lease.deposit)}</span>}
                    </div>
                    {/* Bloc IRL */}
                    {calcul && (
                      <div className="mt-2.5 pt-2.5 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-3 text-xs flex-wrap">
                          <span style={{ color: 'var(--text-tertiary)' }}>{indice.toUpperCase()} {getQuarterLabel()} : <span className="font-mono">{nouvelIndice}</span></span>
                          {dejaPrisEnCompte ? (
                            <span className="text-green-600 font-medium">✓ Loyer à jour</span>
                          ) : (
                            <span style={{ color: '#F59E0B' }} className="font-medium">
                              Loyer révisable → {formatCurrency(calcul.nouveau_loyer)} (+{formatCurrency(variation)})
                            </span>
                          )}
                        </div>
                        {!dejaPrisEnCompte && (
                          <button onClick={() => setRevisionLease({ ...lease, property: lease.property })}
                            className="flex items-center gap-1 h-7 px-3 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                            style={{ background: '#059669' }}>
                            <TrendingUp className="h-3 w-3" /> Réviser
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Aucun bail pour ce locataire</p>
              <Link href="/baux" className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white" style={{ background: '#1D4ED8' }}>
                <Plus className="h-4 w-4" /> Créer un bail
              </Link>
            </div>
          )}
        </GlassCard>

        {/* Historique paiements */}
        <GlassCard>
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Historique des paiements
          </h2>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {allPayments.length === 0 ? (
              <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>Aucun paiement</p>
            ) : allPayments.slice(0, 12).map((p: any) => {
              const icons: Record<string, any> = { paid: CheckCircle, late: AlertCircle, pending: Clock }
              const colors: Record<string, string> = { paid: '#059669', late: '#DC2626', pending: '#D97706' }
              const Icon = icons[p.status] ?? Clock
              return (
                <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: colors[p.status] }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {format(new Date(p.due_date), 'MMM yyyy', { locale: fr })}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-medium" style={{ color: colors[p.status] }}>
                    {formatCurrency(p.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>
      </div>

      {/* Notes */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Notes</h2>
        {editing ? (
          <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            placeholder="Observations, remarques..."
            className="w-full h-24 px-3 py-2 rounded-lg text-sm resize-none focus:outline-none"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        ) : (
          <p className="text-sm" style={{ color: tenant.notes ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {tenant.notes || 'Aucune note'}
          </p>
        )}
      </GlassCard>

      {revisionLease && (
      <RevisionModal
        lease={revisionLease}
        onClose={() => setRevisionLease(null)}
        onSuccess={() => { setRevisionLease(null); load() }}
      />
    )}

    {/* Modale confirmation suppression */}
      {confirmDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
        <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-2xl bg-white border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Supprimer la fiche</h3>
              <p className="text-sm text-slate-500">{tenant.full_name}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-5">
            Cette action est irréversible. La fiche locataire sera définitivement supprimée.
            Les baux et historiques associés ne seront pas supprimés.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setConfirmDelete(false)}
              className="flex-1 h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Annuler
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold disabled:opacity-50">
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  )
}
