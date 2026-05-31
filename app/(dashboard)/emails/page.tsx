'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCopilot } from '@/hooks/useCopilot'
import { toast } from 'sonner'
import {
  Mail, Sparkles, Send, Copy, CheckCircle, ChevronRight,
  Banknote, FileText, Wrench, Shield, Star, Edit3, RefreshCw, Bot, Upload, FolderOpen, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'

// ─── Templates ────────────────────────────────────────────────────────────

interface Template {
  id: string
  label: string
  subject: string
  category: string
  vars: string[]
  body: string
}

const CATEGORIES = [
  { id: 'loyers', label: 'Loyers', icon: Banknote },
  { id: 'baux', label: 'Baux', icon: FileText },
  { id: 'travaux', label: 'Travaux', icon: Wrench },
  { id: 'garanties', label: 'Garanties', icon: Shield },
  { id: 'bienvenue', label: 'Relationnel', icon: Star },
]

const TEMPLATES: Template[] = [
  // LOYERS
  {
    id: 'appel_loyer', category: 'loyers', label: 'Appel de loyer mensuel',
    subject: 'Appel de loyer — {mois} — {adresse}',
    vars: ['locataire', 'mois', 'adresse', 'loyer_hc', 'charges', 'total', 'echeance'],
    body: `Bonjour {locataire},

Votre loyer pour le logement situé {adresse} est à régler avant le {echeance}.

Détail :
• Loyer hors charges : {loyer_hc} €
• Provisions sur charges : {charges} €
• Total à régler : {total} €

Merci de bien vouloir effectuer votre virement aux coordonnées habituelles.

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'relance_1', category: 'loyers', label: 'Relance — 1er rappel (courtois)',
    subject: 'Rappel loyer — {mois} — {adresse}',
    vars: ['locataire', 'mois', 'adresse', 'total', 'date_echeance'],
    body: `Bonjour {locataire},

Sauf erreur de notre part, nous n'avons pas encore reçu votre règlement du loyer de {mois} d'un montant de {total} €, dû le {date_echeance}, pour le logement situé {adresse}.

Si vous avez déjà effectué ce virement, merci d'ignorer ce message.

Dans le cas contraire, nous vous remercions de bien vouloir régulariser cette situation dans les meilleurs délais.

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'relance_2', category: 'loyers', label: 'Relance — 2ème (ferme)',
    subject: 'Deuxième relance — Loyer impayé {mois} — {adresse}',
    vars: ['locataire', 'mois', 'adresse', 'total', 'date_echeance', 'retard_jours'],
    body: `Bonjour {locataire},

Malgré notre précédent rappel, nous constatons que votre loyer de {mois} d'un montant de {total} €, échu le {date_echeance}, n'a toujours pas été réglé ({retard_jours} jours de retard).

Nous vous demandons de procéder au paiement dans un délai de 48 heures.

Sans retour de votre part, nous nous verrons contraints d'envoyer une mise en demeure.

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'confirmation_paiement', category: 'loyers', label: 'Confirmation de réception',
    subject: 'Confirmation réception loyer — {mois}',
    vars: ['locataire', 'mois', 'total', 'date_paiement'],
    body: `Bonjour {locataire},

Nous confirmons la bonne réception de votre règlement de {total} € pour le mois de {mois}, reçu le {date_paiement}.

Nous vous adresserons votre quittance dans les prochains jours.

Cordialement,
Votre propriétaire`,
  },
  // BAUX
  {
    id: 'revision_irl', category: 'baux', label: 'Révision de loyer (IRL)',
    subject: 'Révision annuelle de votre loyer — {adresse}',
    vars: ['locataire', 'adresse', 'ancien_loyer', 'nouveau_loyer', 'indice_ref', 'indice_new', 'trimestre', 'date_effet'],
    body: `Bonjour {locataire},

Conformément à la clause d'indexation de votre bail, je vous informe de la révision annuelle de votre loyer pour le logement sis {adresse}.

Calcul de révision :
• Ancien loyer : {ancien_loyer} €
• Indice de référence : {indice_ref} (à la signature)
• Nouvel indice IRL : {indice_new} ({trimestre})
• Nouveau loyer : {nouveau_loyer} €

Cette révision prend effet à compter du {date_effet}.

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'renouvellement', category: 'baux', label: 'Proposition renouvellement',
    subject: 'Renouvellement de bail — {adresse}',
    vars: ['locataire', 'adresse', 'date_fin', 'nouveau_loyer'],
    body: `Bonjour {locataire},

Votre bail pour le logement situé {adresse} arrive à échéance le {date_fin}.

Nous avons le plaisir de vous proposer son renouvellement aux conditions suivantes :
• Durée : 1 an renouvelable
• Loyer mensuel révisé : {nouveau_loyer} €

Merci de bien vouloir nous confirmer votre accord avant le [date limite].

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'bienvenue_locataire', category: 'bienvenue', label: 'Bienvenue nouveau locataire',
    subject: 'Bienvenue dans votre nouveau logement — {adresse}',
    vars: ['locataire', 'adresse', 'date_entree', 'loyer_total', 'echeance_jour', 'proprietaire'],
    body: `Bonjour {locataire},

Bienvenue dans votre nouveau logement situé {adresse} !

Voici les informations pratiques pour votre installation :

📋 Votre bail a pris effet le {date_entree}.
💶 Votre loyer charges comprises est de {loyer_total} €, à régler le {echeance_jour} de chaque mois.
📄 Une quittance vous sera envoyée après chaque règlement.

Pour toute question ou signalement d'incident, n'hésitez pas à me contacter directement.

Encore bienvenue et bon emménagement !

Cordialement,
{proprietaire}`,
  },
  // TRAVAUX
  {
    id: 'notification_travaux', category: 'travaux', label: 'Notification travaux (propriétaire)',
    subject: 'Information — Travaux programmés — {adresse}',
    vars: ['locataire', 'adresse', 'type_travaux', 'date_debut', 'date_fin', 'entreprise'],
    body: `Bonjour {locataire},

Je vous informe que des travaux vont être réalisés dans votre logement situé {adresse}.

Nature des travaux : {type_travaux}
Date de début : {date_debut}
Date de fin prévue : {date_fin}
Entreprise intervenante : {entreprise}

Ces travaux nécessiteront votre présence / votre accord d'accès au logement. Merci de me confirmer votre disponibilité.

Nous nous excusons pour la gêne occasionnée.

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'signalement_reparation', category: 'travaux', label: 'Accusé réception signalement',
    subject: 'Prise en charge de votre signalement — {adresse}',
    vars: ['locataire', 'adresse', 'description_panne', 'delai_intervention'],
    body: `Bonjour {locataire},

Nous accusons réception de votre signalement concernant {description_panne} au logement {adresse}.

Nous prenons en charge cette intervention et vous confirmons une réponse sous {delai_intervention}.

Un artisan vous contactera directement pour convenir d'un rendez-vous.

Cordialement,
Votre propriétaire`,
  },
  // GARANTIES
  {
    id: 'demande_assurance', category: 'garanties', label: 'Demande attestation assurance',
    subject: 'Demande d\'attestation d\'assurance habitation — {adresse}',
    vars: ['locataire', 'adresse', 'date_expiration'],
    body: `Bonjour {locataire},

Votre attestation d'assurance habitation pour le logement {adresse} expire le {date_expiration}.

Conformément à l'article 7-g de la loi du 6 juillet 1989, nous vous demandons de nous transmettre votre nouvelle attestation dès que possible.

Sans retour de votre part, nous pourrions être amenés à souscrire une assurance pour votre compte, dont les frais vous seraient répercutés.

Cordialement,
Votre propriétaire`,
  },
  {
    id: 'restitution_dg', category: 'garanties', label: 'Restitution dépôt de garantie',
    subject: 'Restitution de votre dépôt de garantie — {adresse}',
    vars: ['locataire', 'adresse', 'depot_initial', 'retenue', 'motif_retenue', 'montant_restitue'],
    body: `Bonjour {locataire},

Suite à votre départ du logement {adresse} et conformément à l'article 22 de la loi du 6 juillet 1989, voici le décompte de restitution de votre dépôt de garantie :

• Dépôt initial : {depot_initial} €
• Retenue : {retenue} € ({motif_retenue})
• Montant restitué : {montant_restitue} €

Ce montant vous sera versé par virement dans les meilleurs délais.

Cordialement,
Votre propriétaire`,
  },
]

// ─── Variables par défaut ─────────────────────────────────────────────────

const DEFAULT_VARS: Record<string, string> = {
  locataire: 'Sophie Martin',
  mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  adresse: '18 rue Lepic, Paris 18ème',
  loyer_hc: '980',
  charges: '80',
  total: '1 060',
  echeance: '5 ' + new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  date_echeance: `5 ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
  retard_jours: '8',
  date_paiement: new Date().toLocaleDateString('fr-FR'),
  ancien_loyer: '980',
  nouveau_loyer: '1 002',
  indice_ref: '131.67 (T3 2021)',
  indice_new: '147.88 (T2 2026)',
  trimestre: 'T2 2026',
  date_effet: '1er juillet 2026',
  date_fin: '31 août 2026',
  date_entree: new Date().toLocaleDateString('fr-FR'),
  loyer_total: '1 060',
  echeance_jour: '5',
  proprietaire: 'Votre propriétaire',
  type_travaux: 'Remplacement chauffe-eau',
  date_debut: '15 juin 2026',
  date_fin_travaux: '16 juin 2026',
  entreprise: 'Plomberie Dupont',
  description_panne: 'une fuite au niveau du robinet de cuisine',
  delai_intervention: '48 heures',
  date_expiration: '31 décembre 2026',
  depot_initial: '1 960',
  retenue: '250',
  motif_retenue: 'Dégradation peinture chambre',
  montant_restitue: '1 710',
  date_debut_bail: '1 septembre 2021',
  indice: 'IRL',
}

function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

// ─── Chat IA email ─────────────────────────────────────────────────────────

function IaPanel({ emailContent, onUpdate }: { emailContent: string; onUpdate: (s: string) => void }) {
  const { messages, isLoading, sendMessage } = useCopilot([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async (msg?: string) => {
    const text = msg ?? input.trim()
    if (!text || isLoading) return
    setInput('')
    const fullMsg = `Voici l'email actuel :\n\n${emailContent}\n\n---\nInstruction : ${text}\n\nRéponds UNIQUEMENT avec le nouveau contenu de l'email, sans explication.`
    await sendMessage(fullMsg)
  }

  // Extraire le dernier message assistant comme suggestion
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: '#1D4ED8' }}>
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Personnaliser avec l'IA
        </p>
      </div>

      {/* Suggestions rapides */}
      <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>Actions rapides</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Rends le ton plus ferme',
            'Rends le ton plus courtois',
            'Raccourcis à 3 lignes',
            'Ajoute une formule de politesse formelle',
            'Traduis en anglais',
            'Adapte pour une SCI',
          ].map(s => (
            <button key={s} onClick={() => handleSend(s)}
              className="text-xs px-2.5 py-1.5 rounded-full border transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--bg-card)' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Edit3 className="h-10 w-10 mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Décrivez comment modifier cet email
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Ex : "Ajoute le montant du retard", "Rends-le plus formel"
            </p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'assistant' && (
              <div className="h-6 w-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: '#1D4ED8' }}>
                <Bot className="h-3 w-3 text-white" />
              </div>
            )}
            <div className={cn('max-w-[88%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap',
              msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm')}
              style={msg.role === 'user'
                ? { background: '#1D4ED8', color: '#fff' }
                : { background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }
              }>
              {msg.content || <span className="flex gap-1 py-0.5">{[0,150,300].map(d => <span key={d} className="h-1.5 w-1.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Appliquer */}
      {lastAssistant?.content && (
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => onUpdate(lastAssistant.content)}
            className="w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: '#1D4ED8' }}>
            <RefreshCw className="h-3.5 w-3.5" /> Appliquer cette version
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2 px-3 py-2 rounded-xl border focus-within:border-blue-400 transition-all"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Ex: Rends le ton plus ferme..."
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none"
            style={{ color: 'var(--text-primary)', minHeight: '20px', maxHeight: '80px' }} />
          <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
            className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: '#1D4ED8' }}>
            <Send className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ───────────────────────────────────────────────────────

export default function EmailsPage() {
  const [selectedCat, setSelectedCat] = useState('loyers')
  const [selectedTpl, setSelectedTpl] = useState<Template>(TEMPLATES[0])
  const [vars, setVars] = useState<Record<string, string>>(DEFAULT_VARS)
  const [customBody, setCustomBody] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'email' | 'ia'>('email')
  const [copied, setCopied] = useState<'subject' | 'body' | null>(null)
  const [sending, setSending] = useState(false)
  const [leases, setLeases] = useState<any[]>([])
  const [selectedLease, setSelectedLease] = useState('')
  const [customTemplates, setCustomTemplates] = useState<Template[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const fileImportRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('leases').select('id, tenant_name, tenant_email, monthly_rent, charges, property:properties(name, address, city)').eq('is_active', true)
      .then(r => setLeases(r.data ?? []))
  }, [])

  // Quand on change de bail, on pré-remplit les variables
  useEffect(() => {
    if (!selectedLease) return
    const lease = leases.find(l => l.id === selectedLease)
    if (!lease) return
    const adresse = [lease.property?.address, lease.property?.city].filter(Boolean).join(', ')
    setVars(v => ({
      ...v,
      locataire: lease.tenant_name,
      adresse,
      loyer_hc: String(lease.monthly_rent ?? ''),
      charges: String(lease.charges ?? ''),
      total: String((lease.monthly_rent ?? 0) + (lease.charges ?? 0)),
    }))
  }, [selectedLease])

  const selectTemplate = (tpl: Template) => {
    setSelectedTpl(tpl)
    setCustomBody(null)
    setActiveTab('email')
  }

  const body = customBody ?? fillTemplate(selectedTpl.body, vars)
  const subject = fillTemplate(selectedTpl.subject, vars)

  const copy = (type: 'subject' | 'body') => {
    navigator.clipboard.writeText(type === 'subject' ? subject : body)
    setCopied(type)
    toast.success('Copié !')
    setTimeout(() => setCopied(null), 2000)
  }

  const sendEmail = async () => {
    const lease = leases.find(l => l.id === selectedLease)
    if (!lease?.tenant_email) { toast.error('Sélectionnez un bail avec email locataire'); return }
    setSending(true)
    const res = await fetch('/api/emails/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: lease.tenant_email, subject, body }),
    })
    setSending(false)
    if (res.ok) toast.success(`Email envoyé à ${lease.tenant_email}`)
    else toast.error('Erreur envoi — vérifiez la clé Resend')
  }

  const filteredTpls = [
    ...TEMPLATES.filter(t => t.category === selectedCat),
    ...customTemplates.filter(t => t.category === selectedCat),
  ]

  const handleImportFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      const name = file.name.replace(/\.(txt|html|htm)$/, '')
      const newTpl: Template = {
        id: 'custom-' + Date.now(),
        label: name,
        subject: name,
        category: selectedCat,
        vars: [],
        body: content,
      }
      setCustomTemplates(prev => [...prev, newTpl])
      selectTemplate(newTpl)
      toast.success(`Modèle "${name}" importé`)
    }
    reader.readAsText(file)
  }

  const deleteCustomTpl = (id: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== id))
    if (selectedTpl.id === id) selectTemplate(TEMPLATES[0])
    toast.success('Modèle supprimé')
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-56px)] flex flex-col gap-0 -mt-6 -mx-6 overflow-hidden">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display font-bold text-2xl" style={{ color: 'var(--text-primary)' }}>Emails</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Modèles pré-rédigés · Personnalisation IA · Envoi direct</p>
        </div>
        {/* Sélecteur de bail */}
        <select value={selectedLease} onChange={e => setSelectedLease(e.target.value)}
          className="h-9 px-3 rounded-xl text-sm border focus:outline-none"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)', minWidth: 200 }}>
          <option value="" className="bg-bg-secondary">— Choisir un locataire</option>
          {leases.map(l => (
            <option key={l.id} value={l.id} className="bg-bg-secondary">
              {l.tenant_name} · {l.property?.name}
            </option>
          ))}
        </select>
      </div>

      {/* Body : 3 colonnes */}
      <div className="flex flex-1 min-h-0 border-t" style={{ borderColor: 'var(--border)' }}>

        {/* ── Colonne 1 : Catégories + liste templates ── */}
        <div className="w-64 flex-shrink-0 border-r flex flex-col overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>

          {/* Catégories */}
          <div className="p-3 border-b space-y-0.5" style={{ borderColor: 'var(--border)' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={selectedCat === cat.id
                  ? { background: '#1D4ED8', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text-secondary)' }
                }>
                <cat.icon className="h-4 w-4 flex-shrink-0" />
                {cat.label}
                <span className="ml-auto text-xs opacity-60">
                  {TEMPLATES.filter(t => t.category === cat.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Liste templates */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {filteredTpls.map(tpl => (
              <button key={tpl.id} onClick={() => selectTemplate(tpl)}
                className="w-full flex items-center gap-2 px-3 py-3 rounded-xl text-left transition-all"
                style={{
                  background: selectedTpl.id === tpl.id ? 'var(--bg-card)' : 'transparent',
                  border: selectedTpl.id === tpl.id ? '1px solid var(--border)' : '1px solid transparent',
                  color: 'var(--text-primary)',
                  boxShadow: selectedTpl.id === tpl.id ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                }}>
                <Mail className="h-4 w-4 flex-shrink-0" style={{ color: selectedTpl.id === tpl.id ? '#1D4ED8' : 'var(--text-tertiary)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tpl.label}</p>
                  {tpl.id.startsWith('custom-') && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                      Perso
                    </span>
                  )}
                </div>
                {tpl.id.startsWith('custom-') && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteCustomTpl(tpl.id) }}
                    className="h-5 w-5 rounded flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0"
                    style={{ color: '#B91C1C' }}>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {selectedTpl.id === tpl.id && !tpl.id.startsWith('custom-') && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#1D4ED8' }} />}
              </button>
            ))}
          </div>

          {/* Bouton importer */}
          <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => fileImportRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border border-dashed hover:opacity-80"
              style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
              <Upload className="h-4 w-4" />
              Importer mon modèle
            </button>
            <input
              ref={fileImportRef}
              type="file"
              accept=".txt,.html,.htm"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = '' }}
            />
            <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--text-tertiary)' }}>
              .txt · .html · Max 500 Ko
            </p>
          </div>
        </div>

        {/* ── Colonne 2 : Email ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Onglets */}
          <div className="flex border-b px-4 gap-1 pt-2 flex-shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            {[
              { id: 'email' as const, label: 'Email', icon: Mail },
              { id: 'ia' as const, label: 'Personnaliser avec l\'IA', icon: Sparkles },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 -mb-px transition-all',
                  activeTab === tab.id ? 'border-[#1D4ED8] text-[#1D4ED8]' : 'border-transparent')}
                style={{ color: activeTab === tab.id ? '#1D4ED8' : 'var(--text-secondary)' }}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenu onglet Email */}
          {activeTab === 'email' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Objet */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Objet</label>
                  <button onClick={() => copy('subject')} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-all hover:bg-blue-50 hover:text-blue-600" style={{ color: 'var(--text-tertiary)' }}>
                    {copied === 'subject' ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />} Copier
                  </button>
                </div>
                <div className="px-4 py-3 rounded-xl font-semibold text-sm" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {subject}
                </div>
              </div>

              {/* Corps */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Corps de l'email</label>
                  <button onClick={() => copy('body')} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-all hover:bg-blue-50 hover:text-blue-600" style={{ color: 'var(--text-tertiary)' }}>
                    {copied === 'body' ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />} Copier
                  </button>
                </div>
                <textarea
                  value={body}
                  onChange={e => setCustomBody(e.target.value)}
                  className="w-full text-sm leading-relaxed rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', minHeight: '280px', fontFamily: 'var(--font-dm-sans)',
                  }}
                  rows={14}
                />
              </div>


              {/* Actions */}
              <div className="flex gap-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button onClick={() => copy('body')}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold border transition-all"
                  style={{ borderColor: '#1D4ED8', color: '#1D4ED8', background: '#EFF6FF' }}>
                  <Copy className="h-4 w-4" /> Copier l'email
                </button>
                <button onClick={sendEmail} disabled={sending || !selectedLease}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                  style={{ background: '#1D4ED8' }}>
                  {sending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Envoi...</> : <><Send className="h-4 w-4" /> Envoyer</>}
                </button>
              </div>
              {!selectedLease && (
                <p className="text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                  Sélectionnez un locataire en haut pour pouvoir envoyer
                </p>
              )}
            </div>
          )}

          {/* Contenu onglet IA */}
          {activeTab === 'ia' && (
            <div className="flex-1 overflow-hidden">
              <IaPanel emailContent={body} onUpdate={s => { setCustomBody(s); setActiveTab('email') }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
