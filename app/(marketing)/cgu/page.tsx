export default function CGUPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 bg-white min-h-screen">
      <h1 className="font-bold text-3xl text-[#0F172A] mb-2">Conditions Générales d'Utilisation</h1>
      <p className="text-slate-500 mb-10">Dernière mise à jour : juin 2026</p>

      {[
        {
          title: '1. Présentation du service',
          content: `Patrimo IA est un service SaaS de gestion immobilière édité par Guillaume Collet (ci-après "l'Éditeur").
Le service est accessible à l'adresse https://propilot-ai.vercel.app.
Patrimo IA permet aux propriétaires immobiliers de gérer leurs biens, leurs baux, leurs loyers et leur situation fiscale.`
        },
        {
          title: '2. Acceptation des conditions',
          content: `L'utilisation du service implique l'acceptation pleine et entière des présentes CGU.
Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser le service.
L'Éditeur se réserve le droit de modifier ces CGU à tout moment. Les utilisateurs seront informés par email de toute modification substantielle.`
        },
        {
          title: '3. Accès au service',
          content: `L'accès au service nécessite la création d'un compte avec une adresse email valide et un mot de passe.
L'utilisateur est responsable de la confidentialité de ses identifiants de connexion.
L'Éditeur se réserve le droit de suspendre ou supprimer tout compte en cas d'utilisation frauduleuse ou contraire aux présentes CGU.`
        },
        {
          title: '4. Données financières et fiscales',
          content: `Les informations fiscales et financières fournies par Patrimo IA sont données à titre indicatif uniquement.
Elles ne constituent pas un conseil fiscal ou juridique professionnel.
L'utilisateur est seul responsable de ses déclarations fiscales. Patrimo IA ne saurait être tenu responsable d'erreurs ou omissions dans ces informations.`
        },
        {
          title: '5. Propriété intellectuelle',
          content: `L'ensemble des éléments du service (interface, code, algorithmes, contenus) est la propriété exclusive de l'Éditeur.
Toute reproduction, distribution ou utilisation non autorisée est interdite.`
        },
        {
          title: '6. Limitation de responsabilité',
          content: `L'Éditeur s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité du service.
Il ne saurait être tenu responsable des interruptions de service, pertes de données ou dommages indirects.
La responsabilité de l'Éditeur est limitée au montant des sommes versées par l'utilisateur au cours des 12 derniers mois.`
        },
        {
          title: '7. Résiliation',
          content: `L'utilisateur peut résilier son compte à tout moment depuis les paramètres du service (section "Supprimer mon compte").
La résiliation entraîne la suppression définitive de toutes les données dans un délai de 30 jours.
L'Éditeur peut résilier un compte sans préavis en cas de violation des présentes CGU.`
        },
        {
          title: '8. Droit applicable',
          content: `Les présentes CGU sont soumises au droit français.
En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.
À défaut d'accord amiable, le litige sera soumis aux tribunaux compétents de France.`
        },
        {
          title: '9. Contact',
          content: `Pour toute question relative aux présentes CGU, vous pouvez nous contacter à l'adresse :
contact@patrimo-ia.fr`
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
