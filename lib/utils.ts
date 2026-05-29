import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getPropertyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    airbnb: 'Airbnb / Saisonnier',
    sci: 'SCI',
    lmnp: 'LMNP',
    nu: 'Nu',
    commerce: 'Commerce',
  }
  return labels[type] ?? type
}

export function getPropertyTypeColor(type: string): string {
  const colors: Record<string, string> = {
    airbnb: '#F59E0B',
    sci: '#06B6D4',
    lmnp: '#10B981',
    nu: '#1A56DB',
    commerce: '#8B5CF6',
  }
  return colors[type] ?? '#8B9AB3'
}

export function daysUntil(dateStr: string): number {
  const now = new Date()
  const date = new Date(dateStr)
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function monthsUntil(dateStr: string): number {
  const now = new Date()
  const date = new Date(dateStr)
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30))
}
