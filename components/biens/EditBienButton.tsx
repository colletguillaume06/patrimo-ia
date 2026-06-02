'use client'

import { useState } from 'react'
import { Edit3 } from 'lucide-react'
import { EditBienModal } from './EditBienModal'

export function EditBienButton({ propertyId }: { propertyId: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-semibold border transition-all hover:opacity-80"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', background: 'var(--bg-secondary)' }}
      >
        <Edit3 className="h-4 w-4" /> Modifier
      </button>
      {open && <EditBienModal propertyId={propertyId} onClose={() => setOpen(false)} />}
    </>
  )
}
