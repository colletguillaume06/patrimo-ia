import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

function sep() { return '='.repeat(55) }

function header(typelabel: string, loi: string, form: any): string {
  const today = format(new Date(), 'd MMMM yyyy', { locale: fr })
  return [
    sep(),
    typelabel.toUpperCase(),
    loi,
    sep(),
    '',
    'Fait a ' + (form.ville_signature || '[Ville]') + ', le ' + (form.date_signature || today),
    'En ' + (form.nb_exemplaires || '2') + ' exemplaires originaux',
    '',
    '',
    'ENTRE LES SOUSSIGNES :',
    '',
    'LE BAILLEUR :',
    'Nom : ' + (form.bailleur_nom || '[Nom du bailleur]'),
    'Adresse : ' + (form.bailleur_adresse || '[Adresse du bailleur]'),
    'Ci-apres denomme "le Bailleur"',
    '',
    'ET',
    '',
    'LE LOCATAIRE :',
    'Nom : ' + (form.locataire_nom || '[Nom du locataire]'),
    'Adresse actuelle : ' + (form.locataire_adresse || '[Adresse actuelle]'),
    'Ci-apres denomme "le Locataire"',
  ].join('\n')
}

function signatures(form: any): string {
  return [
    '',
    sep(),
    'SIGNATURES',
    '',
    'Le Bailleur :                              Le Locataire :',
    '',
    '',
    '_________________________              _________________________',
    (form.bailleur_nom || '[Bailleur]') + '                    ' + (form.locataire_nom || '[Locataire]'),
    sep(),
  ].join('\n')
}

export function generateMeuble(form: any, property: any): string {
  const adresse = [property?.address, property?.postal_code, property?.city].filter(Boolean).join(', ')
  const totalLoyer = Number(form.loyer_hc || 0) + Number(form.charges || 0)
  const depot = form.depot || String(Number(form.loyer_hc || 0) * 2)

  const lines = [
    header('Bail meuble', 'Loi du 6 juillet 1989 - art. 25-3 a 25-11', form),
    '',
    '',
    'ARTICLE 1 - OBJET DU CONTRAT',
    '',
    'Le Bailleur loue au Locataire le logement meuble suivant :',
    'Adresse : ' + (adresse || '[Adresse]'),
    'Surface habitable : ' + (property?.surface_m2 || form.surface || '[?]') + ' m2',
    'Etage : ' + (form.etage || '[Etage]'),
    'Nombre de pieces : ' + (form.nb_pieces || '[Nb pieces]'),
    '',
    'Le logement est loue meuble conformement a la liste d\'inventaire annexee',
    '(annexe obligatoire - decret du 31 juillet 2015).',
    '',
    '',
    'ARTICLE 2 - DUREE DU BAIL',
    '',
    'Duree : ' + (form.duree || '1 an') + ', a compter du ' + (form.date_debut || '[Date d\'entree]') + '.',
    'Renouvellement tacite sauf conge legalement notifie.',
    '',
    'Preavis du Locataire : 1 mois',
    'Preavis du Bailleur  : 3 mois (motif legitime et serieux, vente ou reprise)',
    '',
    '',
    'ARTICLE 3 - LOYER ET CHARGES',
    '',
    'Loyer mensuel hors charges : ' + (form.loyer_hc || '[Loyer]') + ' EUR',
    'Provisions sur charges     : ' + (form.charges || '0') + ' EUR',
    'Total mensuel TCC          : ' + totalLoyer + ' EUR',
    '',
    'Payable le ' + (form.jour_paiement || '5') + ' de chaque mois, par virement bancaire.',
    '',
    'Revision annuelle selon l\'IRL - indice de reference a la signature : ' + (form.indice_irl || '[IRL]'),
    '',
    '',
    'ARTICLE 4 - DEPOT DE GARANTIE',
    '',
    'Montant : ' + depot + ' EUR (2 mois de loyer hors charges)',
    'Restitution : 1 mois (etat conforme) / 2 mois (reserves constatees)',
    '',
    '',
    'ARTICLE 5 - CHARGES RECUPERABLES',
    '',
    'Les provisions sur charges comprennent : eau froide et chaude, entretien parties',
    'communes, ordures menageres. Regularisation annuelle sur justificatifs.',
    '',
    '',
    'ARTICLE 6 - OBLIGATIONS DU LOCATAIRE',
    '',
    '- Payer le loyer et les charges aux termes convenus',
    '- User paisiblement des locaux loues',
    '- Souscrire une assurance habitation (justificatif annuel obligatoire)',
    '- Ne pas sous-louer sans accord ecrit du Bailleur',
    '- Effectuer les reparations locatives (decret du 26 aout 1987)',
    '',
    '',
    'ARTICLE 7 - OBLIGATIONS DU BAILLEUR',
    '',
    '- Delivrer un logement decent et en bon etat (decret du 30 janvier 2002)',
    '- Maintenir le logement en etat de servir a l\'usage convenu',
    '- Garantir la jouissance paisible',
    '',
    '',
    'ARTICLE 8 - CLAUSE RESOLUTOIRE',
    '',
    'A defaut de paiement du loyer ou d\'execution des obligations, le bail sera',
    'resilie de plein droit apres commandement demeure infructueux pendant 2 mois.',
    '',
    '',
    'DOCUMENTS ANNEXES OBLIGATOIRES :',
    '[ ] Etat des lieux d\'entree',
    '[ ] Inventaire du mobilier (decret du 31 juillet 2015)',
    '[ ] Notice d\'information',
    '[ ] DPE - Diagnostic de Performance Energetique',
    '[ ] CREP si immeuble avant 1949',
    '[ ] Etat des risques et pollutions (ERP)',
    signatures(form),
  ]
  return lines.join('\n')
}

