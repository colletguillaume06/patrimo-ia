'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { toast } from 'sonner'
import { Shield, Plus, Loader2, CheckCircle, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [form, setForm] = useState({ email: '', full_name: '', type: 'trial_3m' })
  const [creating, setCreating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!data?.is_admin) { router.push('/dashboard'); return }
      setIsAdmin(true)

      // Charger les utilisateurs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, subscription_status, trial_ends_at, created_at')
        .order('created_at', { ascending: false })
      setUsers(profiles ?? [])
      setLoading(false)
    }
    check()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/admin/create-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) {
      toast.success(data.message)
      setForm({ email: '', full_name: '', type: 'trial_3m' })
      // Rafraîchir la liste
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, subscription_status, trial_ends_at, created_at')
        .order('created_at', { ascending: false })
      setUsers(profiles ?? [])
    } else {
      toast.error(data.error)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--accent)' }} /></div>
  if (!isAdmin) return null

  const statusColors: Record<string, string> = {
    trial: '#1D4ED8',
    active: '#059669',
    expired: '#DC2626',
    admin_free: '#7C3AED',
  }
  const statusLabels: Record<string, string> = {
    trial: 'Essai',
    active: 'Abonné',
    expired: 'Expiré',
    admin_free: '✨ Gratuit',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#FEF2F2' }}>
          <Shield className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>
            Administration
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Accès restreint — Propriétaire uniquement</p>
        </div>
      </div>

      {/* Créer un accès */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Plus className="h-4 w-4" /> Créer un accès
        </h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none bg-white border border-slate-200 text-[#0F172A]"
                placeholder="ami@email.fr" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Nom (optionnel)</label>
              <input type="text" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none bg-white border border-slate-200 text-[#0F172A]"
                placeholder="Prénom Nom" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 text-[#0F172A]">Type d'accès</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'trial_3m', label: '3 mois gratuits', desc: 'Essai prolongé' },
                { value: 'trial_6m', label: '6 mois gratuits', desc: 'Accès ami' },
                { value: 'free', label: 'Gratuit permanent', desc: 'Accès VIP' },
              ].map(opt => (
                <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, type: opt.value }))}
                  className="p-3 rounded-xl text-left border transition-all"
                  style={{ borderColor: form.type === opt.value ? '#1D4ED8' : '#E2E8F0', background: form.type === opt.value ? '#EFF6FF' : 'white' }}>
                  <p className="text-xs font-bold" style={{ color: form.type === opt.value ? '#1D4ED8' : '#0F172A' }}>{opt.label}</p>
                  <p className="text-[10px] text-slate-500">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={creating}
            className="flex items-center gap-2 h-10 px-6 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
            style={{ background: '#1D4ED8' }}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? 'Création...' : 'Créer l\'accès'}
          </button>
        </form>
      </GlassCard>

      {/* Liste des utilisateurs */}
      <GlassCard>
        <h2 className="font-display font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Users className="h-4 w-4" /> Utilisateurs ({users.length})
        </h2>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name || '—'}</p>
                {u.trial_ends_at && u.subscription_status === 'trial' && (
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    Essai jusqu'au {new Date(u.trial_ends_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${statusColors[u.subscription_status] ?? '#94A3B8'}15`, color: statusColors[u.subscription_status] ?? '#94A3B8' }}>
                {statusLabels[u.subscription_status] ?? u.subscription_status}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
