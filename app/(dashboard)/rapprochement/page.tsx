'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Building2, RefreshCw, CheckCircle2, AlertTriangle,
  Loader2, Search, Link2, Unlink, ChevronLeft, Landmark
} from 'lucide-react'
import Link from 'next/link'

interface Institution {
  id: string
  name: string
  logo: string
  countries: string[]
}

export default function RapprochementPage() {
  const searchParams = useSearchParams()
  const [connection, setConnection] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showBanks, setShowBanks] = useState(false)
  const [search, setSearch] = useState('')
  const [syncResult, setSyncResult] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (searchParams.get('connected') === '1') toast.success('Banque connectée avec succès !')
    if (searchParams.get('error')) toast.error('Erreur connexion : ' + searchParams.get('error'))
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [connRes, txRes] = await Promise.all([
      supabase.from('banking_connections').select('*').eq('user_id', user.id).eq('status', 'active').single(),
      supabase.from('banking_transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
    ])

    setConnection(connRes.data)
    setTransactions(txRes.data ?? [])
    setLoading(false)
  }

  const loadInstitutions = async () => {
    if (institutions.length > 0) { setShowBanks(true); return }
    const res = await fetch('/api/banking/institutions?country=fr')
    if (res.ok) { setInstitutions(await res.json()); setShowBanks(true) }
    else toast.error('Nordigen non configuré — ajoutez vos clés API dans .env.local')
  }

  const connectBank = async (institutionId: string) => {
    setConnecting(true)
    try {
      const res = await fetch('/api/banking/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution_id: institutionId }),
      })
      const data = await res.json()
      if (res.ok) {
        window.location.href = data.link
      } else {
        toast.error(data.error)
      }
    } finally {
      setConnecting(false)
    }
  }

  const sync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/banking/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSyncResult(data)
        toast.success(data.message)
        load()
      } else {
        toast.error(data.error)
      }
    } finally {
      setSyncing(false)
    }
  }

  const manualMatch = async (txId: string, paymentId: string) => {
    await supabase.from('banking_transactions').update({ matched_payment_id: paymentId, match_status: 'matched' }).eq('id', txId)
    await supabase.from('payments').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', paymentId)
    toast.success('Rapprochement effectué')
    load()
  }

  const filteredBanks = institutions.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/loyers" className="text-sm flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
            <ChevronLeft className="h-4 w-4" /> Loyers
          </Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <h1 className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
            Rapprochement bancaire
          </h1>
        </div>
        {connection && (
          <button onClick={sync} disabled={syncing}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
            style={{ background: '#1D4ED8' }}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
          </button>
        )}
      </div>

      {/* Résultat sync */}
      {syncResult && (
        <GlassCard glow="green" className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-success-text" />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Synchronisation terminée
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {syncResult.transactions_importees} transactions · {syncResult.loyers_rapproches} loyers rapprochés automatiquement
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Connexion bancaire */}
      {!connection ? (
        <GlassCard>
          <div className="text-center py-8">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#EFF6FF' }}>
              <Landmark className="h-8 w-8" style={{ color: '#1D4ED8' }} />
            </div>
            <h2 className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
              Connectez votre banque
            </h2>
            <p className="text-sm mb-2 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Via Open Banking (PSD2) — connexion sécurisée, lecture seule.
              Patrimo détecte automatiquement les loyers reçus.
            </p>
            <p className="text-xs mb-6" style={{ color: 'var(--text-tertiary)' }}>
              🔒 Accès lecture seule · Données chiffrées · RGPD · 2 300+ banques européennes
            </p>
            <button onClick={loadInstitutions} disabled={connecting}
              className="flex items-center gap-2 h-11 px-6 rounded-xl text-white font-semibold mx-auto disabled:opacity-50"
              style={{ background: '#1D4ED8' }}>
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Connecter ma banque
            </button>
          </div>
        </GlassCard>
      ) : (
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <Landmark className="h-5 w-5" style={{ color: '#1D4ED8' }} />
            </div>
            <div className="flex-1">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                {connection.institution_name ?? connection.institution_id}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {connection.iban ?? 'IBAN en cours de récupération'}
              </p>
              {connection.last_sync_at && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Dernière sync : {format(new Date(connection.last_sync_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#E8F7F0', color: '#166534' }}>
              ✓ Connectée
            </span>
          </div>
        </GlassCard>
      )}

      {/* Sélection de banque */}
      {showBanks && !connection && (
        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              <input type="text" placeholder="Rechercher votre banque..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl text-sm focus:outline-none"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
            {filteredBanks.map(inst => (
              <button key={inst.id} onClick={() => connectBank(inst.id)} disabled={connecting}
                className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all hover:shadow-sm hover:-translate-y-0.5 disabled:opacity-50"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                {inst.logo
                  ? <img src={inst.logo} alt={inst.name} className="h-8 w-8 object-contain rounded-lg" />
                  : <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
                      <Building2 className="h-4 w-4" style={{ color: '#1D4ED8' }} />
                    </div>
                }
                <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{inst.name}</span>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Transactions */}
      {connection && (
        <GlassCard>
          <h2 className="font-display font-semibold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
            Transactions récentes
          </h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }} />)}</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Aucune transaction — cliquez sur "Synchroniser" pour importer
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold border-b" style={{ color: 'var(--text-tertiary)', borderColor: 'var(--border)' }}>
                    {['Date','Description','Montant','Statut'].map(h =>
                      <th key={h} className="text-left py-2.5 px-3">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                      <td className="py-3 px-3 whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                        {format(new Date(tx.date), 'dd/MM/yy')}
                      </td>
                      <td className="py-3 px-3 max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {tx.debtor_name ?? tx.description ?? '—'}
                      </td>
                      <td className="py-3 px-3 font-semibold font-mono whitespace-nowrap" style={{ color: '#166534' }}>
                        +{formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-3">
                        {tx.match_status === 'matched' ? (
                          <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: '#E8F7F0', color: '#166534' }}>
                            <CheckCircle2 className="h-3 w-3" /> Rapproché
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
                            Non rapproché
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Info */}
      <div className="p-4 rounded-xl text-sm text-center" style={{ background: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
        🔒 Connexion Open Banking PSD2 via GoCardless Bank Account Data · Accès lecture seule · Gratuit jusqu'à 50 connexions
      </div>
    </div>
  )
}
