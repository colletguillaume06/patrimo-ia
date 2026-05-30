'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Plus, X, Phone, Mail, User, Building2, Search } from 'lucide-react'

const ROLES: Record<string, { label: string; icon: string }> = {
  artisan_plombier: { label: 'Plombier', icon: '🔧' },
  artisan_electricien: { label: 'Électricien', icon: '⚡' },
  artisan_general: { label: 'Artisan général', icon: '🛠️' },
  syndic: { label: 'Syndic', icon: '🏢' },
  notaire: { label: 'Notaire', icon: '⚖️' },
  agence: { label: 'Agence immobilière', icon: '🏠' },
  assureur: { label: 'Assureur', icon: '🛡️' },
  banque: { label: 'Banque', icon: '🏦' },
  expert_comptable: { label: 'Expert-comptable', icon: '📊' },
  huissier: { label: 'Huissier', icon: '📋' },
  autre: { label: 'Autre', icon: '👤' },
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ property_id: '', nom: '', prenom: '', role: 'artisan_general', entreprise: '', telephone: '', email: '', notes: '' })
  const supabase = createClient()

  const load = async () => {
    const [cRes, pRes] = await Promise.all([
      supabase.from('contacts_bien').select('*, property:properties(name)').order('nom'),
      supabase.from('properties').select('id, name').order('name'),
    ])
    setContacts(cRes.data ?? [])
    setProperties(pRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('contacts_bien').insert(form)
    if (error) { toast.error(error.message); return }
    toast.success('Contact ajouté')
    setShowAdd(false)
    setForm({ property_id: '', nom: '', prenom: '', role: 'artisan_general', entreprise: '', telephone: '', email: '', notes: '' })
    load()
  }

  const filtered = contacts.filter(c => {
    const matchSearch = !search || [c.nom, c.prenom, c.entreprise, c.email].join(' ').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || c.role === roleFilter
    return matchSearch && matchRole
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">Carnet de contacts</h1>
          <p className="text-slate-400 text-sm mt-1">{contacts.length} contact{contacts.length > 1 ? 's' : ''} · tous biens</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all">
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="h-10 px-3 rounded-xl bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
          <option value="all" className="bg-[var(--surface)]">Tous les rôles</option>
          {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.icon} {v.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-16 text-center"><p className="text-slate-400">Aucun contact</p></GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => {
            const role = ROLES[c.role] ?? { label: c.role, icon: '👤' }
            return (
              <GlassCard key={c.id} hover className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/[0.06] flex items-center justify-center text-xl flex-shrink-0">{role.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{c.prenom} {c.nom}</p>
                    {c.entreprise && <p className="text-xs text-slate-400">{c.entreprise}</p>}
                    <p className="text-xs text-slate-500">{role.label} · {c.property?.name ?? 'Tous biens'}</p>
                    <div className="flex gap-3 mt-2">
                      {c.telephone && (
                        <a href={`tel:${c.telephone}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                          <Phone className="h-3 w-3" /> {c.telephone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                          <Mail className="h-3 w-3" /> {c.email}
                        </a>
                      )}
                    </div>
                    {c.notes && <p className="text-xs text-slate-600 mt-1 line-clamp-1">{c.notes}</p>}
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-lg bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-[var(--text-primary)]">Nouveau contact</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bien associé</label>
                <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
                  <option value="" className="bg-[var(--surface)]">Tous les biens</option>
                  {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Rôle *</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} required
                  className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none">
                  {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.icon} {v.label}</option>)}
                </select>
              </div>
              {[
                { key: 'nom', label: 'Nom *', required: true },
                { key: 'prenom', label: 'Prénom' },
                { key: 'entreprise', label: 'Entreprise' },
                { key: 'telephone', label: 'Téléphone' },
                { key: 'email', label: 'Email', type: 'email' },
              ].map(({ key, label, required, type = 'text' }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required={required}
                    className="w-full h-10 px-3 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] placeholder-slate-600 text-sm focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.10] text-[var(--text-primary)] text-sm focus:outline-none resize-none" />
              </div>
              <button type="submit" className="w-full h-10 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold transition-all">
                Ajouter le contact
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
