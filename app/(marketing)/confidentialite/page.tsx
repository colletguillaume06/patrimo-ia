export default function ConfidentialitePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 bg-white min-h-screen">
      <h1 className="font-bold text-3xl text-[#0F172A] mb-2">Politique de confidentialité</h1>
      <p className="text-slate-500 mb-10">Dernière mise à jour : juin 2026 — Conforme RGPD</p>

      {[
        {
          title: '1. Responsable du traitement',
          content: `Guillaume Collet — Patrimo IA
Contact : contact@patrimo-ia.fr
Hébergement : Vercel Inc. (États-Unis) avec données en Europe (région Paris)`
        },
        {
          title: '2. Données collectées',
          content: `Nous collectons les données suivantes :
• Données d'identification : nom, prénom, adresse email
• Données immobilières : informations sur vos biens, baux, locataires, loyers
• Données financières : montants de loyers, charges, prix d'acquisition
• Données fiscales : régimes fiscaux, revenus déclarés
• Données de connexion : adresse IP, dates de connexion, navigateur utilisé`
        },
        {
          title: '3. Finalités du traitement',
          content: `Vos données sont collectées pour :
• Fournir le service de gestion immobilière
• Calculer vos simulations fiscales
• Envoyer vos quittances et relances automatiques
• Vous envoyer des emails de service (onboarding, alertes)
• Améliorer notre service (données agrégées anonymisées uniquement)`
        },
        {
          title: '4. Base légale du traitement',
          content: `• Exécution du contrat (CGU) : pour la fourniture du service
• Intérêt légitime : pour l'amélioration du service et la sécurité
• Consentement : pour les communications marketing (opt-in)`
        },
        {
          title: '5. Durée de conservation',
          content: `• Données de compte : durée de l'abonnement + 3 ans après résiliation
• Données financières et fiscales : 10 ans (obligation légale comptable)
• Logs de connexion : 12 mois
• Données supprimées sur demande dans un délai de 30 jours (sauf obligation légale)`
        },
        {
          title: '6. Partage des données',
          content: `Vos données ne sont jamais vendues à des tiers.
Elles sont partagées uniquement avec nos sous-traitants techniques :
• Supabase (base de données) — hébergement EU
• Resend (envoi d'emails)
• Vercel (hébergement de l'application)
• Groq (inférence LLaMA 3.3 — copilot IA — données traitées sans stockage permanent)
• Anthropic (Claude API — analyse de documents et photos — données traitées sans stockage permanent)
• Google (Gemini API — analyse visuelle de documents — données traitées sans stockage permanent)
• Stripe (paiements)

Chacun de ces prestataires est soumis à des obligations de confidentialité strictes.`
        },
        {
          title: '7. Vos droits (RGPD)',
          content: `Conformément au RGPD, vous disposez des droits suivants :
• Droit d'accès : obtenir une copie de vos données (via les Paramètres → Export)
• Droit de rectification : corriger vos données directement dans l'application
• Droit à l'effacement : supprimer votre compte et toutes vos données (via les Paramètres)
• Droit à la portabilité : exporter vos données au format CSV
• Droit d'opposition : vous opposer à certains traitements
• Droit de limitation : limiter certains traitements

Pour exercer ces droits : contact@patrimo-ia.fr
Vous pouvez également adresser une réclamation à la CNIL (www.cnil.fr).`
        },
        {
          title: '8. Sécurité',
          content: `Nous mettons en œuvre les mesures suivantes pour protéger vos données :
• Chiffrement des données en transit (HTTPS/TLS)
• Chiffrement des données au repos (AES-256)
• Isolation des données par utilisateur (Row Level Security Supabase)
• Déconnexion automatique après inactivité
• Authentification sécurisée`
        },
        {
          title: '9. Cookies',
          content: `Patrimo IA utilise uniquement les cookies strictement nécessaires au fonctionnement du service :
• Cookie de session d'authentification (Supabase)
Aucun cookie publicitaire ou de tracking tiers n'est utilisé.`
        },
        {
          title: '10. Contact',
          content: `Pour toute question relative à la protection de vos données :
Email : contact@patrimo-ia.fr
Délégué à la Protection des Données : Guillaume Collet`
        },
      ].map(({ title, content }) => (
        <div key={title} className="mb-8">
          <h2 className="font-semibold text-lg text-[#0F172A] mb-3">{title}</h2>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">{content}</p>
        </div>
      ))}
    </div>
  )
}
