import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface CourierData {
  bailleur_nom: string
  bailleur_adresse?: string
  locataire_nom: string
  locataire_adresse?: string
  bien_adresse: string
  bien_ville?: string
  date_bail?: string
  date_fin_bail?: string
  loyer_actuel?: number
  loyer_nouveau?: number
  indice_ref?: number
  indice_new?: number
  indice_label?: string
  depot_garantie?: number
  montant_retenu?: number
  motif_retenu?: string
  garant_nom?: string
  garant_adresse?: string
  montant_du?: number
  mois_concernes?: string
  date_etat_lieux?: string
  charges_provisions?: number
  charges_reelles?: number
  date_revision?: string
  caution_type?: string
  [key: string]: any
}

const today = () => format(new Date(), 'd MMMM yyyy', { locale: fr })
const adresse = (d: CourierData) => [d.bien_adresse, d.bien_ville].filter(Boolean).join(', ')

export const COURRIERS_TEMPLATES = [

  {
    id: 'conge_vente',
    titre: 'Congé pour vente',
    description: 'Donner congé au locataire pour vendre le bien — avec droit de préemption',
    type_bail: ['nu'],
    delai_preavis: '6 mois minimum avant échéance',
    lrar: true,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ? '\n' + d.locataire_adresse : '\n' + d.bien_adresse}

Objet : Congé pour vente — Logement situé ${adresse(d)}
Envoi par lettre recommandée avec accusé de réception

Madame, Monsieur,

Par la présente, je vous informe de ma décision de donner congé au titre du bail du ${d.date_bail ? format(new Date(d.date_bail), 'dd/MM/yyyy') : '[date du bail]'} relatif au logement sis ${adresse(d)}, pour le ${d.date_fin_bail ? format(new Date(d.date_fin_bail), 'dd MMMM yyyy', { locale: fr }) : '[date de fin de bail]'}.

Ce congé est donné pour vente du logement, conformément à l'article 15-II de la loi du 6 juillet 1989.

DROIT DE PRÉEMPTION
En vertu de l'article 15-II de la loi du 6 juillet 1989, vous bénéficiez d'un droit de préemption pour acquérir le logement aux conditions suivantes :
— Prix de vente envisagé : [PRIX EN EUROS]€
— Conditions : [MODALITÉS DE PAIEMENT]

Vous disposez d'un délai de deux mois à compter de la réception du présent courrier pour exercer votre droit de préemption.

À défaut de réponse dans ce délai, votre droit de préemption sera caduc.

Je vous rappelle que vous devez libérer le logement et remettre les clés au plus tard le ${d.date_fin_bail ? format(new Date(d.date_fin_bail), 'dd MMMM yyyy', { locale: fr }) : '[date fin bail]'}.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'conge_reprise',
    titre: 'Congé pour reprise (habitation)',
    description: 'Récupérer le logement pour y habiter ou loger un proche',
    type_bail: ['nu', 'meuble'],
    delai_preavis: '6 mois (nu) / 3 mois (meublé)',
    lrar: true,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ? '\n' + d.locataire_adresse : '\n' + d.bien_adresse}

Objet : Congé pour reprise — Logement situé ${adresse(d)}
Envoi par lettre recommandée avec accusé de réception

Madame, Monsieur,

Par la présente, je vous notifie, conformément à l'article 15-I de la loi du 6 juillet 1989, mon congé pour le logement sis ${adresse(d)}, bail du ${d.date_bail ? format(new Date(d.date_bail), 'dd/MM/yyyy') : '[date]'}.

Ce congé prend effet le ${d.date_fin_bail ? format(new Date(d.date_fin_bail), 'dd MMMM yyyy', { locale: fr }) : '[date fin bail]'}.

Le motif de ce congé est la reprise du logement pour [MON OCCUPATION PERSONNELLE / l'occupation de [NOM DU PROCHE], [LIEN DE PARENTÉ]], qui en fera sa résidence principale.

Conformément à l'article 15-I de la loi du 6 juillet 1989, je vous indique :
— Le bénéficiaire de la reprise : [NOM ET ADRESSE ACTUELLE]
— La nature du lien : [LIEN DE PARENTÉ]

Vous devrez libérer le logement à la date ci-dessus indiquée.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'mise_en_demeure_loyer',
    titre: 'Mise en demeure — loyer impayé',
    description: 'Mettre en demeure le locataire de régler les loyers impayés',
    type_bail: ['nu', 'meuble', 'commercial'],
    delai_preavis: 'Réponse 8 jours',
    lrar: true,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ? '\n' + d.locataire_adresse : '\n' + d.bien_adresse}

Objet : MISE EN DEMEURE — Loyers impayés — ${adresse(d)}
Envoi par lettre recommandée avec accusé de réception

