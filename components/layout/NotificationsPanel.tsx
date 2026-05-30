'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Bell, AlertTriangle, Info, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert } from '@/types'

const severityConfig = {
  high: { color: 'text-[#B91C1C]', bg: 'bg-[#FEE8E8]', dot: 'bg-red-500' },
  medium: { color: 'text-[#C27820]', bg: 'bg-[#FEF3DC]', dot: 'bg-amber-500' },
  low: { color: 'text-[#1B4FD8]', bg: 'bg-[#EEF3FF]', dot: 'bg-blue-500' },
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const res = await fetch('/api/notifications/check')
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts ?? [])
      }
      setLoading(false)
    }
    load()
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const highCount = alerts.filter(a => a.severity === 'high').length
  const count = alerts.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative h-9 w-9 rounded-lg bg-white/[0.04] border border-[#E5E2DB] flex items-center justify-center hover:bg-white/[0.07] transition-colors"
      >
        <Bell className="h-4 w-4 text-[#5C574F]" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-[#1A1714] text-[10px] font-bold flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-[#E5E2DB] rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <h3 className="font-display font-semibold text-[#1A1714] text-sm">
              Alertes {count > 0 && <span className="text-[#9B9589]">({count})</span>}
            </h3>
            <button onClick={() => setOpen(false)} className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-[#F0EEE9]">
              <X className="h-3.5 w-3.5 text-[#5C574F]" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />)}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <div className="h-10 w-10 rounded-xl bg-green-400/10 flex items-center justify-center mb-3">
                  <Bell className="h-5 w-5 text-green-400" />
                </div>
                <p className="text-sm font-medium text-[#1A1714]">Tout est en ordre ✅</p>
                <p className="text-xs text-[#9B9589] mt-1">Aucune alerte en cours</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {alerts.map((alert, i) => {
                  const config = severityConfig[alert.severity]
                  return (
                    <div
                      key={i}
                      className={cn('flex items-start gap-3 p-3 rounded-xl transition-all', config.bg)}
                    >
                      <div className={cn('h-2 w-2 rounded-full mt-1.5 flex-shrink-0', config.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#1A1714]">{alert.property_name}</p>
                        <p className="text-xs text-[#5C574F] mt-0.5 line-clamp-2">{alert.message}</p>
                        {alert.action_label && alert.action_href && (
                          <Link
                            href={alert.action_href}
                            onClick={() => setOpen(false)}
                            className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium', config.color)}
                          >
                            {alert.action_label} <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
