// Client Nordigen (GoCardless Bank Account Data)
// Docs : https://developer.gocardless.com/bank-account-data/quick-start-guide

const BASE_URL = 'https://bankaccountdata.gocardless.com/api/v2'

let cachedToken: { access: string; expires_at: number } | null = null

/** Obtenir ou renouveler le token d'accès */
async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60_000) {
    return cachedToken.access
  }

  const res = await fetch(`${BASE_URL}/token/new/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret_id: process.env.NORDIGEN_SECRET_ID,
      secret_key: process.env.NORDIGEN_SECRET_KEY,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Nordigen auth failed: ${err}`)
  }

  const data = await res.json()
  cachedToken = {
    access: data.access,
    expires_at: Date.now() + data.access_expires * 1000,
  }
  return cachedToken.access
}

async function nordigen(path: string, options: RequestInit = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Nordigen ${path} failed (${res.status}): ${err}`)
  }
  return res.json()
}

// ─── Institutions (banques) ────────────────────────────────────────────────

export async function getInstitutions(country = 'fr') {
  return nordigen(`/institutions/?country=${country}`)
}

// ─── Requisition (lien de connexion bancaire) ─────────────────────────────

export async function createRequisition(params: {
  institution_id: string
  redirect_url: string
  reference: string
  user_language?: string
}) {
  return nordigen('/requisitions/', {
    method: 'POST',
    body: JSON.stringify({
      redirect: params.redirect_url,
      institution_id: params.institution_id,
      reference: params.reference,
      user_language: params.user_language ?? 'FR',
    }),
  })
}

export async function getRequisition(requisition_id: string) {
  return nordigen(`/requisitions/${requisition_id}/`)
}

// ─── Comptes ───────────────────────────────────────────────────────────────

export async function getAccountDetails(account_id: string) {
  return nordigen(`/accounts/${account_id}/details/`)
}

export async function getAccountBalances(account_id: string) {
  return nordigen(`/accounts/${account_id}/balances/`)
}

// ─── Transactions ──────────────────────────────────────────────────────────

export async function getTransactions(account_id: string, date_from?: string) {
  const params = date_from ? `?date_from=${date_from}` : ''
  return nordigen(`/accounts/${account_id}/transactions/${params}`)
}

// ─── Matching automatique loyer ↔ transaction ─────────────────────────────

export interface BankTransaction {
  transactionId: string
  bookingDate: string
  transactionAmount: { amount: string; currency: string }
  remittanceInformationUnstructured?: string
  creditorName?: string
  debtorName?: string
}

export interface LouerAttendu {
  id: string
  amount: number
  due_date: string
  tenant_name: string
  lease_id: string
}

export function matchTransaction(
  tx: BankTransaction,
  loyers: LouerAttendu[]
): { loyer: LouerAttendu; score: number } | null {
  const txAmount = Math.abs(parseFloat(tx.transactionAmount.amount))
  const txDate = new Date(tx.bookingDate)
  const txLabel = (
    tx.remittanceInformationUnstructured ?? tx.debtorName ?? ''
  ).toLowerCase()

  let bestMatch: { loyer: LouerAttendu; score: number } | null = null

  for (const loyer of loyers) {
    let score = 0
    const loyerDate = new Date(loyer.due_date)
    const daysDiff = Math.abs((txDate.getTime() - loyerDate.getTime()) / 86400000)

    // Montant exact → +50 points
    if (Math.abs(txAmount - loyer.amount) < 1) score += 50
    // Montant proche (±5%) → +20 points
    else if (Math.abs(txAmount - loyer.amount) / loyer.amount < 0.05) score += 20

    // Date proche (±10 jours) → +30 points dégressifs
    if (daysDiff <= 2) score += 30
    else if (daysDiff <= 5) score += 20
    else if (daysDiff <= 10) score += 10

    // Nom du locataire dans le libellé → +20 points
    const tenantWords = loyer.tenant_name.toLowerCase().split(' ')
    if (tenantWords.some(w => w.length > 2 && txLabel.includes(w))) score += 20

    // Score minimum pour considérer un match
    if (score >= 50 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { loyer, score }
    }
  }

  return bestMatch
}