Madame, Monsieur,

Malgré nos précédentes relances restées sans effet, nous constatons que le loyer de ${d.loyer_actuel ? d.loyer_actuel.toLocaleString('fr-FR') : '[montant]'}€ charges comprises, relatif au logement sis ${adresse(d)}, n'a pas été réglé.

Situation de votre compte au ${today()} :
Montant total dû : ${d.montant_du ? d.montant_du.toLocaleString('fr-FR') : '[montant]'} €
Période(s) concernée(s) : ${d.mois_concernes ?? '[mois]'}

Par la présente, nous vous mettons en demeure de nous régler la somme de ${d.montant_du ? d.montant_du.toLocaleString('fr-FR') : '[montant]'} € dans un délai de HUIT (8) JOURS à compter de la réception de ce courrier.

À défaut de règlement dans ce délai, nous nous verrons contraints d'engager toute procédure judiciaire utile au recouvrement de notre créance, incluant la délivrance d'un commandement de payer aux fins de saisie-vente ou résiliation du bail.

Nous vous rappelons que les frais de procédure seront à votre charge.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'mise_en_cause_garant',
    titre: 'Mise en cause du garant',
    description: 'Appeler la caution solidaire en cas de loyers impayés',
    type_bail: ['nu', 'meuble'],
    delai_preavis: 'Réponse 8 jours',
    lrar: true,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.garant_nom ?? '[Nom du garant]'}
${d.garant_adresse ?? '[Adresse du garant]'}

Objet : Appel en garantie — Loyers impayés — ${adresse(d)}
Envoi par lettre recommandée avec accusé de réception

Madame, Monsieur,

Vous vous êtes porté(e) caution ${d.caution_type ?? 'solidaire'} pour le locataire ${d.locataire_nom} au titre du bail portant sur le logement sis ${adresse(d)}, signé le ${d.date_bail ? format(new Date(d.date_bail), 'dd/MM/yyyy') : '[date]'}.

À ce titre, nous vous informons que ${d.locataire_nom} n'a pas réglé les loyers suivants :
Montant total dû : ${d.montant_du ? d.montant_du.toLocaleString('fr-FR') : '[montant]'} €
Période(s) : ${d.mois_concernes ?? '[mois]'}

En vertu de l'acte de cautionnement susvisé et conformément aux dispositions de l'article 2299 du Code civil (caution solidaire), nous vous demandons de régler la somme de ${d.montant_du ? d.montant_du.toLocaleString('fr-FR') : '[montant]'} € dans un délai de HUIT (8) JOURS.

À défaut, nous nous verrons contraints d'engager toute procédure judiciaire à votre encontre pour obtenir paiement de cette somme.

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'revision_irl',
    titre: 'Lettre de révision de loyer (IRL/ILC/ILAT)',
    description: 'Notifier la révision annuelle du loyer selon l\'indice applicable',
    type_bail: ['nu', 'meuble', 'commercial'],
    delai_preavis: 'Information — pas de délai minimum',
    lrar: false,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ? '\n' + d.locataire_adresse : '\n' + d.bien_adresse}

Objet : Révision annuelle du loyer — ${adresse(d)}

Madame, Monsieur,

Conformément à la clause d'indexation de votre bail du ${d.date_bail ? format(new Date(d.date_bail), 'dd/MM/yyyy') : '[date]'}, je vous informe de la révision annuelle de votre loyer.

CALCUL DE RÉVISION
Indice de référence à la signature : ${d.indice_ref ?? '[INDICE REF]'} (${d.indice_label ?? 'indice précédent'})
Dernier indice publié : ${d.indice_new ?? '[INDICE NEW]'}

Calcul : ${d.loyer_actuel ?? '[loyer]'} € × ${d.indice_new ?? '[new]'} ÷ ${d.indice_ref ?? '[ref]'} = ${d.loyer_nouveau ? d.loyer_nouveau.toFixed(2) : '[nouveau loyer]'} €

Loyer actuel : ${d.loyer_actuel ? d.loyer_actuel.toFixed(2) : '[montant]'} €/mois
Nouveau loyer : ${d.loyer_nouveau ? d.loyer_nouveau.toFixed(2) : '[montant]'} €/mois

Cette révision prend effet à compter du ${d.date_revision ? format(new Date(d.date_revision), 'dd MMMM yyyy', { locale: fr }) : today()}.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'regularisation_charges',
    titre: 'Courrier de régularisation des charges',
    description: 'Régulariser les provisions sur charges en fin d\'année',
    type_bail: ['nu', 'meuble'],
    delai_preavis: 'Annuel',
    lrar: false,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ? '\n' + d.locataire_adresse : '\n' + d.bien_adresse}