export function generateNu(form: any, property: any): string {
  const adresse = [property?.address, property?.postal_code, property?.city].filter(Boolean).join(', ')
  const depot = form.depot || form.loyer_hc || '[1 mois HC]'

  return [
    header('Bail nu (location vide)', 'Loi du 6 juillet 1989 - art. 10', form),
    '', '',
    'ARTICLE 1 - OBJET DU CONTRAT',
    '',
    'Le Bailleur donne a bail au Locataire le logement vide suivant :',
    'Adresse : ' + (adresse || '[Adresse]'),
    'Surface habitable : ' + (property?.surface_m2 || form.surface || '[?]') + ' m2',
    'Nombre de pieces : ' + (form.nb_pieces || '[Nb pieces]'),
    '', '',
    'ARTICLE 2 - DUREE DU BAIL',
    '',
    'Duree : 3 ans, a compter du ' + (form.date_debut || '[Date d\'entree]') + '.',
    'Renouvellement tacite pour 3 ans sauf conge notifie 6 mois avant echeance.',
    '',
    'Preavis du Locataire : 3 mois (1 mois en zone tendue)',
    'Preavis du Bailleur  : 6 mois',
    '', '',
    'ARTICLE 3 - LOYER ET CHARGES',
    '',
    'Loyer mensuel hors charges : ' + (form.loyer_hc || '[Loyer]') + ' EUR',
    'Provisions sur charges     : ' + (form.charges || '0') + ' EUR',
    'Payable le ' + (form.jour_paiement || '5') + ' de chaque mois.',
    'Revision annuelle selon l\'IRL - indice de reference : ' + (form.indice_irl || '[IRL]'),
    '', '',
    'ARTICLE 4 - DEPOT DE GARANTIE',
    '',
    'Montant : ' + depot + ' EUR (1 mois de loyer HC - plafond legal)',
    'Restitution : 1 mois (conforme) / 2 mois (reserves)',
    '', '',
    'ARTICLE 5 - TRAVAUX',
    '',
    'Le Locataire ne peut effectuer de travaux de transformation sans accord ecrit.',
    'Reparations locatives a sa charge (decret du 26 aout 1987).',
    '', '',
    'DOCUMENTS ANNEXES OBLIGATOIRES :',
    '[ ] Etat des lieux d\'entree',
    '[ ] Notice d\'information (arrete du 29 mai 2015)',
    '[ ] DPE, CREP si avant 1949, ERP',
    signatures(form),
  ].join('\n')
}

export function generateCommercial(form: any, property: any): string {
  const adresse = [property?.address, property?.postal_code, property?.city].filter(Boolean).join(', ')
  const loyerAnnuel = Number(form.loyer_hc || 0) * 12

  return [
    header('Bail commercial 3-6-9', 'Art. L145-1 et suivants du Code de commerce', form),
    '', '',
    'ARTICLE 1 - OBJET',
    '',
    'Le Bailleur donne a bail commercial les locaux suivants :',
    'Adresse : ' + (adresse || '[Adresse]'),
    'Surface : ' + (property?.surface_m2 || form.surface || '[?]') + ' m2',
    'Usage autorise : ' + (form.usage || '[Activite commerciale]'),
    '', '',
    'ARTICLE 2 - DUREE',
    '',
    '9 ans a compter du ' + (form.date_debut || '[Date]') + '.',
    'Faculte de resiliation triennale avec 6 mois de preavis (LRAR).',
    '', '',
    'ARTICLE 3 - LOYER',
    '',
    'Loyer annuel HT : ' + loyerAnnuel + ' EUR',
    'Loyer mensuel HT : ' + (form.loyer_hc || '[?]') + ' EUR',
    'TVA : ' + (form.tva === 'oui' ? 'Applicable' : 'Non applicable'),
    'Payable le ' + (form.jour_paiement || '1er') + ' de chaque mois.',
    '',
    'Revision triennale selon l\'indice ' + (property?.indice_revision?.toUpperCase() || form.indice || 'ILC') + '.',
    'Indice de reference a la signature : ' + (form.indice_ref || '[Indice]'),
    '', '',
    'ARTICLE 4 - DEPOT DE GARANTIE',
    '',
    'Montant : ' + (form.depot || String(Number(form.loyer_hc || 0) * 3)) + ' EUR (3 mois HT)',
    '', '',
    'ARTICLE 5 - DROIT AU RENOUVELLEMENT',
    '',
    'Le Locataire dispose d\'un droit au renouvellement a l\'expiration du bail.',
    'En cas de refus, le Bailleur doit verser une indemnite d\'eviction.',
    signatures(form),
  ].join('\n')
}

