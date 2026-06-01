'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import { Upload, CheckCircle2, XCircle, Plus, X, FileText, Loader2 } from 'lucide-react'

export default function RapprochementPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [form, setForm] = useState({ date: '', libelle: '', montant: '' })
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = async () => {
    const [tRes, pRes] = await Promise.all([
      supabase.from('rapprochement_transactions').select('*').order('date', { ascending: false }),
      supabase.from('payments').select('*, lease:leases(tenant_name, property:properties(name))').eq('status', 'pending'),
    ])
    setTransactions(tRes.data ?? [])
    setPayments(pRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await supabase.from('rapprochement_transactions').insert({ date: form.date, libelle: form.libelle, montant: Number(form.montant), statut: 'non_rapproché' })
    setSaving(false); toast.success('Transaction ajoutée'); setShowAdd(false)
    setForm({ date: '', libelle: '', montant: '' }); load()
  }

  const handleCSV = async (file: File) => {
    setImporting(true)
    const text = await file.text()
    const lines = text.split('\n').filter(l => l.trim())
    const inserts: any[] = []
    for (const line of lines.slice(1)) {
      const cols = line.split(/[;,]/).map(c => c.trim().replace(/"/g, ''))
      if (cols.length < 3) continue
      const [dateRaw, libelle, montantRaw] = cols
      const montant = parseFloat(montantRaw.replace(',', '.'))
      if (isNaN(montant) || !libelle) continue
      let date = dateRaw
      if (dateRaw.includes('/')) { const [d, m, y] = dateRaw.split('/'); date = `${y}-${m}-${d}` }
      inserts.push({ date, libelle, montant, statut: 'non_rapproché' })
    }
    if (inserts.length === 0) { toast.error('Aucune ligne valide. Format : Date;Libellé;Montant'); setImporting(false); return }
    await supabase.from('rapprochement_transactions').insert(inserts)
    setImporting(false); toast.success(`${inserts.length} transactions importées`); load()
  }

  const handleRapprocher = async (txId: string, paymentId: string) => {
    await Promise.all([
      supabase.from('rapprochement_transactions').update({ statut: 'rapproché', payment_id: paymentId }).eq('id', txId),
      supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString() }).eq('id', paymentId),
    ])
    toast.success('Loyer rapproché et marqué comme reçu ✓'); load()
  }

  const handleIgnorer = async (txId: string) => {
    await supabase.from('rapprochement_transactions').update({ statut: 'ignoré' }).eq('id', txId); load()
  }

  const nonRapprochees = transactions.filter(t => t.statut === 'non_rapproché')
  const rapprochees = transactions.filter(t => t.statut === 'rapproché')
  const total = transactions.reduce((s, t) => s + t.montant, 0)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Rapprochement bancaire</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Importez votre relevé CSV ou saisissez les transactions manuellement</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border transition-all"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--brand-light, #EEF3FF)' }}>
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importer CSV
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold text-white"
            style={{ background: '#1D4ED8' }}>
            <Plus className="h-4 w-4" /> Saisie manuelle
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCSV(f); e.target.value = '' }} />
      </div>

      <div className="p-3 rounded-xl text-sm flex items-start gap-3"
        style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
        <FileText className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-0.5">Format CSV attendu</p>
          <p className="text-xs font-mono">Date;Libellé;Montant &nbsp;→&nbsp; ex: 01/06/2026;VIR MARTIN SOPHIE;950</p>
          <p className="text-xs mt-1">Compatible BNP, Crédit Agricole, Boursorama, Société Générale, LCL…</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total importé', value: formatCurrency(total), color: 'var(--text-primary)' },
          { label: 'À rapprocher', value: String(nonRapprochees.length), color: '#F59E0B' },
          { label: 'Rapprochées', value: String(rapprochees.length), color: 'var(--success)' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
            <p className="text-xl font-bold font-mono" style={{ color }}>{value}</p>
          </GlassCard>
        ))}
      </div>

      {nonRapprochees.length > 0 && (
        <GlassCard>
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>À rapprocher ({nonRapprochees.length})</h2>
          <div className="space-y-3">
            {nonRapprochees.map(tx => (
              <div key={tx.id} className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tx.libelle}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{format(new Date(tx.date), 'dd MMMM yyyy', { locale: fr })}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-bold font-mono" style={{ color: 'var(--success)' }}>+{formatCurrency(tx.montant)}</p>
                    <button onClick={() => handleIgnorer(tx.id)} title="Ignorer"
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors">
                      <XCircle className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
                {payments.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Associer à un loyer :</p>
                    <div className="flex flex-wrap gap-2">
                      {payments.map(p => (
                        <button key={p.id} onClick={() => handleRapprocher(tx.id, p.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:shadow-sm"
                          style={{ borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--brand-light, #EEF3FF)' }}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {p.lease?.tenant_name} — {p.lease?.property?.name} — {formatCurrency(p.amount)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {rapprochees.length > 0 && (
        <GlassCard>
          <h2 className="font-display font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Rapprochées ✓ ({rapprochees.length})</h2>
          <div className="space-y-2">
            {rapprochees.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{tx.libelle}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{format(new Date(tx.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <p className="text-sm font-semibold font-mono" style={{ color: 'var(--success)' }}>+{formatCurrency(tx.montant)}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {transactions.length === 0 && !loading && (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Upload className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Aucune transaction</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Importez votre relevé CSV ou saisissez une transaction manuellement</p>
          </div>
        </GlassCard>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold" style={{ color: 'var(--text-primary)' }}>Saisie manuelle</h2>
              <button onClick={() => setShowAdd(false)} className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
                <X className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              {[
                { key: 'date', label: 'Date *', type: 'date' },
                { key: 'libelle', label: 'Libellé *', type: 'text', placeholder: 'VIR MARTIN SOPHIE' },
                { key: 'montant', label: 'Montant (€) *', type: 'number', placeholder: '950' },
              ].map(({ key, label, type, placeholder }: any) => (
                <div key={key}>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} required
                    className="w-full h-10 px-3 rounded-lg text-sm focus:outline-none"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>
              ))}
              <button type="submit" disabled={saving}
                className="w-full h-10 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: '#1D4ED8' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
