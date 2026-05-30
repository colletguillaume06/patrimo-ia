'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { GlassCard } from '@/components/ui/GlassCard'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Upload, Folder, FileText, X, Search, Download, Loader2, Eye } from 'lucide-react'

const CATEGORIES: Record<string, { label: string; icon: string }> = {
  bail_avenants: { label: 'Bail et avenants', icon: '📄' },
  diagnostics: { label: 'Diagnostics', icon: '🔍' },
  factures_travaux: { label: 'Factures et travaux', icon: '🧾' },
  correspondances: { label: 'Correspondances', icon: '✉️' },
  assurances: { label: 'Assurances', icon: '🛡️' },
  fiscalite: { label: 'Fiscalité', icon: '📊' },
  financement: { label: 'Financement', icon: '🏦' },
  copropriete: { label: 'Copropriété', icon: '🏢' },
  divers: { label: 'Divers', icon: '📁' },
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [propFilter, setPropFilter] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({ nom: '', description: '', categorie: 'divers', property_id: '', annee_fiscale: '' })
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const load = async () => {
    const [docRes, propRes] = await Promise.all([
      supabase.from('documents').select('*, property:properties(name)').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name').order('name'),
    ])
    setDocuments(docRes.data ?? [])
    setProperties(propRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { toast.error('Sélectionnez un fichier'); return }
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const buffer = await file.arrayBuffer()
    const fileName = `${user.id}/${form.property_id || 'global'}/${form.categorie}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, buffer, { contentType: file.type, upsert: true })
    if (uploadError) { toast.error(uploadError.message); setUploading(false); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(fileName)
    await supabase.from('documents').insert({
      user_id: user.id,
      property_id: form.property_id || null,
      nom: form.nom || file.name,
      description: form.description || null,
      categorie: form.categorie,
      file_url: publicUrl,
      file_name: file.name,
      file_size_bytes: file.size,
      file_type: file.type,
      annee_fiscale: form.annee_fiscale ? Number(form.annee_fiscale) : null,
    })

    setUploading(false)
    toast.success('Document ajouté')
    setShowUpload(false)
    setFile(null)
    setForm({ nom: '', description: '', categorie: 'divers', property_id: '', annee_fiscale: '' })
    load()
  }

  const filtered = documents.filter(d => {
    const matchSearch = !search || [d.nom, d.description, d.file_name].join(' ').toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || d.categorie === catFilter
    const matchProp = propFilter === 'all' || d.property_id === propFilter
    return matchSearch && matchCat && matchProp
  })

  const byCategory = Object.keys(CATEGORIES).reduce((acc, cat) => {
    const docs = filtered.filter(d => d.categorie === cat)
    if (docs.length > 0) acc[cat] = docs
    return acc
  }, {} as Record<string, any[]>)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--text-primary)]">GED — Gestion documentaire</h1>
          <p className="text-slate-400 text-sm mt-1">{documents.length} document{documents.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold transition-all">
          <Upload className="h-4 w-4" /> Ajouter un document
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-xl bg-bg-secondary border border-border text-[var(--text-primary)] placeholder:text-text-tertiary text-sm focus:outline-none" />
        </div>
        <select value={propFilter} onChange={e => setPropFilter(e.target.value)} className="h-10 px-3 rounded-xl bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
          <option value="all" className="bg-[var(--surface)]">Tous les biens</option>
          {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="h-10 px-3 rounded-xl bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
          <option value="all" className="bg-[var(--surface)]">Toutes catégories</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.icon} {v.label}</option>)}
        </select>
      </div>

      {/* Documents par catégorie */}
      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-32 rounded-xl bg-white/[0.03] animate-pulse" />)}</div>
      ) : Object.keys(byCategory).length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Folder className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Aucun document — ajoutez votre premier fichier</p>
        </GlassCard>
      ) : Object.entries(byCategory).map(([cat, docs]) => {
        const catInfo = CATEGORIES[cat]
        return (
          <GlassCard key={cat}>
            <h2 className="font-display font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <span>{catInfo.icon}</span> {catInfo.label}
              <span className="text-xs text-slate-500 font-normal">({docs.length})</span>
            </h2>
            <div className="space-y-2">
              {docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <FileText className="h-5 w-5 text-slate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{doc.nom}</p>
                    <p className="text-xs text-slate-500">
                      {doc.property?.name && <span>{doc.property.name} · </span>}
                      {doc.annee_fiscale && <span>{doc.annee_fiscale} · </span>}
                      {format(new Date(doc.created_at), 'dd/MM/yyyy')}
                      {doc.file_size_bytes && <span> · {Math.round(doc.file_size_bytes / 1024)} KB</span>}
                    </p>
                    {doc.description && <p className="text-xs text-slate-600 mt-0.5 truncate">{doc.description}</p>}
                  </div>
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="h-8 w-8 rounded-lg bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Eye className="h-3.5 w-3.5 text-blue-400" />
                  </a>
                </div>
              ))}
            </div>
          </GlassCard>
        )
      })}

      {/* Modal upload */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display font-semibold text-[var(--text-primary)]">Ajouter un document</h2>
              <button onClick={() => setShowUpload(false)} className="h-8 w-8 rounded-lg bg-bg-secondary flex items-center justify-center">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Fichier *</label>
                <div onClick={() => fileRef.current?.click()} className={`flex items-center gap-3 p-3 rounded-xl border border-dashed cursor-pointer transition-all ${file ? 'border-green-400/30 bg-green-400/5' : 'border-border hover:border-blue-400/30'}`}>
                  {file ? (
                    <><FileText className="h-5 w-5 text-[var(--success)] flex-shrink-0" /><p className="text-sm text-[var(--success)] truncate">{file.name}</p></>
                  ) : (
                    <><Upload className="h-5 w-5 text-slate-500 flex-shrink-0" /><p className="text-sm text-slate-500">Cliquez pour choisir</p></>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-[#0F172A] mb-1.5">Nom du document</label><input type="text" placeholder={file?.name ?? 'Titre du document'} value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" /></div>
              <div><label className="block text-sm font-medium text-[#0F172A] mb-1.5">Catégorie *</label>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k} className="bg-[var(--surface)]">{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-[#0F172A] mb-1.5">Bien</label>
                  <select value={form.property_id} onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none">
                    <option value="" className="bg-[var(--surface)]">Global</option>
                    {properties.map(p => <option key={p.id} value={p.id} className="bg-[var(--surface)]">{p.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium text-[#0F172A] mb-1.5">Année fiscale</label>
                  <input type="number" placeholder="2026" value={form.annee_fiscale} onChange={e => setForm(f => ({ ...f, annee_fiscale: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-bg-secondary border border-border text-[var(--text-primary)] text-sm focus:outline-none" />
                </div>
              </div>
              <button type="submit" disabled={uploading || !file} className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold disabled:opacity-50 transition-all">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Upload...</> : <><Upload className="h-4 w-4" /> Envoyer</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
