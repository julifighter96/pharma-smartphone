// =============================================================
// PHARMA CRM - MOCK DATA  (replace with real backend later)
// =============================================================

const DB = {

  // ── Products ──────────────────────────────────────────────
  products: [
    { id: 'p1', name: 'Nexovit 10 mg', category: 'Kardiologie' },
    { id: 'p2', name: 'Cardioplus Retard', category: 'Kardiologie' },
    { id: 'p3', name: 'DermaClair Creme', category: 'Dermatologie' },
    { id: 'p4', name: 'Respiflex 200', category: 'Pneumologie' },
    { id: 'p5', name: 'OsteoCalc D3', category: 'Orthopädie' },
    { id: 'p6', name: 'Pädiatrin Saft', category: 'Pädiatrie' },
    { id: 'p7', name: 'NeuroBalance 5', category: 'Neurologie' },
  ],

  // ── Customers ─────────────────────────────────────────────
  customers: [
    {
      id: 'c1', type: 'doctor', priority: 'A',
      name: 'Dr. med. Michael Bergmann',
      practice: 'Praxis Bergmann',
      specialty: 'Allgemeinmedizin',
      address: 'Leopoldstraße 45, 80802 München',
      phone: '+49 89 12345600',
      email: 'praxis@bergmann-muc.de',
      lat: 48.1590, lng: 11.5778,
      lastContact: '2026-04-10',
      potentialProducts: ['p1', 'p5'],
      notes: 'Sehr offen für Nexovit. Follow-up wegen OsteoCalc vereinbart.',
    },
    {
      id: 'c2', type: 'doctor', priority: 'A',
      name: 'Dr. med. Sarah Müller',
      practice: 'Dermatologische Praxis Müller',
      specialty: 'Dermatologie',
      address: 'Amalienstraße 22, 80333 München',
      phone: '+49 89 23456700',
      email: 'info@derma-mueller.de',
      lat: 48.1487, lng: 11.5780,
      lastContact: '2026-04-03',
      potentialProducts: ['p3'],
      notes: 'DermaClair läuft sehr gut. Muster für Neuprodukt anfragen.',
    },
    {
      id: 'c3', type: 'doctor', priority: 'B',
      name: 'Dr. med. Klaus Weber',
      practice: 'Kardiologische Praxis Weber',
      specialty: 'Kardiologie',
      address: 'Prinzregentenstraße 89, 81677 München',
      phone: '+49 89 34567800',
      email: 'praxis@kardiologie-weber.de',
      lat: 48.1520, lng: 11.6150,
      lastContact: '2026-03-28',
      potentialProducts: ['p1', 'p2'],
      notes: 'Cardioplus eingeführt. Nexovit noch skeptisch – Studie mitbringen.',
    },
    {
      id: 'c4', type: 'doctor', priority: 'A',
      name: 'Dr. med. Anna Hoffmann',
      practice: 'Kinderarztpraxis Hoffmann',
      specialty: 'Pädiatrie',
      address: 'Rosenheimer Str. 12, 81669 München',
      phone: '+49 89 45678900',
      email: 'info@dr-hoffmann-kinder.de',
      lat: 48.1283, lng: 11.6017,
      lastContact: '2026-04-15',
      potentialProducts: ['p6'],
      notes: 'Pädiatrin Saft sehr beliebt. Großes Potential für Nachbestellung.',
    },
    {
      id: 'c5', type: 'doctor', priority: 'B',
      name: 'Dr. med. Thomas Fischer',
      practice: 'Orthopädiezentrum Fischer',
      specialty: 'Orthopädie',
      address: 'Schleißheimer Str. 200, 80797 München',
      phone: '+49 89 56789010',
      email: 'kontakt@ortho-fischer.de',
      lat: 48.1670, lng: 11.5740,
      lastContact: '2026-04-01',
      potentialProducts: ['p5'],
      notes: 'OsteoCalc D3 läuft gut. Preis war Thema, Rabattmöglichkeit prüfen.',
    },
    {
      id: 'c6', type: 'doctor', priority: 'C',
      name: 'Dr. med. Maria Schmidt',
      practice: 'Gynäkologische Praxis Schmidt',
      specialty: 'Gynäkologie',
      address: 'Lindwurmstr. 80, 80337 München',
      phone: '+49 89 67890120',
      email: 'praxis@dr-schmidt-gyn.de',
      lat: 48.1149, lng: 11.5500,
      lastContact: '2026-03-15',
      potentialProducts: ['p5'],
      notes: 'Wenig Zeit beim letzten Besuch. Neuen Termin anfragen.',
    },
    {
      id: 'c7', type: 'doctor', priority: 'B',
      name: 'Dr. med. Peter Brandt',
      practice: 'Internistische Praxis Brandt',
      specialty: 'Innere Medizin',
      address: 'Nymphenburger Str. 55, 80335 München',
      phone: '+49 89 78901230',
      email: 'info@praxis-brandt.de',
      lat: 48.1534, lng: 11.5320,
      lastContact: '2026-04-08',
      potentialProducts: ['p1', 'p2', 'p4'],
      notes: 'Breites Interesse. Respiflex neu eingeführt. Gut vernetzt.',
    },
    {
      id: 'c8', type: 'doctor', priority: 'A',
      name: 'Dr. med. Julia Vogt',
      practice: 'Neurologische Praxis Vogt',
      specialty: 'Neurologie',
      address: 'Ungererstraße 70, 80805 München',
      phone: '+49 89 89012340',
      email: 'praxis@neuro-vogt.de',
      lat: 48.1610, lng: 11.5700,
      lastContact: '2026-04-12',
      potentialProducts: ['p7'],
      notes: 'NeuroBalance sehr positiv aufgenommen. KOL-Potenzial.',
    },
    {
      id: 'c9', type: 'doctor', priority: 'C',
      name: 'Dr. med. Hans Bauer',
      practice: 'Allgemeinarztpraxis Bauer',
      specialty: 'Allgemeinmedizin',
      address: 'Pasinger Hauptstr. 18, 81241 München',
      phone: '+49 89 90123450',
      email: 'praxis@dr-bauer-pasing.de',
      lat: 48.1490, lng: 11.4545,
      lastContact: '2026-03-10',
      potentialProducts: ['p1', 'p6'],
      notes: 'Weit entfernt. Kombination mit anderen Besuchen planen.',
    },
    {
      id: 'c10', type: 'doctor', priority: 'B',
      name: 'Dr. med. Christine Meyer',
      practice: 'HNO-Praxis Meyer',
      specialty: 'Hals-Nasen-Ohren',
      address: 'Regerplatz 3, 81541 München',
      phone: '+49 89 01234560',
      email: 'praxis@hno-meyer.de',
      lat: 48.1220, lng: 11.5900,
      lastContact: '2026-04-05',
      potentialProducts: ['p4'],
      notes: 'Respiflex Muster übergeben. Sehr interessiert.',
    },
    {
      id: 'c11', type: 'doctor', priority: 'B',
      name: 'Dr. med. Robert Wagner',
      practice: 'Urologische Praxis Wagner',
      specialty: 'Urologie',
      address: 'Türkenstraße 58, 80799 München',
      phone: '+49 89 11223340',
      email: 'info@urologie-wagner.de',
      lat: 48.1487, lng: 11.5610,
      lastContact: '2026-03-25',
      potentialProducts: ['p2'],
      notes: 'Neu auf unserer Route. Erstbesuch sehr gut verlaufen.',
    },
    {
      id: 'c12', type: 'doctor', priority: 'C',
      name: 'Dr. med. Elisabeth Schneider',
      practice: 'Praxis Schneider',
      specialty: 'Allgemeinmedizin',
      address: 'Chiemgaustraße 30, 81549 München',
      phone: '+49 89 22334450',
      email: 'praxis@schneider-giesing.de',
      lat: 48.1100, lng: 11.5950,
      lastContact: '2026-02-28',
      potentialProducts: ['p5'],
      notes: 'Langjährige Kundin. Wenig Frequenz nötig.',
    },
    {
      id: 'c13', type: 'doctor', priority: 'A',
      name: 'Dr. med. Martin Klein',
      practice: 'Augenarztpraxis Klein',
      specialty: 'Augenheilkunde',
      address: 'Maximilianstraße 7, 80539 München',
      phone: '+49 89 33445560',
      email: 'info@augenarzt-klein.de',
      lat: 48.1380, lng: 11.5880,
      lastContact: '2026-04-18',
      potentialProducts: ['p1'],
      notes: 'Sehr einflussreich im Ärztenetz. Kongress-Einladung besprechen.',
    },
    {
      id: 'c14', type: 'doctor', priority: 'B',
      name: 'Dr. med. Sandra Koch',
      practice: 'Allgemeinarztpraxis Koch',
      specialty: 'Allgemeinmedizin',
      address: 'Milbertshofener Str. 42, 80807 München',
      phone: '+49 89 44556670',
      email: 'praxis@dr-koch-nord.de',
      lat: 48.1720, lng: 11.5680,
      lastContact: '2026-04-14',
      potentialProducts: ['p1', 'p4'],
      notes: 'Sehr effizienter Besuch. Immer gut vorbereitet.',
    },
    {
      id: 'c15', type: 'doctor', priority: 'B',
      name: 'Dr. med. Wolfgang Richter',
      practice: 'Chirurgische Praxis Richter',
      specialty: 'Chirurgie',
      address: 'Ismaninger Str. 22, 81675 München',
      phone: '+49 89 55667780',
      email: 'praxis@chirurgie-richter.de',
      lat: 48.1480, lng: 11.6200,
      lastContact: '2026-04-02',
      potentialProducts: ['p5'],
      notes: 'Sehr beschäftigt. Kurze Besuche bevorzugt.',
    },
    // ── Pharmacies ────────────────────────────────────────────
    {
      id: 'c16', type: 'pharmacy', priority: 'A',
      name: 'Apotheke am Marienplatz',
      practice: '',
      specialty: 'Apotheke',
      address: 'Marienplatz 8, 80331 München',
      phone: '+49 89 22 44 55',
      email: 'info@apotheke-marienplatz.de',
      lat: 48.1374, lng: 11.5754,
      lastContact: '2026-04-17',
      potentialProducts: ['p1', 'p2', 'p3', 'p5'],
      notes: 'Größte Apotheke im Stadtgebiet. Hoher Umsatz.',
    },
    {
      id: 'c17', type: 'pharmacy', priority: 'A',
      name: 'Schwabing Apotheke',
      practice: '',
      specialty: 'Apotheke',
      address: 'Leopoldstraße 120, 80804 München',
      phone: '+49 89 34 56 78',
      email: 'info@schwabing-apotheke.de',
      lat: 48.1600, lng: 11.5820,
      lastContact: '2026-04-10',
      potentialProducts: ['p1', 'p6', 'p7'],
      notes: 'Sehr gutes Display für Aktionsprodukte.',
    },
    {
      id: 'c18', type: 'pharmacy', priority: 'B',
      name: 'Löwen-Apotheke Neuhausen',
      practice: '',
      specialty: 'Apotheke',
      address: 'Nymphenburger Str. 88, 80636 München',
      phone: '+49 89 45 67 89',
      email: 'info@loewen-apotheke-muc.de',
      lat: 48.1550, lng: 11.5350,
      lastContact: '2026-04-06',
      potentialProducts: ['p3', 'p4'],
      notes: 'Interessiert an Sonderkonditionen für DermaClair.',
    },
    {
      id: 'c19', type: 'pharmacy', priority: 'B',
      name: 'Hofapotheke',
      practice: '',
      specialty: 'Apotheke',
      address: 'Residenzstraße 4, 80333 München',
      phone: '+49 89 22 80 30',
      email: 'info@hofapotheke-muenchen.de',
      lat: 48.1392, lng: 11.5721,
      lastContact: '2026-04-08',
      potentialProducts: ['p1', 'p2'],
      notes: 'Traditionell, gute Kundenbindung.',
    },
    {
      id: 'c20', type: 'pharmacy', priority: 'A',
      name: 'City Apotheke Maxvorstadt',
      practice: '',
      specialty: 'Apotheke',
      address: 'Ludwigstraße 10, 80539 München',
      phone: '+49 89 28 50 60',
      email: 'info@cityapotheke-max.de',
      lat: 48.1470, lng: 11.5660,
      lastContact: '2026-04-16',
      potentialProducts: ['p1', 'p5', 'p7'],
      notes: 'Nahe Uni, viele junge Kunden. Gut für Neuprodukte.',
    },
    {
      id: 'c21', type: 'pharmacy', priority: 'C',
      name: 'Nord Apotheke',
      practice: '',
      specialty: 'Apotheke',
      address: 'Ingolstädter Str. 40, 80807 München',
      phone: '+49 89 35 89 70',
      email: 'info@nord-apotheke-muc.de',
      lat: 48.1680, lng: 11.5580,
      lastContact: '2026-03-20',
      potentialProducts: ['p4', 'p6'],
      notes: 'Kleiner Standort. Monatlicher Kontakt ausreichend.',
    },
    {
      id: 'c22', type: 'pharmacy', priority: 'B',
      name: 'Haidhausen Apotheke',
      practice: '',
      specialty: 'Apotheke',
      address: 'Wörthstraße 10, 81667 München',
      phone: '+49 89 48 20 33',
      email: 'info@apotheke-haidhausen.de',
      lat: 48.1300, lng: 11.5990,
      lastContact: '2026-04-11',
      potentialProducts: ['p3', 'p6'],
      notes: 'Engagiertes Team. Gute Lage nahe Praxis Hoffmann.',
    },
  ],

  // ── Visits (history) ─────────────────────────────────────
  visits: [
    { id: 'v1', customerId: 'c1', date: '2026-04-10', duration: 25, products: ['p1', 'p5'], rating: '😊', notes: 'Nexovit Verschreibungen gestiegen. OsteoCalc für nächsten Besuch vorgemerkt.', rep: 'Julian R.' },
    { id: 'v2', customerId: 'c1', date: '2026-03-12', duration: 20, products: ['p1'], rating: '😊', notes: 'Positive Rückmeldung zu Nexovit. Neue Studie übergeben.', rep: 'Julian R.' },
    { id: 'v3', customerId: 'c2', date: '2026-04-03', duration: 15, products: ['p3'], rating: '🤩', notes: 'DermaClair sehr gut angenommen. Muster bestellt.', rep: 'Julian R.' },
    { id: 'v4', customerId: 'c2', date: '2026-03-05', duration: 20, products: ['p3'], rating: '😊', notes: 'Einführungsgespräch DermaClair.', rep: 'Julian R.' },
    { id: 'v5', customerId: 'c3', date: '2026-03-28', duration: 30, products: ['p1', 'p2'], rating: '😐', notes: 'Nexovit-Studie noch nicht gelesen. Skeptisch. Nächster Besuch mit Daten.', rep: 'Julian R.' },
    { id: 'v6', customerId: 'c4', date: '2026-04-15', duration: 20, products: ['p6'], rating: '🤩', notes: 'Großbestellung Pädiatrin Saft. Praxis wächst.', rep: 'Julian R.' },
    { id: 'v7', customerId: 'c4', date: '2026-03-18', duration: 15, products: ['p6'], rating: '😊', notes: 'Ersteinführung Pädiatrin Saft.', rep: 'Julian R.' },
    { id: 'v8', customerId: 'c5', date: '2026-04-01', duration: 20, products: ['p5'], rating: '😊', notes: 'OsteoCalc läuft. Preis war Thema.', rep: 'Julian R.' },
    { id: 'v9', customerId: 'c7', date: '2026-04-08', duration: 25, products: ['p1', 'p4'], rating: '🤩', notes: 'Respiflex gut aufgenommen. Nexovit weiter ausgebaut.', rep: 'Julian R.' },
    { id: 'v10', customerId: 'c8', date: '2026-04-12', duration: 30, products: ['p7'], rating: '🤩', notes: 'KOL-Potenzial bestätigt. Kongress-Einladung besprochen.', rep: 'Julian R.' },
    { id: 'v11', customerId: 'c13', date: '2026-04-18', duration: 20, products: ['p1'], rating: '😊', notes: 'Nexovit Verschreibung gestiegen. Sehr nettes Gespräch.', rep: 'Julian R.' },
    { id: 'v12', customerId: 'c16', date: '2026-04-17', duration: 20, products: ['p1', 'p3'], rating: '🤩', notes: 'Großes Display für DermaClair vereinbart.', rep: 'Julian R.' },
    { id: 'v13', customerId: 'c17', date: '2026-04-10', duration: 15, products: ['p7'], rating: '😊', notes: 'NeuroBalance neu gelistet.', rep: 'Julian R.' },
    { id: 'v14', customerId: 'c20', date: '2026-04-16', duration: 20, products: ['p5'], rating: '😊', notes: 'OsteoCalc sehr gefragt bei Studenten (Vitamin D). Nachbestellung.', rep: 'Julian R.' },
  ],

  // ── Appointments (today = 2026-04-24) ────────────────────
  appointments: [
    {
      id: 'a1', customerId: 'c1',
      date: '2026-04-24', time: '09:00', duration: 30,
      type: 'visit', status: 'done',
      notes: 'OsteoCalc D3 besprechen, Studie mitbringen',
    },
    {
      id: 'a2', customerId: 'c17',
      date: '2026-04-24', time: '10:15', duration: 20,
      type: 'visit', status: 'done',
      notes: 'Pädiatrin Saft Nachbestellung klären',
    },
    {
      id: 'a3', customerId: 'c2',
      date: '2026-04-24', time: '11:30', duration: 25,
      type: 'visit', status: 'upcoming',
      notes: 'Neues Produktmuster DermaClair Pro mitbringen',
    },
    {
      id: 'a4', customerId: 'c3',
      date: '2026-04-24', time: '14:00', duration: 30,
      type: 'visit', status: 'upcoming',
      notes: 'Nexovit Studie präsentieren',
    },
    {
      id: 'a5', customerId: 'c5',
      date: '2026-04-24', time: '15:30', duration: 20,
      type: 'visit', status: 'upcoming',
      notes: 'Preisverhandlung OsteoCalc',
    },
    {
      id: 'a6', customerId: 'c7',
      date: '2026-04-24', time: '16:30', duration: 20,
      type: 'visit', status: 'upcoming',
      notes: 'Respiflex Follow-up',
    },
  ],

  // ── Sales Rep ─────────────────────────────────────────────
  rep: {
    name: 'Julian Reitermann',
    region: 'München Nord/Mitte',
    team: 'Außendienst Team Süd',
    email: 'julian@venturerox.com',
    phone: '+49 176 12345678',
    quota: { target: 48, current: 31 },
  },
};

