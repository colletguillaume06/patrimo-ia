'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Loader2 } from 'lucide-react'

interface UploadBailProps {
  propertyId: string
  onSuccess: (data: { pdf_url: string; parsed_data: any }) => void
}

export function UploadBail({ propertyId, onSuccess }: UploadBailProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string>('')

  const handleFile = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max 10 MB)')
      return
    }

    setUploading(true)
    setProgress('Upload du PDF...')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('property_id', propertyId)

    setProgress('Extraction IA en cours...')
    const res = await fetch('/api/ai/ocr', { method: 'POST', body: formData })
    setUploading(false)
    setProgress('')

    if (res.ok) {
      const data = await res.json()
      toast.success('Bail analysé avec succès !')
      onSuccess(data)
    } else {
      const err = await res.json()
      toast.error(err.error ?? 'Erreur lors de l\'analyse')
    }
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
        dragging ? 'border-blue-500/50 bg-blue-500/5' : 'border-border hover:border-white/[0.16]'
      }`}
    >
      {uploading ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
          <p className="text-sm text-blue-400">{progress}</p>
          <p className="text-xs text-text-secondary">L'IA analyse votre bail...</p>
        </div>
      ) : (
        <>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <FileText className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">Déposez votre bail PDF</p>
          <p className="text-xs text-text-secondary mb-4">L'IA extraira automatiquement loyer, charges, durée, index...</p>
          <label className="cursor-pointer flex items-center gap-2 h-9 px-4 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-400 text-sm font-medium transition-all">
            <Upload className="h-4 w-4" />
            Choisir un fichier
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </label>
        </>
      )}
    </div>
  )
}
