import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as any,
})

export const PLANS = {
  starter: {
    name: 'Starter',
    price: 0,
    biens: 2,
    features: ['2 biens', 'Dashboard basique', 'Suivi loyers'],
  },
  pro: {
    name: 'Pro',
    price: 29,
    biens: 10,
    features: ['10 biens', 'OCR baux', 'Copilot IA', 'Fiscalité avancée', 'Relances auto'],
  },
  premium: {
    name: 'Premium',
    price: 79,
    biens: 999,
    features: ['Biens illimités', 'Tout Pro inclus', 'SCI multi-associés', 'Export comptable', 'Support prioritaire'],
  },
} as const