// ── Helper functions ──────────────────────────────────────────

DB.getCustomer = (id) => DB.customers.find(c => c.id === id);

DB.getVisitsForCustomer = (id) => DB.visits
  .filter(v => v.customerId === id)
  .sort((a, b) => new Date(b.date) - new Date(a.date));

DB.getTodayAppointments = () => {
  const today = new Date().toISOString().split('T')[0];
  return DB.appointments
    .filter(a => a.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
};

DB.searchCustomers = (query) => {
  const q = query.toLowerCase();
  return DB.customers.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.practice.toLowerCase().includes(q) ||
    c.specialty.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q)
  );
};

DB.getProductName = (id) => {
  const p = DB.products.find(p => p.id === id);
  return p ? p.name : id;
};

DB.addVisit = (visit) => {
  visit.id = 'v' + Date.now();
  visit.rep = DB.rep.name;
  DB.visits.unshift(visit);
  // Update last contact
  const c = DB.customers.find(c => c.id === visit.customerId);
  if (c) c.lastContact = visit.date;
  return visit;
};

DB.addCustomer = (customer) => {
  customer.id = 'c' + Date.now();
  customer.lastContact = '';
  customer.potentialProducts = [];
  customer.lat = 48.1351 + (Math.random() - 0.5) * 0.08;
  customer.lng = 11.5820 + (Math.random() - 0.5) * 0.08;
  DB.customers.push(customer);
  return customer;
};
