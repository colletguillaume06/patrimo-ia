'use client'

const BIEN_TYPES = [
  { value: 'lmnp', label: 'LMNP (Meublé)' },
  { value: 'nu', label: 'Location nue' },
  { value: 'sci', label: 'SCI' },
  { value: 'airbnb', label: 'Saisonnier / Airbnb' },
  { value: 'commerce', label: 'Commerce' },
]

interface BienEditorProps {
  bien: any
  aiFields?: string[]
  errors?: { name?: string; type?: string }
  onChange: (bien: any) => void
}

function Field({
  label,
  name,
  value,
  onChange,
  required,
  aiDetected,
  type = 'text',
  placeholder,
}: {
  label: string
  name: string
  value: any
  onChange: (v: any) => void
  required?: boolean
  aiDetected?: boolean
  type?: string
  placeholder?: string
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
        placeholder={isEmpty ? (placeholder || 'Non détecté') : placeholder}
        className="w-full h-9 px-3 rounded-lg text-sm outline-none transition-all"
        style={{ background: bg, border, color: 'var(--text-primary)' }}
      />
    </div>
  )
}

export function BienEditor({ bien, aiFields = [], errors, onChange }: BienEditorProps) {
  const update = (key: string, val: any) => onChange({ ...bien, [key]: val })
  const ai = (f: string) => aiFields.includes(f) || (bien[f] !== null && bien[f] !== undefined && bien[f] !== '')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nom du bien" name="name" value={bien.name} onChange={v => update('name', v)} required aiDetected={ai('name')} />
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Type<span className="text-red-500 ml-0.5">*</span>
            {ai('type') && <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>IA</span>}
          </label>
          <select
            value={bien.type ?? ''}
            onChange={e => update('type', e.target.value)}
            className="w-full h-9 px-3 rounded-lg text-sm outline-none"
            style={{
              background: !bien.type ? '#FFFBEB' : ai('type') ? '#EFF6FF' : 'var(--bg-secondary)',
              border: !bien.type ? '1px solid #FCD34D' : ai('type') ? '1px solid #93C5FD' : '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="">-- Sélectionner --</option>
            {BIEN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label="Adresse" name="address" value={bien.address} onChange={v => update('address', v)} aiDetected={ai('address')} />
        </div>
        <Field label="Ville" name="city" value={bien.city} onChange={v => update('city', v)} aiDetected={ai('city')} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Code postal" name="postal_code" value={bien.postal_code} onChange={v => update('postal_code', v)} aiDetected={ai('postal_code')} />
        <Field label="Surface (m²)" name="surface_m2" value={bien.surface_m2} onChange={v => update('surface_m2', v)} type="number" aiDetected={ai('surface_m2')} />
        <Field label="Année d'achat" name="purchase_year" value={bien.purchase_year} onChange={v => update('purchase_year', v)} type="number" aiDetected={ai('purchase_year')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Prix d'achat (€)" name="purchase_price" value={bien.purchase_price} onChange={v => update('purchase_price', v)} type="number" aiDetected={ai('purchase_price')} />
        <Field label="Charges mensuelles (€)" name="monthly_charges" value={bien.monthly_charges} onChange={v => update('monthly_charges', v)} type="number" aiDetected={ai('monthly_charges')} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Taxe foncière (€/an)" name="property_tax" value={bien.property_tax} onChange={v => update('property_tax', v)} type="number" aiDetected={ai('property_tax')} />
        <Field label="Numéro fiscal" name="numero_fiscal" value={bien.numero_fiscal} onChange={v => update('numero_fiscal', v)} aiDetected={ai('numero_fiscal')} />
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
