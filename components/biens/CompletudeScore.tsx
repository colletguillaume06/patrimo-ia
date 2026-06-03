'use client'

interface Props {
  property: any
}

interface Field {
  label: string
  ok: boolean
  important: boolean
}

export function calculateCompletude(property: any): { score: number; fields: Field[]; manquants: string[] } {
  const activeLease = property.leases?.find((l: any) => l.is_active)
  const hasDiag = (property.diagnostics?.length ?? 0) > 0

  const fields: Field[] = [
    { label: 'Adresse', ok: !!property.address, important: true },
    { label: 'Ville', ok: !!property.city, important: true },
    { label: 'Surface', ok: !!property.surface_m2, important: false },
    { label: 'Prix d\'achat', ok: !!property.purchase_price, important: false },
    { label: 'Taxe foncière', ok: property.property_tax > 0, important: false },
    { label: 'Assurance', ok: property.insurance_annual > 0, important: false },
    { label: 'Numéro fiscal', ok: !!property.numero_fiscal, important: true },
    { label: 'Locataire', ok: !!activeLease?.tenant_name, important: true },
    { label: 'Loyer mensuel', ok: !!activeLease?.monthly_rent, important: true },
    { label: 'Date début bail', ok: !!activeLease?.start_date, important: true },
    { label: 'Dépôt de garantie', ok: !!activeLease?.deposit, important: false },
    { label: 'Email locataire', ok: !!activeLease?.tenant_email, important: false },
    { label: 'Indice IRL/référence', ok: !!activeLease?.irl_reference_valeur, important: false },
    { label: 'Diagnostics', ok: hasDiag, important: true },
  ]

  const done = fields.filter(f => f.ok).length
  const score = Math.round((done / fields.length) * 100)
  const manquants = fields.filter(f => !f.ok).map(f => f.label)

  return { score, fields, manquants }
}

export function CompletudeScore({ property }: Props) {
  const { score, manquants } = calculateCompletude(property)

  const color = score >= 80 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626'
  const bg = score >= 80 ? '#F0FDF4' : score >= 50 ? '#FFFBEB' : '#FEF2F2'
  const label = score >= 80 ? 'Complet' : score >= 50 ? 'Incomplet' : 'À compléter'

  return (
    <div className="flex flex-col gap-1.5">
      {/* Barre de progression */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
        </div>
        <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>{score}%</span>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit" style={{ background: bg, color }}>
        {label}
      </span>
      {manquants.length > 0 && score < 80 && (
        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
          Manquant : {manquants.slice(0, 3).join(', ')}{manquants.length > 3 ? ` +${manquants.length - 3}` : ''}
        </p>
      )}
    </div>
  )
}
