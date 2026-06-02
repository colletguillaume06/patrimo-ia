'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface BailEditorProps {
  bail: any
  errors?: { tenant_name?: string; monthly_rent?: string; start_date?: string }
  onChange: (bail: any) => void
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  aiDetected,
}: {
  label: string
  value: any
  onChange: (v: any) => void
  required?: boolean
  type?: string
  aiDetected?: boolean
}) {
  const isEmpty = value === null || value === undefined || value === ''
  const bg = isEmpty ? '#FFFBEB' : aiDetected ? '#EFF6FF' : 'var(--bg-secondary)'
  const border = isEmpty ? '1px solid #FCD34D' : aiDetected ? '1px solid #93C5FD' : '1px solid var(--border)'

  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {aiDetected && !isEmpty && (
          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>IA</span>
        )}
      </label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value)}
        placeholder={isEmpty ? 'Non détecté' : undefined}
        className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
        style={{ background: bg, border, color: 'var(--text-primary)' }}
      />
    </div>
  )
}

export function BailEditor({ bail, errors, onChange }: BailEditorProps) {
  const [showGuarantor, setShowGuarantor] = useState(
    !!(bail.guarantor_name || bail.guarantor_phone)
  )
  const update = (key: string, val: any) => onChange({ ...bail, [key]: val })
  const ai = (f: string) => bail[f] !== null && bail[f] !== undefined && bail[f] !== ''

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Nom du locataire" value={bail.tenant_name} onChange={v => update('tenant_name', v)} required aiDetected={ai('tenant_name')} />
        </div>
        <Field label="Téléphone" value={bail.tenant_phone} onChange={v => update('tenant_phone', v)} type="tel" aiDetected={ai('tenant_phone')} />
      </div>

      <Field label="Email" value={bail.tenant_email} onChange={v => update('tenant_email', v)} type="email" aiDetected={ai('tenant_email')} />

      <div className="grid grid-cols-3 gap-3">
        <Field label="Loyer mensuel (€)" value={bail.monthly_rent} onChange={v => update('monthly_rent', v)} required type="number" aiDetected={ai('monthly_rent')} />
        <Field label="Charges (€)" value={bail.monthly_charges} onChange={v => update('monthly_charges', v)} type="number" aiDetected={ai('monthly_charges')} />
        <Field label="Dépôt de garantie (€)" value={bail.deposit} onChange={v => update('deposit', v)} type="number" aiDetected={ai('deposit')} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Date de début" value={bail.start_date} onChange={v => update('start_date', v)} required type="date" aiDetected={ai('start_date')} />
        <Field label="Date de fin" value={bail.end_date} onChange={v => update('end_date', v)} type="date" aiDetected={ai('end_date')} />
        <Field label="Indice IRL" value={bail.irl_index} onChange={v => update('irl_index', v)} type="number" aiDetected={ai('irl_index')} />
      </div>

      {/* Guarantor toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowGuarantor(!showGuarantor)}
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: '#1D4ED8' }}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showGuarantor ? '' : '-rotate-90'}`} />
          {showGuarantor ? 'Masquer le garant' : 'Ajouter un garant'}
        </button>

        {showGuarantor && (
          <div className="mt-3 grid grid-cols-2 gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <Field label="Nom du garant" value={bail.guarantor_name} onChange={v => update('guarantor_name', v)} aiDetected={ai('guarantor_name')} />
            <Field label="Téléphone du garant" value={bail.guarantor_phone} onChange={v => update('guarantor_phone', v)} type="tel" aiDetected={ai('guarantor_phone')} />
          </div>
        )}
      </div>

      {errors && Object.keys(errors).length > 0 && (
        <div className="p-3 rounded-lg" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
          {Object.values(errors).map((e, i) => (
            <p key={i} className="text-xs text-red-600">• {e}</p>
          ))}
        </div>
      )}
    </div>
  )
}
