// Séquence d'emails post-inscription — 5 emails sur 14 jours

export interface OnboardingEmailData {
  to: string
  full_name: string
  app_url: string
}

function baseStyle() {
  return `
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    background: #ffffff;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid #E2E8F0;
  `
}

function header(title: string) {
  return `
    <div style="background: linear-gradient(135deg, #1D4ED8, #0891B2); padding: 32px 40px;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">${title}</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Patrimo IA</p>
    </div>
  `
}

function footer() {
  return `
    <div style="background: #F8FAFC; padding: 24px 40px; border-top: 1px solid #E2E8F0; text-align: center;">
      <p style="color: #94A3B8; font-size: 12px; margin: 0;">
        Patrimo IA — Votre assistant immobilier intelligent<br>
        <a href="{{{unsubscribe}}}" style="color: #94A3B8;">Se désabonner</a>
      </p>
    </div>
  `
}

function button(text: string, url: string) {
  return `
    <a href="${url}" style="
      display: inline-block;
      background: #1D4ED8;
      color: white;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 15px;
      margin: 8px 0;
    ">${text} →</a>
  `
}

// ── EMAIL J+0 — BIENVENUE ──
export function emailBienvenue(data: OnboardingEmailData) {
  return {
    subject: `Bienvenue sur Patrimo IA, ${data.full_name.split(' ')[0]} ! 🏠`,
    html: `
      <div style="${baseStyle()}">
        ${header('Bienvenue sur Patrimo IA !')}
        <div style="padding: 40px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Bonjour ${data.full_name.split(' ')[0]},
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Votre compte Patrimo IA est prêt. Vous avez maintenant accès à votre
            espace de gestion immobilière intelligent.
          </p>
          <div style="background: #EFF6FF; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="color: #1D4ED8; font-weight: bold; margin: 0 0 8px;">Ce que vous pouvez faire dès maintenant :</p>
            <ul style="color: #334155; margin: 0; padding-left: 20px; line-height: 2;">
              <li>Ajouter vos biens immobiliers</li>
              <li>Importer vos documents existants (baux, tableaux Excel)</li>
              <li>Calculer votre situation fiscale</li>
              <li>Demander conseil à votre copilot IA</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            ${button('Accéder à mon espace', data.app_url + '/dashboard')}
          </div>
          <p style="color: #64748B; font-size: 14px;">
            En cas de question, répondez simplement à cet email.
          </p>
        </div>
        ${footer()}
      </div>
    `,
  }
}

// ── EMAIL J+1 — PREMIER BIEN ──
export function emailPremierBien(data: OnboardingEmailData) {
  return {
    subject: `${data.full_name.split(' ')[0]}, ajoutez votre premier bien en 2 minutes`,
    html: `
      <div style="${baseStyle()}">
        ${header('Commencez par ajouter un bien')}
        <div style="padding: 40px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Bonjour ${data.full_name.split(' ')[0]},
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Pour profiter de Patrimo IA, commencez par ajouter votre premier bien.
            Cela prend moins de 2 minutes.
          </p>
          <div style="background: #F8FAFC; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1D4ED8;">
            <p style="color: #334155; margin: 0; font-size: 15px; line-height: 1.8;">
              <strong>💡 Astuce :</strong> Utilisez l'import intelligent pour photographier
              votre tableau Excel existant — Patrimo IA crée tout automatiquement.
            </p>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            ${button('Ajouter mon premier bien', data.app_url + '/biens')}
          </div>
        </div>
        ${footer()}
      </div>
    `,
  }
}

// ── EMAIL J+3 — SITUATION FISCALE ──
export function emailSituationFiscale(data: OnboardingEmailData) {
  return {
    subject: `Connaissez-vous votre situation fiscale réelle ?`,
    html: `
      <div style="${baseStyle()}">
        ${header('Votre tableau fiscal vous attend')}
        <div style="padding: 40px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Bonjour ${data.full_name.split(' ')[0]},
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Saviez-vous que Patrimo IA calcule automatiquement votre situation
            fiscale selon vos régimes (LMNP, foncier nu, SCI) ?
          </p>
          <div style="display: grid; gap: 12px; margin: 24px 0;">
            <div style="background: #F0FDF4; border-radius: 8px; padding: 16px; border: 1px solid #86EFAC;">
              <p style="color: #166534; font-weight: bold; margin: 0 0 4px;">✓ LMNP réel</p>
              <p style="color: #334155; margin: 0; font-size: 14px;">Simulation amortissements, micro-BIC vs réel</p>
            </div>
            <div style="background: #EFF6FF; border-radius: 8px; padding: 16px; border: 1px solid #93C5FD;">
              <p style="color: #1E40AF; font-weight: bold; margin: 0 0 4px;">✓ Foncier nu</p>
              <p style="color: #334155; margin: 0; font-size: 14px;">Déficit foncier, formulaire 2044 pré-rempli</p>
            </div>
            <div style="background: #F5F3FF; border-radius: 8px; padding: 16px; border: 1px solid #C4B5FD;">
              <p style="color: #5B21B6; font-weight: bold; margin: 0 0 4px;">✓ SCI</p>
              <p style="color: #334155; margin: 0; font-size: 14px;">IS vs IR, dividendes, formulaire 2072</p>
            </div>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            ${button('Voir mon tableau fiscal', data.app_url + '/fiscal')}
          </div>
        </div>
        ${footer()}
      </div>
    `,
  }
}

