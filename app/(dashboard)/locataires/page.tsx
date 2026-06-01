'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Users, Phone, Mail, ChevronRight, Plus, X, Shield, User } from 'lucide-react'
import Link from 'next/link'

const FORM_INIT = {
  full_name: '', email: '', phone: '', address_before: '',
  guarantor_name: '', guarantor_phone: '', guarantor_email: '', notes: '',
}

export default function LocatairesPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(FORM_INIT)
  const supabase = createClient()

  const load = async () => {
    const { data } = await supabase
      .from('tenants')
      .select(`*, leases(id, is_active, monthly_rent, property:properties(name))`)
      .order('created_at', { ascending: false })
    setTenants(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Non connecté'); return }
    const { error } = await supabase.from('tenants').insert({ ...form, user_id: user.id })
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Fiche locataire créée')
    setShowAdd(false)
    setForm(FORM_INIT)
    load()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Locataires</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {tenants.length} fiche(s) locataire
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white"
          style={{ background: '#1D4ED8' }}>
          <Plus className="h-4 w-4" /> Nouveau locataire
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)' }} />)}</div>
      ) : tenants.length === 0 ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 mb-4" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Aucun locataire</p>
            <p className="text-sm mt-2 mb-6" style={{ color: 'var(--text-secondary)' }}>
              Créez d'abord une fiche locataire, puis associez-la à un bail
            </p>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold"
              style={{ background: '#1D4ED8' }}>
              <Plus className="h-4 w-4" /> Créer une fiche locataire
            </button>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {tenants.map(tenant => {
            const activeLease = tenant.leases?.find((l: any) => l.is_active)
            return (
              <Link key={tenant.id} href={`/locataires/${tenant.id}`}>
                <div className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  {/* Avatar */}
                  <div className="h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1D4ED8, #0891B2)' }}>
                    {tenant.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {tenant.full_name}
                      </p>
                      {activeLease ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700">
                          Bail actif — {activeLease.property?.name}
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                          Sans bail
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {tenant.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{tenant.email}</span>}
                      {tenant.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{tenant.phone}</span>}
                      {tenant.guarantor_name && <span className="flex items-center gap-1"><Shield className="h-3 w-3" />Garant : {tenant.guarantor_name}</span>}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Modal création locataire */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                Nouvelle fiche locataire
              </h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)' }}>
                <X className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4">
              {/* Infos locataire */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <User className="h-3.5 w-3.5" /> Informations locataire
                </p>
                <div className="space-y-3">
                  {[
                    { key: 'full_name', label: 'Nom complet *', placeholder: 'Martin Sophie', required: true },
                    { key: 'email', label: 'Email', placeholder: 'sophie.martin@email.com', type: 'email' },
                    { key: 'phone', label: 'Téléphone', placeholder: '06 12 34 56 78' },
                    { key: 'address_before', label: 'Adresse précédente', placeholder: '5 rue Hugo, Paris' },
                  ].map(({ key, label, placeholder, type = 'text', required }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</label>
                      <input type={type} placeholder={placeholder} value={(form as any)[key]} required={required}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Garant */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"
                  style={{ color: 'var(--text-tertiary)' }}>
                  <Shield className="h-3.5 w-3.5" /> Garant (optionnel)
                </p>
                <div className="space-y-3">
                  {[
                    { key: 'guarantor_name', label: 'Nom du garant', placeholder: 'Martin Pierre' },
                    { key: 'guarantor_phone', label: 'Téléphone garant', placeholder: '06 98 76 54 32' },
                    { key: 'guarantor_email', label: 'Email garant', placeholder: 'pierre.martin@email.com', type: 'email' },
                  ].map(({ key, label, placeholder, type = 'text' }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</label>
                      <input type={type} placeholder={placeholder} value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notes</label>
                <textarea placeholder="Observations, remarques..." value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full h-20 px-3 py-2 rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>

              <button type="submit" disabled={saving}
                className="w-full h-11 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#1D4ED8' }}>
                {saving ? 'Enregistrement...' : 'Créer la fiche locataire'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
