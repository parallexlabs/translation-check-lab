/** Thirty distinct synthetic English humanitarian SMS scenarios for evaluation. */
export const EN_EVAL_MESSAGES = [
  'Boil tap water for 10 minutes before drinking.',
  'Do not drink water from Well 12 until further notice.',
  'Food distribution at Site 7 on 4 April at 14:00. Bring ID.',
  'Shelter Hall 3 opens at 18:00. No pets allowed.',
  'Call 0800-77-88-90 for protection concerns. Lines open 24 hours.',
  'Cash assistance: 150 USD per household. Register by 20 May.',
  'Do not use Road B. Use Road C to reach Reception Centre A.',
  'Free measles vaccination at Clinic North on 12 October, 8:30 a.m. to 4:00 p.m.',
  'Water point at Municipal Park closes at 16:30. Do not drink untreated water.',
  'SMS alert: 60% of households registered. Deadline 15:00 today.',
  'Distribution of 2 NFI kits per family at School 5 on 14 June.',
  'Evacuate low-lying areas before 22:00. Go to Site 9 immediately.',
  'Report missing persons to the help desk at Centre East.',
  'Wash hands with soap for 20 seconds after contact with flood water.',
  'Stay indoors until the all-clear siren sounds at 06:00.',
  'Leave Road 14. Temporary route via Road 18 is open.',
  'Wait at Entrance F for step-free boarding to Shelter Hall 2.',
  'Collect your ration card from Office 4 between 9:00 a.m. and 12:00 p.m.',
  'Avoid flooded streets near River Park. Use Bridge Route 6.',
  'Register for cash transfer by calling *12345# before 30 April.',
  'Boil drinking water from Well 3 for at least 5 minutes.',
  'Food distribution for registered households only at Site 11 on 8 May at 10:00.',
  'Do not enter damaged buildings. Call 0800-123-456 for help.',
  'Vaccination campaign at Clinic South on Wednesday 9:00 a.m. Children under 5 must come with a parent.',
  'Shelter Gymnasium 2 accepts families from 19:00. Capacity: 120 people.',
  'MHPSS helpline: 0800-77-88-99, 8:00 a.m. to 8:00 p.m. Free and confidential service.',
  'Bring your ID card to the WASH kit pickup at Site 2 on 04-04 at 11:00.',
  'Use only bottled water from Site 8 until test results on 15 July.',
  'Go to Reception Centre B if you hear the evacuation alert.',
  'Emergency water delivery at Well 15 from 07:00 to 09:00 on 2 August.',
];

/** Thirty distinct synthetic French humanitarian SMS scenarios for evaluation. */
export const FR_EVAL_MESSAGES = [
  'Faites bouillir l\'eau du robinet pendant 10 minutes avant de boire.',
  'Ne buvez pas l\'eau du puits 12 avant nouvel ordre.',
  'Distribution alimentaire au site 7 le 4 avril à 14 h. Apportez une pièce d\'identité.',
  'Le refuge Hall 3 ouvre à 18 h. Les animaux ne sont pas admis.',
  'Composez le 0800-77-88-90 pour des préoccupations de protection. Lignes ouvertes 24 h.',
  'Aide en espèces : 150 USD par ménage. Inscrivez-vous avant le 20 mai.',
  'N\'utilisez pas la route B. Empruntez la route C vers le centre d\'accueil A.',
  'Vaccination gratuite contre la rougeole à la clinique Nord le 12 octobre, de 8 h 30 à 16 h.',
  'Point d\'eau au parc municipal fermé à 16 h 30. Ne buvez pas d\'eau non traitée.',
  'Alerte SMS : 60 % des ménages inscrits. Date limite 15 h aujourd\'hui.',
  'Distribution de 2 kits NFI par famille à l\'école 5 le 14 juin.',
  'Évacuez les zones basses avant 22 h. Rendez-vous immédiatement au site 9.',
  'Signalez les personnes disparues au bureau d\'aide du centre Est.',
  'Lavez-vous les mains avec du savon pendant 20 secondes après contact avec l\'eau de crue.',
  'Restez à l\'intérieur jusqu\'au signal de fin d\'alerte à 6 h.',
  'Quittez la route 14. Itinéraire temporaire via la route 18 ouvert.',
  'Attendez à l\'entrée F pour l\'embarquement accessible au refuge Hall 2.',
  'Récupérez votre carte de ration au bureau 4 entre 9 h et 12 h.',
  'Évitez les rues inondées près du parc fluvial. Empruntez la route du pont 6.',
  'Inscrivez-vous au transfert d\'argent en composant *12345# avant le 30 avril.',
  'Faites bouillir l\'eau potable du puits 3 pendant au moins 5 minutes.',
  'Distribution alimentaire réservée aux ménages inscrits au site 11 le 8 mai à 10 h.',
  'N\'entrez pas dans les bâtiments endommagés. Appelez le 0800-123-456 pour de l\'aide.',
  'Campagne de vaccination à la clinique Sud mercredi à 9 h. Les enfants de moins de 5 ans doivent venir avec un parent.',
  'Le refuge Gymnase 2 accepte les familles à partir de 19 h. Capacité : 120 personnes.',
  'Ligne d\'écoute MHPSS : 0800-77-88-99, de 8 h à 20 h. Service gratuit et confidentiel.',
  'Apportez votre carte d\'identité au point de collecte WASH au site 2 le 04-04 à 11 h.',
  'Utilisez uniquement l\'eau en bouteille du site 8 jusqu\'aux résultats des tests le 15 juillet.',
  'Allez au centre d\'accueil B si vous entendez l\'alerte d\'évacuation.',
  'Livraison d\'eau d\'urgence au puits 15 de 7 h à 9 h le 2 août.',
];

/**
 * @param {'en'|'fr'} lang
 * @param {number} count
 * @returns {string[]}
 */
export function getEvalMessages(lang, count) {
  const pool = lang === 'fr' ? FR_EVAL_MESSAGES : EN_EVAL_MESSAGES;
  if (count > pool.length) {
    throw new Error(`Requested ${count} messages but only ${pool.length} distinct scenarios exist for ${lang}`);
  }
  return pool.slice(0, count);
}

/**
 * @param {string} pairKey
 * @returns {'en'|'fr'}
 */
export function evalSourceLangForPair(pairKey) {
  if (pairKey === 'fr-en') return 'fr';
  return 'en';
}