// ── EMAIL J+7 — VALEUR GÉNÉRÉE ──
export function emailValeurGeneree(data: OnboardingEmailData) {
  return {
    subject: `1 semaine avec Patrimo IA — voici ce que vous pouvez faire`,
    html: `
      <div style="${baseStyle()}">
        ${header('Vous avez 1 semaine d\'avance')}
        <div style="padding: 40px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Bonjour ${data.full_name.split(' ')[0]},
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Voici 3 fonctionnalités que vous n'avez peut-être pas encore utilisées :
          </p>
          <div style="margin: 24px 0; space-y: 16px;">
            <div style="background: #F8FAFC; border-radius: 8px; padding: 20px; margin-bottom: 12px; border-left: 4px solid #059669;">
              <p style="color: #059669; font-weight: bold; margin: 0 0 8px;">🤖 Copilot IA</p>
              <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.6;">
                Posez n'importe quelle question : "Puis-je réviser le loyer de mon bail LMNP ?"
                → réponse personnalisée en 30 secondes.
              </p>
            </div>
            <div style="background: #F8FAFC; border-radius: 8px; padding: 20px; margin-bottom: 12px; border-left: 4px solid #1D4ED8;">
              <p style="color: #1D4ED8; font-weight: bold; margin: 0 0 8px;">📸 Import intelligent</p>
              <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.6;">
                Photographiez n'importe quel document — bail, taxe foncière, diagnostic —
                l'IA extrait et enregistre tout automatiquement.
              </p>
            </div>
            <div style="background: #F8FAFC; border-radius: 8px; padding: 20px; border-left: 4px solid #7C3AED;">
              <p style="color: #7C3AED; font-weight: bold; margin: 0 0 8px;">📊 Révision de loyer</p>
              <p style="color: #334155; margin: 0; font-size: 14px; line-height: 1.6;">
                Patrimo IA calcule automatiquement la révision IRL/IRLC/ICC de chaque bail
                avec l'indice du dernier trimestre.
              </p>
            </div>
          </div>
          <div style="text-align: center; margin: 32px 0;">
            ${button('Explorer ces fonctionnalités', data.app_url + '/dashboard')}
          </div>
        </div>
        ${footer()}
      </div>
    `,
  }
}

// ── EMAIL J+14 — FIDÉLISATION ──
export function emailFidelisation(data: OnboardingEmailData) {
  return {
    subject: `${data.full_name.split(' ')[0]}, comment se passe votre gestion ?`,
    html: `
      <div style="${baseStyle()}">
        ${header('2 semaines ensemble')}
        <div style="padding: 40px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Bonjour ${data.full_name.split(' ')[0]},
          </p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">
            Cela fait 2 semaines que vous utilisez Patrimo IA.
            Voici ce que vous pouvez faire avant votre prochaine déclaration :
          </p>
          <div style="background: #FFFBEB; border-radius: 8px; padding: 20px; margin: 24px 0; border: 1px solid #FCD34D;">
            <p style="color: #92400E; font-weight: bold; margin: 0 0 12px;">📋 Checklist déclaration</p>
            <ul style="color: #334155; margin: 0; padding-left: 20px; line-height: 2; font-size: 14px;">
              <li>Vérifier les loyers encaissés sur chaque bien</li>
              <li>Télécharger votre export comptable CSV</li>
              <li>Consulter le tableau fiscal (cases 2044/2042-C-PRO)</li>
              <li>Importer votre déclaration N-1 pour comparer</li>
            </ul>
          </div>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Des questions ? Répondez directement à cet email ou utilisez le copilot IA
            disponible 24h/24 dans l'application.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            ${button('Préparer ma déclaration', data.app_url + '/fiscal')}
          </div>
        </div>
        ${footer()}
      </div>
    `,
  }
}
