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
  Shield, Edit3, Save, X, CheckCircle, AlertCircle, Clock, Plus
} from 'lucide-react'
import Link from 'next/link'

export default function LocataireDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<any>({})
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('tenants')
      .select(`
        *,
        leases(
          id, is_active, monthly_rent, monthly_charges, deposit, start_date, end_date,
          property:properties(id, name, address, city),
          payments(id, status, amount, due_date)
        )
      `)
      .eq('id', id)
      .single()
    setTenant(data)
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
            <Link href="/baux"
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border"
              style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
              <Plus className="h-4 w-4" /> Créer un bail
            </Link>
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
      {activeLease && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Loyer mensuel', value: formatCurrency(activeLease.monthly_rent), color: 'var(--text-primary)' },
            { label: 'Total encaissé', value: formatCurrency(totalEncaisse), color: '#059669' },
            { label: 'En retard', value: formatCurrency(totalRetard), color: totalRetard > 0 ? '#DC2626' : 'var(--text-tertiary)' },
            { label: 'Dépôt de garantie', value: formatCurrency(activeLease.deposit ?? 0), color: '#1D4ED8' },
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

        {/* Bail associé */}
        <GlassCard>
          <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText className="h-4 w-4" /> Bail associé
          </h2>
          {activeLease ? (
            <div className="space-y-2">
              {[
                { label: 'Bien', value: activeLease.property?.name ?? '—' },
                { label: 'Loyer HC', value: formatCurrency(activeLease.monthly_rent) },
                { label: 'Charges', value: formatCurrency(activeLease.monthly_charges ?? 0) },
                { label: 'Dépôt', value: formatCurrency(activeLease.deposit ?? 0) },
                { label: 'Début', value: activeLease.start_date ? format(new Date(activeLease.start_date), 'd MMM yyyy', { locale: fr }) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1.5 px-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
              <Link href="/baux" className="flex items-center justify-center gap-2 mt-2 h-8 rounded-lg text-xs font-medium border"
                style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
                <FileText className="h-3.5 w-3.5" /> Voir dans les baux
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Aucun bail actif pour ce locataire
              </p>
              <Link href="/baux"
                className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white"
                style={{ background: '#1D4ED8' }}>
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
    </div>
  )
}
