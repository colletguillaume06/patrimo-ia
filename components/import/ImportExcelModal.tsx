'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload, Loader2, CheckCircle, AlertCircle, FileText, X, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PreviewEditor } from './PreviewEditor'

type Step = 'upload' | 'extracting' | 'preview' | 'importing' | 'done'

const MESSAGES_EXTRACTION = [
  'Lecture de l\'image...',
  'Identification des biens...',
  'Extraction des données bail...',
  'Association des locataires...',
  'Calcul des paiements...',
  'Finalisation...',
]

const MESSAGES_IMPORT = [
  'Création des biens...',
  'Enregistrement des baux...',
  'Import des paiements...',
  'Finalisation...',
]

export function ImportExcelModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [msgIdx, setMsgIdx] = useState(0)
  const [extractedData, setExtractedData] = useState<any>(null)
  const [result, setResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleFile = (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleExtract = async () => {
    if (!file) return
    setStep('extracting')
    setMsgIdx(0)

    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES_EXTRACTION.length)
    }, 1500)

    try {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = e => resolve((e.target?.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await fetch('/api/import/excel/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64 }),
      })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) throw new Error(data.error || 'Erreur serveur')
      if (!data.biens || data.biens.length === 0) throw new Error('Aucun bien détecté dans l\'image')

      setExtractedData(data)
      setStep('preview')
    } catch (err: any) {
      clearInterval(interval)
      toast.error(err.message)
      setStep('upload')
    }
  }

  const handleConfirm = async (editedData: any) => {
    setStep('importing')
    setMsgIdx(0)

    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES_IMPORT.length)
    }, 800)

    try {
      const res = await fetch('/api/import/excel/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ biens: editedData.biens }),
      })
      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      setResult(data)
      setStep('done')
    } catch (err: any) {
      clearInterval(interval)
      toast.error(err.message)
      setStep('preview')
    }
  }

  const isWide = step === 'preview'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={step !== 'extracting' && step !== 'importing' ? onClose : undefined} />
      <div
        className="relative w-full rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-300"
        style={{
          maxWidth: isWide ? '900px' : '640px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div>
            <h2 className="font-display font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              Import depuis photo Excel
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {step === 'upload' && 'Photographiez votre tableau — l\'IA crée biens, baux et paiements automatiquement'}
              {step === 'extracting' && 'Extraction des données en cours...'}
              {step === 'preview' && 'Vérifiez vos données avant import'}
              {step === 'importing' && 'Import en cours...'}
              {step === 'done' && 'Import terminé avec succès'}
            </p>
          </div>
          {step !== 'extracting' && step !== 'importing' && (
            <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}>
              <X className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
        </div>

        <div className="p-6">

          {/* ÉTAPE 1 — UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: file ? '#1D4ED8' : 'var(--border)', background: file ? '#EFF6FF' : 'var(--bg-secondary)' }}>
                {file ? (
                  <>
                    {preview && <img src={preview} className="max-h-48 rounded-lg mb-3 object-contain" alt="aperçu" />}
                    <p className="text-sm font-semibold" style={{ color: '#1D4ED8' }}>{file.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#3B82F6' }}>{Math.round(file.size / 1024)} Ko — Cliquez pour changer</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mb-3" style={{ color: 'var(--text-tertiary)' }} />
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Photographiez votre tableau Excel</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>JPG, PNG — Prenez la photo directement depuis votre téléphone</p>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />

              {file && (
                <button onClick={handleExtract}
                  className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-white text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)' }}>
                  <FileText className="h-5 w-5" /> Analyser avec l'IA
                </button>
              )}
            </div>
          )}

          {/* ÉTAPE 2 — EXTRACTION */}
          {step === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'linear-gradient(135deg, #1B4FD8, #0891B2)' }}>
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Extraction en cours...
              </p>
              <p className="text-sm animate-pulse" style={{ color: '#1D4ED8' }}>
                {MESSAGES_EXTRACTION[msgIdx]}
              </p>
              <div className="mt-6 flex gap-1.5">
                {MESSAGES_EXTRACTION.map((_, i) => (
                  <div key={i} className="h-1.5 w-6 rounded-full transition-colors"
                    style={{ background: i <= msgIdx ? '#1D4ED8' : 'var(--border)' }} />
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 3 — PRÉVISUALISATION */}
          {step === 'preview' && extractedData && (
            <PreviewEditor
              data={extractedData}
              onConfirm={handleConfirm}
              onCancel={() => setStep('upload')}
            />
          )}

          {/* ÉTAPE 4 — IMPORT EN COURS */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full flex items-center justify-center mb-6"
                style={{ background: 'linear-gradient(135deg, #059669, #0891B2)' }}>
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <p className="font-display font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>
                Import en cours...
              </p>
              <p className="text-sm animate-pulse" style={{ color: '#059669' }}>
                {MESSAGES_IMPORT[msgIdx]}
              </p>
              <div className="mt-6 flex gap-1.5">
                {MESSAGES_IMPORT.map((_, i) => (
                  <div key={i} className="h-1.5 w-6 rounded-full transition-colors"
                    style={{ background: i <= msgIdx ? '#059669' : 'var(--border)' }} />
                ))}
              </div>
            </div>
          )}

          {/* ÉTAPE 5 — TERMINÉ */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: '#F0FDF4' }}>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <p className="font-display font-bold text-xl" style={{ color: 'var(--text-primary)' }}>
                  Import terminé !
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Biens créés', value: result.biens_importes, color: '#1D4ED8' },
                  { label: 'Baux créés', value: result.baux_crees, color: '#059669' },
                  { label: 'Paiements', value: result.paiements_crees, color: '#7C3AED' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="text-2xl font-bold font-mono" style={{ color }}>{value}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Détails par bien */}
              {result.details?.length > 0 && (
                <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-sm">
                    <thead style={{ background: 'var(--bg-secondary)' }}>
                      <tr>
                        {['Bien', 'Locataire', 'Paiements', 'Statut'].map(h => (
                          <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold"
                            style={{ color: 'var(--text-tertiary)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.details.map((d: any, i: number) => (
                        <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td className="py-2.5 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{d.bien_nom}</td>
                          <td className="py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>
                            {d.lease_id ? '✓ Bail lié' : '—'}
                          </td>
                          <td className="py-2.5 px-3" style={{ color: 'var(--text-secondary)' }}>{d.nb_paiements}</td>
                          <td className="py-2.5 px-3">
                            {d.statut === 'ok'
                              ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ OK</span>
                              : <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Erreur</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Avertissements */}
              {result.avertissements?.length > 0 && (
                <div className="p-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
                  <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> {result.avertissements.length} avertissement(s)
                  </p>
                  {result.avertissements.map((a: string, i: number) => (
                    <p key={i} className="text-xs text-amber-700">• {a}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={() => { setStep('upload'); setFile(null); setPreview(''); setResult(null); setExtractedData(null) }}
                  className="h-10 rounded-xl text-sm border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  Importer un autre
                </button>
                <button onClick={() => { onClose(); router.push('/biens'); router.refresh() }}
                  className="flex items-center justify-center gap-2 h-10 rounded-xl text-white text-sm font-semibold"
                  style={{ background: '#1D4ED8' }}>
                  Voir mes biens <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
