import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const SUPABASE_URL = 'https://zoxjfxmfbpjhvagshwmq.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveGpmeG1mYnBqaHZhZ3Nod21xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA4MjYzOSwiZXhwIjoyMDk1NjU4NjM5fQ.lBmVsPi7dybNBNV9hfuygSBfpg7P7ASBW7uc6J7dAdU'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

async function createBailPdf() {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const { width, height } = page.getSize()
  const black = rgb(0.1, 0.1, 0.1)
  const gray = rgb(0.5, 0.5, 0.5)
  const blue = rgb(0.1, 0.33, 0.86)

  // Titre
  page.drawText('CONTRAT DE LOCATION MEUBLEE', {
    x: 50, y: height - 70, size: 16, font: fontBold, color: black,
  })
  page.drawText('(Loi n° 89-462 du 6 juillet 1989)', {
    x: 50, y: height - 90, size: 10, font, color: gray,
  })

  // Ligne de séparation
  page.drawLine({ start: { x: 50, y: height - 100 }, end: { x: width - 50, y: height - 100 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

  // Parties
  let y = height - 130
  const drawSection = (title, lines) => {
    page.drawText(title, { x: 50, y, size: 11, font: fontBold, color: blue })
    y -= 20
    for (const line of lines) {
      page.drawText(line, { x: 60, y, size: 10, font, color: black })
      y -= 16
    }
    y -= 10
  }

  drawSection('PARTIES AU CONTRAT', [
    'BAILLEUR : [Votre nom et prénom]',
    'Adresse : [Votre adresse]',
    '',
    'LOCATAIRE : Sophie Martin',
    'Adresse actuelle : 5 rue de la Paix, 75001 Paris',
  ])

  drawSection('ARTICLE 1 — OBJET DU CONTRAT', [
    'Le présent contrat a pour objet la location du logement meublé désigné ci-après,',
    'situé à : 18 rue Lepic, 75018 Paris',
    'Description : Studio meublé — Surface habitable : 28 m²',
    'Étage : 3ème — Immeuble sans ascenseur',
  ])

  drawSection('ARTICLE 2 — DURÉE', [
    'Le présent contrat est conclu pour une durée de 1 (un) an,',
    'à compter du 1er septembre 2021.',
    'Il se renouvelle tacitement par période de 1 an.',
    'Préavis de départ : 1 mois (locataire) / 3 mois (bailleur).',
  ])

  drawSection('ARTICLE 3 — LOYER ET CHARGES', [
    'Loyer mensuel : 850,00 € (huit cent cinquante euros)',
    'Charges forfaitaires : 80,00 € (quatre-vingts euros)',
    'Total mensuel charges comprises : 930,00 €',
    'Révision annuelle selon l\'Indice de Référence des Loyers (IRL).',
    'Indice de référence à la signature : IRL T3 2021 = 131.67',
  ])

  drawSection('ARTICLE 4 — DÉPÔT DE GARANTIE', [
    'Montant : 1 700,00 € (correspondant à 2 mois de loyer hors charges)',
    'Restitution dans le délai légal d\'1 mois après remise des clés',
    '(si état des lieux de sortie conforme) ou 2 mois (si réserves).',
  ])

  drawSection('ARTICLE 5 — INDEXATION', [
    'Le loyer sera révisé chaque année à la date anniversaire du bail,',
    'en fonction de la variation de l\'IRL publié par l\'INSEE.',
    'Formule : Nouveau loyer = Loyer × (IRL nouveau / IRL référence)',
  ])

  drawSection('ARTICLE 6 — OBLIGATIONS DU LOCATAIRE', [
    '• Payer le loyer et les charges aux termes convenus',
    '• Souscrire une assurance habitation et en justifier annuellement',
    '• User paisiblement des locaux',
    '• Ne pas sous-louer sans accord écrit du bailleur',
    '• Restituer le logement en bon état en fin de bail',
  ])

  // Signatures
  y -= 20
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 30
  page.drawText('Fait à Paris, le 1er septembre 2021, en deux exemplaires originaux.', { x: 50, y, size: 10, font, color: black })
  y -= 50
  page.drawText('Le Bailleur :', { x: 50, y, size: 10, font: fontBold, color: black })
  page.drawText('Le Locataire :', { x: 320, y, size: 10, font: fontBold, color: black })
  y -= 60
  page.drawText('Signature :', { x: 50, y, size: 9, font, color: gray })
  page.drawText('Signature :', { x: 320, y, size: 9, font, color: gray })
  page.drawLine({ start: { x: 105, y: y + 3 }, end: { x: 260, y: y + 3 }, thickness: 0.5, color: gray })
  page.drawLine({ start: { x: 375, y: y + 3 }, end: { x: 530, y: y + 3 }, thickness: 0.5, color: gray })

  // Pied de page
  page.drawText('Document généré par Propilot AI — Exemple de bail meublé', {
    x: 50, y: 30, size: 8, font, color: gray,
  })

  return await pdfDoc.save()
}

async function run() {
  console.log('📄 Génération du PDF de bail démo...')
  const pdfBytes = await createBailPdf()

  // Upload vers Supabase Storage
  const fileName = `demo/bail-sophie-martin-2021.pdf`
  console.log('☁️  Upload vers Supabase Storage (bucket: baux)...')
  const { error: uploadError } = await supabase.storage
    .from('baux')
    .upload(fileName, pdfBytes, { contentType: 'application/pdf', upsert: true })

  if (uploadError) {
    console.error('❌ Erreur upload:', uploadError.message)
    process.exit(1)
  }

  const { data: { publicUrl } } = supabase.storage.from('baux').getPublicUrl(fileName)
  console.log('✅ PDF uploadé :', publicUrl)

  // Trouver le bail de Sophie Martin et le mettre à jour
  const { data: lease } = await supabase
    .from('leases')
    .select('id, tenant_name')
    .ilike('tenant_name', '%sophie%')
    .single()

  if (lease) {
    await supabase.from('leases').update({ pdf_url: publicUrl }).eq('id', lease.id)
    console.log(`✅ Bail de "${lease.tenant_name}" mis à jour avec le PDF`)
  } else {
    // Prendre le premier bail actif disponible
    const { data: firstLease } = await supabase
      .from('leases')
      .select('id, tenant_name')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (firstLease) {
      await supabase.from('leases').update({ pdf_url: publicUrl }).eq('id', firstLease.id)
      console.log(`✅ Bail de "${firstLease.tenant_name}" mis à jour avec le PDF`)
    } else {
      console.log('⚠️  Aucun bail trouvé — chargez les données démo d\'abord via /exports')
    }
  }

  console.log('\n🎉 Terminé ! Allez sur /baux pour voir le bouton "Voir" et "Télécharger"')
}

run().catch(console.error)