export function generateMobilite(form: any, property: any): string {
  const adresse = [property?.address, property?.postal_code, property?.city].filter(Boolean).join(', ')

  return [
    header('Bail mobilite', 'Loi ELAN du 23 novembre 2018 - art. 107 a 123', form),
    '', '',
    'ARTICLE 1 - OBJET',
    '',
    'Logement meuble : ' + (adresse || '[Adresse]'),
    'Surface : ' + (property?.surface_m2 || form.surface || '[?]') + ' m2',
    '',
    'Motif du bail mobilite (cocher) :',
    '[ ] Formation professionnelle  [ ] Etudes superieures',
    '[ ] Stage  [ ] Apprentissage  [ ] Mission temporaire',
    '', '',
    'ARTICLE 2 - DUREE',
    '',
    'Duree : ' + (form.duree || '[X]') + ' mois',
    'Du ' + (form.date_debut || '[debut]') + ' au ' + (form.date_fin || '[fin]') + '.',
    'Ce bail ne peut etre renouvele ni reconduit.',
    '', '',
    'ARTICLE 3 - LOYER',
    '',
    'Loyer mensuel : ' + (form.loyer_hc || '[?]') + ' EUR',
    'Charges : ' + (form.charges || '0') + ' EUR',
    '',
    'AUCUN DEPOT DE GARANTIE ne peut etre exige.',
    '', '',
    'ARTICLE 4 - RESILIATION',
    '',
    'Le Locataire peut resilier a tout moment avec 1 mois de preavis.',
    signatures(form),
  ].join('\n')
}

export function generateSaisonnier(form: any, property: any): string {
  const adresse = [property?.address, property?.postal_code, property?.city].filter(Boolean).join(', ')
  const totalSejour = Number(form.loyer_hc || 0) * Number(form.nb_nuits || 1)
  const totalPayer = totalSejour + Number(form.depot || 500) + Number(form.frais_menage || 80)

  return [
    header('Contrat de location saisonniere', 'Art. L631-7 CCH - 120 nuits/an residence principale', form),
    '', '',
    'Logement : ' + (adresse || '[Adresse]'),
    'Surface : ' + (property?.surface_m2 || form.surface || '[?]') + ' m2',
    'Capacite maximale : ' + (form.capacite || '[X] personnes'),
    '', '',
    'ARTICLE 1 - DUREE',
    '',
    'Arrivee : ' + (form.date_debut || '[Date]') + ' a ' + (form.heure_arrivee || '15h00'),
    'Depart  : ' + (form.date_fin || '[Date]') + ' a ' + (form.heure_depart || '11h00'),
    'Duree   : ' + (form.nb_nuits || '[X]') + ' nuits',
    '', '',
    'ARTICLE 2 - PRIX',
    '',
    'Tarif : ' + (form.loyer_hc || '[?]') + ' EUR la nuit',
    'Total sejour : ' + totalSejour + ' EUR',
    'Caution : ' + (form.depot || '500') + ' EUR (remboursee sous 7 jours apres depart)',
    'Frais de menage : ' + (form.frais_menage || '80') + ' EUR',
    'TOTAL A PAYER : ' + totalPayer + ' EUR',
    '', '',
    'ARTICLE 3 - CONDITIONS',
    '',
    '- Animaux : ' + (form.animaux === 'oui' ? 'Acceptes' : 'Non acceptes'),
    '- Fumeurs : ' + (form.fumeurs === 'oui' ? 'Acceptes' : 'Non acceptes'),
    '- Fetes et evenements : interdits sans accord prealable',
    '- Arrhes : ' + (form.arrhes || '30') + '% a la signature',
    '', '',
    'Un etat des lieux contradictoire sera effectue a l\'entree et a la sortie.',
    signatures(form),
  ].join('\n')
}

export function generateBail(typeId: string, form: any, property: any): string {
  switch (typeId) {
    case 'meuble': return generateMeuble(form, property)
    case 'nu': return generateNu(form, property)
    case 'commercial': return generateCommercial(form, property)
    case 'mobilite': return generateMobilite(form, property)
    case 'airbnb': return generateSaisonnier(form, property)
    case 'professionnel': return generateNu(form, property) // base similaire
    default: return generateMeuble(form, property)
  }
}