Objet : Régularisation des charges — ${adresse(d)} — Année [ANNÉE]

Madame, Monsieur,

Conformément à l'article 23 de la loi du 6 juillet 1989, je vous adresse le décompte de régularisation annuelle des charges pour le logement sis ${adresse(d)}.

DÉCOMPTE DE RÉGULARISATION
Provisions versées (${(d.charges_provisions ?? 0) / 12 | 0}€ × 12 mois) : ${d.charges_provisions?.toLocaleString('fr-FR') ?? '[montant]'} €
Charges réelles justifiées : ${d.charges_reelles?.toLocaleString('fr-FR') ?? '[montant]'} €

${(d.charges_provisions ?? 0) >= (d.charges_reelles ?? 0)
  ? `SOLDE EN VOTRE FAVEUR : ${((d.charges_provisions ?? 0) - (d.charges_reelles ?? 0)).toLocaleString('fr-FR')} €\nCe montant sera déduit de votre prochaine échéance de loyer.`
  : `COMPLÉMENT À VOTRE CHARGE : ${((d.charges_reelles ?? 0) - (d.charges_provisions ?? 0)).toLocaleString('fr-FR')} €\nCe montant est à régler à la prochaine échéance.`}

Les justificatifs des charges sont disponibles sur demande, conformément à l'article 23 alinéa 2 de la loi du 6 juillet 1989.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'restitution_dg',
    titre: 'Restitution du dépôt de garantie',
    description: 'Courrier de restitution (totale ou partielle) du dépôt de garantie',
    type_bail: ['nu', 'meuble'],
    delai_preavis: 'Délai légal : 1 mois (conforme) / 2 mois (réserves)',
    lrar: false,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ?? ''}

Objet : Restitution du dépôt de garantie — ${adresse(d)}

Madame, Monsieur,

Suite à la restitution des clés du logement sis ${adresse(d)} en date du ${d.date_etat_lieux ? format(new Date(d.date_etat_lieux), 'dd MMMM yyyy', { locale: fr }) : '[date état des lieux]'}, je vous adresse le décompte de restitution de votre dépôt de garantie.

Conformément à l'article 22 de la loi du 6 juillet 1989 :

Dépôt de garantie versé : ${d.depot_garantie?.toLocaleString('fr-FR') ?? '[montant]'} €
${d.montant_retenu && d.montant_retenu > 0
  ? `Retenue(s) : -${d.montant_retenu.toLocaleString('fr-FR')} €\nMotif(s) : ${d.motif_retenu ?? '[motif]'}`
  : 'Aucune retenue'
}
MONTANT RESTITUÉ : ${((d.depot_garantie ?? 0) - (d.montant_retenu ?? 0)).toLocaleString('fr-FR')} €

${d.montant_retenu && d.montant_retenu > 0 ? 'Les justificatifs des retenues vous sont joints.' : ''}

Ce montant vous sera restitué par [virement bancaire / chèque] dans les meilleurs délais.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${d.bailleur_nom}`,
  },

  {
    id: 'demande_attestation_assurance',
    titre: 'Demande d\'attestation d\'assurance',
    description: 'Demander au locataire de fournir son attestation d\'assurance habitation',
    type_bail: ['nu', 'meuble'],
    delai_preavis: 'Non',
    lrar: false,
    template: (d: CourierData) => `${d.bailleur_nom}${d.bailleur_adresse ? '\n' + d.bailleur_adresse : ''}

Le ${today()}

${d.locataire_nom}${d.locataire_adresse ? '\n' + d.locataire_adresse : '\n' + d.bien_adresse}

Objet : Demande d'attestation d'assurance habitation — ${adresse(d)}

Madame, Monsieur,

Conformément à l'article 7-g de la loi du 6 juillet 1989, tout locataire est tenu de s'assurer contre les risques dont il doit répondre en sa qualité de locataire et d'en justifier lors de la remise des clés, puis à chaque renouvellement du bail.

Votre attestation d'assurance habitation${d.date_revision ? ` expire le ${format(new Date(d.date_revision), 'dd MMMM yyyy', { locale: fr })}` : ' n\'a pas été fournie / est arrivée à expiration'}.

Merci de nous transmettre votre nouvelle attestation d'assurance dans les meilleurs délais à l'adresse suivante : ${d.bailleur_adresse ?? '[adresse bailleur]'}

À défaut, nous serions en droit de souscrire une assurance à votre place et d'en récupérer le coût auprès de vous, conformément à l'article 7-g de la loi précitée.

Veuillez agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

${d.bailleur_nom}`,
  },

]

export type CourrierId = typeof COURRIERS_TEMPLATES[number]['id']
