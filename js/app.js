// =============================================================
// PHARMA CRM  –  App Controller
// =============================================================
// GOOGLE MAPS API KEY:
//   Replace 'YOUR_GOOGLE_MAPS_API_KEY' in index.html with
//   your actual key from https://console.cloud.google.com
//   Required APIs: Maps JavaScript API
// =============================================================

const App = (() => {

  // ── Tesseract lazy-load handle ────────────────────────────
  let _tesseractReady = null;

  // ── State ─────────────────────────────────────────────────
  let state = {
    view: 'today',            // current top-level view
    detailId: null,           // customer being viewed
    filter: { type: 'all', specialty: null },
    radius: 5,                // km for nearby
    searchQuery: '',
    searchActive: false,
    userLat: null, userLng: null,
    gmap: null,               // Google Map instance
    gmapReady: false,
    mapFilter: 'all',         // active category chip
    mapSearchQuery: '',       // search input on map
    mapMarkers: [],           // [{ id, marker }]
    mapSelectedId: null,      // tapped customer id
    selectedProds: [],        // visit doc form
    selectedRating: '😊',
    uploadedPhotos: [],
    sheetType: null,          // 'visit' | 'newcust'
    visitCustomerId: null,
    themes: [
      { name:'Orange',  primary:'#F57C00', dark:'#BF360C', light:'#FFE0B2', cont:'#FDEBD0', onCont:'#7F3300' },
      { name:'Blau',    primary:'#1565C0', dark:'#003c8f', light:'#BBDEFB', cont:'#E3F2FD', onCont:'#0D47A1' },
      { name:'Grün',    primary:'#2E7D32', dark:'#1b5e20', light:'#C8E6C9', cont:'#E8F5E9', onCont:'#1B5E20' },
      { name:'Violett', primary:'#6A1B9A', dark:'#38006b', light:'#E1BEE7', cont:'#F3E5F5', onCont:'#4A148C' },
      { name:'Teal',    primary:'#00695C', dark:'#004d40', light:'#B2DFDB', cont:'#E0F2F1', onCont:'#004D40' },
    ],
    activeTheme: 0,
  };

  // ── DOM refs ──────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const topbar    = () => $('#topbar-title');
  const mainEl    = () => $('#main');
  const fabEl     = () => $('#fab');

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    navigate('today');
    requestLocation();
    setupSwipe();
  }

  // ═══════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════
  function navigate(view, id) {
    state.view = view;
    state.detailId = id || null;
    updateBottomNav(view);
    renderView();
    closeSearch();
  }

  function goBack() {
    if (state.view === 'detail') {
      navigate('customers');
    } else {
      navigate('today');
    }
  }

  function updateBottomNav(view) {
    document.querySelectorAll('.bnav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });
    const backBtn = $('#back-btn');
    if (view === 'detail') {
      backBtn.classList.remove('hidden');
    } else {
      backBtn.classList.add('hidden');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // VIEW ROUTER
  // ═══════════════════════════════════════════════════════════
  function renderView() {
    const el = mainEl();
    let html = '';
    let title = 'PharmaApp';

    switch (state.view) {
      case 'today':
        html = renderToday(); title = 'Mein Tag'; break;
      case 'customers':
        html = renderCustomers(); title = 'Kunden'; break;
      case 'detail':
        html = renderDetail(state.detailId); title = ''; break;
      case 'map':
        html = renderMap(); title = 'Karte'; break;
      case 'nearby':
        html = renderNearby(); title = 'In der Nähe'; break;
      case 'profile':
        html = renderProfile(); title = 'Profil'; break;
      default:
        html = renderToday(); title = 'Mein Tag';
    }

    // Map needs to fill the full #main height — skip the view-enter wrapper
    // and disable scrolling so height:100% resolves correctly
    const isMap = state.view === 'map';
    el.style.overflow = isMap ? 'hidden' : '';
    el.innerHTML = isMap ? html : `<div class="view-enter">${html}</div>`;

    topbar().textContent = title;

    // FAB visibility
    fabEl().classList.toggle('hidden', isMap);

    // Post-render hooks — rAF lets the browser calculate layout before Maps init
    if (isMap) requestAnimationFrame(() => initGmap());
    if (state.view === 'profile') initThemeSwatches();
  }

  // ═══════════════════════════════════════════════════════════
  // TODAY VIEW
  // ═══════════════════════════════════════════════════════════
  function renderToday() {
    const now = new Date();
    const weekdays = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
    const months = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
    const wd = weekdays[now.getDay()];
    const d = now.getDate();
    const m = months[now.getMonth()];
    const y = now.getFullYear();

    const appts = DB.getTodayAppointments();
    const done = appts.filter(a => a.status === 'done').length;
    const total = appts.length;

    // Monthly stats
    const thisMonth = new Date().toISOString().substring(0,7);
    const monthVisits = DB.visits.filter(v => v.date.startsWith(thisMonth)).length;
    const quot = DB.rep.quota;

    return `
    <div class="today-view">
      <!-- Hero -->
      <div class="today-hero">
        <div class="today-date">
          <div class="wd">${wd}</div>
          <div class="d">${d}.</div>
          <div class="my">${m} ${y}</div>
        </div>
        <div class="today-progress">
          <div class="tp-val">${done}/${total}</div>
          <div class="tp-label">Termine heute</div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="sv">${monthVisits}</div>
          <div class="sl">Besuche April</div>
        </div>
        <div class="stat-card">
          <div class="sv">${quot.current}</div>
          <div class="sl">Quota ${quot.current}/${quot.target}</div>
        </div>
        <div class="stat-card">
          <div class="sv">${DB.customers.length}</div>
          <div class="sl">Kunden</div>
        </div>
      </div>

      <!-- Appointments -->
      <div>
        <div class="section-row" style="margin-bottom:10px">
          <span class="section-title">Heutige Termine</span>
          <button class="section-link" onclick="App.navigate('customers')">Alle Kunden</button>
        </div>
        <div class="appt-list">
          ${appts.length === 0
            ? `<div class="empty-state"><span class="mi">event_available</span><p>Keine Termine heute</p></div>`
            : appts.map(a => apptCard(a)).join('')}
        </div>
      </div>

      <!-- Quick nearby -->
      <div>
        <div class="section-row" style="margin-bottom:10px">
          <span class="section-title">Schnellzugriff</span>
        </div>
        <button class="btn btn-primary scan-quick-btn" onclick="App.showCardScanner()" style="width:100%;margin-bottom:8px">
          <span class="mi">document_scanner</span> Visitenkarte scannen
        </button>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <button class="btn btn-tonal" onclick="App.navigate('nearby')">
            <span class="mi">near_me</span> In der Nähe
          </button>
          <button class="btn btn-tonal" onclick="App.navigate('map')">
            <span class="mi">map</span> Karte
          </button>
          <button class="btn btn-outline" onclick="App.showNewCustomer()">
            <span class="mi">person_add</span> Neu anlegen
          </button>
          <button class="btn btn-outline" onclick="App.navigate('customers')">
            <span class="mi">people</span> Kunden
          </button>
        </div>
      </div>
    </div>`;
  }

  function apptCard(a) {
    const c = DB.getCustomer(a.customerId);
    if (!c) return '';
    const isDone = a.status === 'done';
    return `
    <div class="appt-item ${a.status}" onclick="App.navigate('detail','${c.id}')">
      <div class="appt-stripe"></div>
      <div class="appt-body">
        <div class="appt-time">${a.time} Uhr${a.duration ? ` · ${a.duration} min` : ''}</div>
        <div class="appt-name">${c.name}</div>
        <div class="appt-sub">
          <span class="mi">location_on</span>
          ${c.address.split(',')[0]}
        </div>
        ${a.notes ? `<div class="appt-sub" style="margin-top:3px"><span class="mi">note</span>${a.notes}</div>` : ''}
      </div>
      <div class="appt-meta">
        <span class="type-badge ${c.type}">${c.type === 'doctor' ? 'Arzt' : 'Apotheke'}</span>
        ${isDone ? `<span class="mi done-tick">check_circle</span>` : `<span class="mi" style="color:var(--clr-on-surface-var);font-size:20px">chevron_right</span>`}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOMERS VIEW
  // ═══════════════════════════════════════════════════════════
  const SPECIALTIES = [
    'Allgemeinmedizin','Dermatologie','Kardiologie','Pädiatrie',
    'Orthopädie','Gynäkologie','Innere Medizin','Neurologie',
    'HNO','Urologie','Augenheilkunde','Chirurgie',
  ];

  function renderCustomers() {
    let list = DB.customers;

    if (state.filter.type !== 'all') {
      list = list.filter(c => c.type === state.filter.type);
    }
    if (state.filter.specialty) {
      list = list.filter(c => c.specialty === state.filter.specialty);
    }
    if (state.searchQuery) {
      list = DB.searchCustomers(state.searchQuery);
    }

    return `
    <div class="customers-view">
      <!-- Filter bar -->
      <div class="filter-bar">
        <button class="chip ${state.filter.type==='all'?'active':''}"
          onclick="App.setFilter('type','all')">
          <span class="mi">apps</span> Alle
        </button>
        <button class="chip ${state.filter.type==='doctor'?'active':''}"
          onclick="App.setFilter('type','doctor')">
          <span class="mi">stethoscope</span> Ärzte
        </button>
        <button class="chip ${state.filter.type==='pharmacy'?'active':''}"
          onclick="App.setFilter('type','pharmacy')">
          <span class="mi">local_pharmacy</span> Apotheken
        </button>
        ${SPECIALTIES.map(s => `
          <button class="chip ${state.filter.specialty===s?'active':''}"
            onclick="App.setFilter('specialty','${s}')">
            ${s}
          </button>`).join('')}
      </div>
      <!-- List -->
      <div class="cust-list">
        ${list.length === 0
          ? `<div class="empty-state"><span class="mi">search_off</span><h3>Keine Treffer</h3><p>Filter oder Suche anpassen</p></div>`
          : list.map(c => custCard(c)).join('')}
      </div>
    </div>`;
  }

  function custCard(c) {
    const initials = c.type === 'pharmacy'
      ? '⚕'
      : (c.name.replace('Dr. med. ','').replace('Dr. ','').split(' ').map(w=>w[0]).slice(0,2).join(''));
    return `
    <div class="cust-item" onclick="App.navigate('detail','${c.id}')">
      <div class="cust-avatar ${c.type === 'pharmacy' ? 'pharmacy' : ''}">${initials}</div>
      <div class="cust-info">
        <div class="cust-name">${c.name}</div>
        <div class="cust-spec">${c.specialty}</div>
        <div class="cust-addr">${c.address}</div>
      </div>
      <div class="prio-dot prio-${c.priority}">${c.priority}</div>
    </div>`;
  }

  function setFilter(key, value) {
    if (key === 'specialty') {
      state.filter.specialty = (state.filter.specialty === value) ? null : value;
    } else {
      state.filter[key] = value;
      if (key === 'type') state.filter.specialty = null;
    }
    renderView();
  }

  // ═══════════════════════════════════════════════════════════
  // CUSTOMER DETAIL VIEW
  // ═══════════════════════════════════════════════════════════
  function renderDetail(id) {
    const c = DB.getCustomer(id);
    if (!c) return '<div class="empty-state"><span class="mi">error</span><p>Nicht gefunden</p></div>';

    const visits = DB.getVisitsForCustomer(id).slice(0, 5);
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(c.address)}`;
    const telUrl  = `tel:${c.phone.replace(/\s/g,'')}`;
    const mailUrl = `mailto:${c.email}`;
    const navUrl  = `https://maps.google.com/maps?daddr=${encodeURIComponent(c.address)}`;

    const lastC = c.lastContact
      ? new Date(c.lastContact).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})
      : '–';

    topbar().textContent = c.name.replace('Dr. med. ','').replace('Dr. ','');

    return `
    <div class="detail-view">
      <!-- Hero -->
      <div class="detail-hero">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="prio-dot prio-${c.priority}" style="width:32px;height:32px;font-size:14px">${c.priority}</div>
          <span class="type-badge ${c.type}" style="font-size:12px">${c.type==='doctor'?'Arzt/Ärztin':'Apotheke'}</span>
        </div>
        <div class="detail-hero-name">${c.name}</div>
        <div class="detail-hero-spec">${c.specialty}${c.practice ? ' · ' + c.practice : ''}</div>
        <div class="detail-hero-addr">
          <span class="mi">location_on</span>${c.address}
        </div>
      </div>

      <!-- Actions -->
      <div class="detail-actions">
        <button class="detail-action-btn" onclick="window.location='${telUrl}'">
          <span class="mi">call</span><span>Anrufen</span>
        </button>
        <button class="detail-action-btn" onclick="window.open('${navUrl}','_blank')">
          <span class="mi">navigation</span><span>Navi</span>
        </button>
        <button class="detail-action-btn" onclick="App.showVisitDoc('${c.id}')">
          <span class="mi">edit_note</span><span>Besuch</span>
        </button>
        <button class="detail-action-btn" onclick="window.open('${mapsUrl}','_blank')">
          <span class="mi">map</span><span>Karte</span>
        </button>
        ${c.email ? `<button class="detail-action-btn" onclick="window.location='${mailUrl}'">
          <span class="mi">mail</span><span>E-Mail</span>
        </button>` : ''}
      </div>

      <!-- Contact Info -->
      <div class="detail-section">
        <div class="detail-section-hd">Kontakt</div>
        <div class="detail-row">
          <span class="mi">call</span>
          <div><div class="dr-label">Telefon</div><div class="dr-value">${c.phone}</div></div>
        </div>
        ${c.email ? `<div class="detail-row">
          <span class="mi">mail</span>
          <div><div class="dr-label">E-Mail</div><div class="dr-value">${c.email}</div></div>
        </div>` : ''}
        <div class="detail-row">
          <span class="mi">event</span>
          <div><div class="dr-label">Letzter Kontakt</div><div class="dr-value">${lastC}</div></div>
        </div>
        <div class="detail-row">
          <span class="mi">star</span>
          <div><div class="dr-label">Priorität</div><div class="dr-value">Klasse ${c.priority}</div></div>
        </div>
      </div>

      <!-- Products -->
      ${c.potentialProducts.length > 0 ? `
      <div class="detail-section">
        <div class="detail-section-hd">Potenzial-Produkte</div>
        <div class="visit-products" style="margin-top:4px">
          ${c.potentialProducts.map(pid => `<span class="visit-prod-tag">${DB.getProductName(pid)}</span>`).join('')}
        </div>
      </div>` : ''}

      <!-- Notes -->
      ${c.notes ? `
      <div class="detail-section">
        <div class="detail-section-hd">Notizen</div>
        <p style="font-size:14px;line-height:1.6;color:var(--clr-on-surface)">${c.notes}</p>
      </div>` : ''}

      <!-- Visit History -->
      <div class="detail-section">
        <div class="detail-section-hd">Besuchshistorie</div>
        ${visits.length === 0
          ? `<p style="font-size:14px;color:var(--clr-on-surface-var)">Noch keine Besuche dokumentiert.</p>`
          : visits.map(v => `
            <div class="visit-row">
              <div class="visit-date">${new Date(v.date).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'2-digit'})}</div>
              <div class="visit-content">
                ${v.products.length>0 ? `<div class="visit-products">${v.products.map(p=>`<span class="visit-prod-tag">${DB.getProductName(p)}</span>`).join('')}</div>` : ''}
                <div class="visit-note">${v.notes}</div>
                ${v.duration ? `<div style="font-size:11px;color:var(--clr-on-surface-var);margin-top:3px">${v.duration} min · ${v.rep}</div>` : ''}
              </div>
              <div class="visit-rating">${v.rating || ''}</div>
            </div>`).join('')}
        <button class="btn btn-outline mt-md" style="width:100%" onclick="App.showVisitDoc('${c.id}')">
          <span class="mi">add</span> Besuch dokumentieren
        </button>
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  // MAP VIEW  –  Google-Maps-style layout
  // ═══════════════════════════════════════════════════════════
  const SPEC_ICONS = {
    'Allgemeinmedizin': 'medical_services', 'Dermatologie': 'face',
    'Kardiologie': 'favorite',              'Pädiatrie': 'child_care',
    'Orthopädie': 'accessibility_new',      'Gynäkologie': 'woman',
    'Innere Medizin': 'stethoscope',        'Neurologie': 'neurology',
    'HNO': 'hearing',                       'Urologie': 'water_drop',
    'Augenheilkunde': 'visibility',         'Chirurgie': 'content_cut',
  };

  function getMapFiltered() {
    let list = DB.customers;
    if (state.mapFilter === 'pharmacy') list = list.filter(c => c.type === 'pharmacy');
    else if (state.mapFilter !== 'all') list = list.filter(c => c.specialty === state.mapFilter);
    if (state.mapSearchQuery) {
      const q = state.mapSearchQuery.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.specialty.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderMap() {
    const specialties = [...new Set(
      DB.customers.filter(c => c.type === 'doctor').map(c => c.specialty)
    )].sort();
    const pharmCount = DB.customers.filter(c => c.type === 'pharmacy').length;

    return `
    <div class="map-view">
      <div id="map-el"></div>

      <!-- Floating top overlay (search + chips) -->
      <div class="map-top-overlay">
        <div class="map-searchbar-card">
          <span class="mi" style="color:var(--clr-on-surface-var)">search</span>
          <input type="search" id="map-search-input"
            placeholder="Arzt, Apotheke, Fachrichtung …"
            value="${(state.mapSearchQuery||'').replace(/"/g,'&quot;')}"
            oninput="App.onMapSearch(this.value)"
            onfocus="if(this.value)App.onMapSearch(this.value)"
            autocomplete="off" autocorrect="off" spellcheck="false">
          <button id="map-search-clear" class="${state.mapSearchQuery?'':'hidden'}"
            onclick="App.clearMapSearch()">
            <span class="mi" style="font-size:20px;color:var(--clr-on-surface-var)">close</span>
          </button>
        </div>

        <!-- Category chips -->
        <div class="map-chips-scroll">
          <button class="map-chip ${state.mapFilter==='all'?'active':''}" data-filter="all"
            onclick="App.setMapFilter('all')">
            Alle · ${DB.customers.length}
          </button>
          <button class="map-chip ${state.mapFilter==='pharmacy'?'active':''}" data-filter="pharmacy"
            onclick="App.setMapFilter('pharmacy')">
            <span class="mi">local_pharmacy</span> Apotheken · ${pharmCount}
          </button>
          ${specialties.map(s => {
            const cnt = DB.customers.filter(c => c.specialty === s).length;
            return `<button class="map-chip ${state.mapFilter===s?'active':''}" data-filter="${s}"
              onclick="App.setMapFilter('${s.replace(/'/g,"\\'")}')">
              <span class="mi">${SPEC_ICONS[s]||'stethoscope'}</span> ${s} · ${cnt}
            </button>`;
          }).join('')}
        </div>

        <!-- Search results dropdown -->
        <div id="map-results-panel" class="map-results-panel hidden"></div>
      </div>

      ${!state.gmapReady ? mapFallbackList() : ''}

      <!-- My location button -->
      <button class="map-locate-btn" onclick="App.mapLocate()">
        <span class="mi">my_location</span>
      </button>

      <!-- Bottom sheet – slides up on marker tap -->
      <div id="map-bottom-sheet" class="map-bsheet"></div>
    </div>`;
  }

  function mapFallbackList() {
    return `
    <div class="map-fallback" id="map-ph">
      <div style="padding:16px 16px 8px;font-size:13px;font-weight:700;color:var(--clr-on-surface-var);text-transform:uppercase;letter-spacing:.5px">
        Karte lädt … · ${DB.customers.length} Kunden
      </div>
      ${DB.customers.map(c => `
        <div class="map-result-row" onclick="App.navigate('detail','${c.id}')">
          <span class="mi map-result-icon" style="color:${c.type==='doctor'?'var(--clr-doctor)':'var(--clr-pharmacy)'}">
            ${c.type==='doctor'?'stethoscope':'local_pharmacy'}
          </span>
          <div style="flex:1;min-width:0">
            <div class="map-result-name">${c.name}</div>
            <div class="map-result-sub">${c.specialty} · ${c.address.split(',')[0]}</div>
          </div>
          <a href="https://maps.google.com/?q=${encodeURIComponent(c.address)}" target="_blank"
            onclick="event.stopPropagation()" style="color:var(--clr-primary);padding:4px">
            <span class="mi" style="font-size:18px">open_in_new</span>
          </a>
        </div>`).join('')}
    </div>`;
  }

  function initGmap() {
    if (typeof google === 'undefined' || !google.maps) return;
    const el = document.getElementById('map-el');
    if (!el) return;

    const ph = document.getElementById('map-ph');
    if (ph) ph.remove();

    state.gmapReady = true;
    state.mapMarkers = [];

    state.gmap = new google.maps.Map(el, {
      center: { lat: 48.1351, lng: 11.5820 },
      zoom: 12,
      mapId: 'DEMO_MAP_ID',
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      gestureHandling: 'greedy',
    });

    // Tap on map → close bottom sheet
    state.gmap.addListener('click', () => closeMapSheet());

    const { AdvancedMarkerElement, PinElement } = google.maps.marker;

    DB.customers.forEach(c => {
      const isPharm = c.type === 'pharmacy';
      const pin = new PinElement({
        background:  isPharm ? '#2E7D32' : '#1565C0',
        borderColor: '#fff',
        glyphColor:  '#fff',
        scale: 0.9,
      });
      const marker = new AdvancedMarkerElement({
        position: { lat: c.lat, lng: c.lng },
        map: state.gmap,
        title: c.name,
        content: pin.element,
      });
      marker.addListener('click', () => selectMapCustomer(c.id));
      state.mapMarkers.push({ id: c.id, marker });
    });

    updateMapMarkers();

    if (state.userLat) {
      state.gmap.panTo({ lat: state.userLat, lng: state.userLng });
    }
  }

  // ── Map filter & search ───────────────────────────────────

  function setMapFilter(f) {
    state.mapFilter = f;
    state.mapSearchQuery = '';
    const input = document.getElementById('map-search-input');
    if (input) input.value = '';
    const panel = document.getElementById('map-results-panel');
    if (panel) panel.classList.add('hidden');
    document.querySelectorAll('.map-chip').forEach(el =>
      el.classList.toggle('active', el.dataset.filter === f)
    );
    updateMapMarkers();
    closeMapSheet();
  }

  function onMapSearch(q) {
    state.mapSearchQuery = q;
    const clearBtn = document.getElementById('map-search-clear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !q);

    const panel = document.getElementById('map-results-panel');
    if (!panel) return;
    if (!q) { panel.classList.add('hidden'); return; }

    const results = DB.searchCustomers(q).slice(0, 10);
    if (!results.length) { panel.classList.add('hidden'); return; }

    panel.innerHTML = results.map(c => `
      <div class="map-result-row" onclick="App.selectMapCustomer('${c.id}')">
        <span class="mi map-result-icon" style="color:${c.type==='doctor'?'var(--clr-doctor)':'var(--clr-pharmacy)'}">
          ${c.type==='doctor'?'stethoscope':'local_pharmacy'}
        </span>
        <div style="flex:1;min-width:0">
          <div class="map-result-name">${c.name}</div>
          <div class="map-result-sub">${c.specialty} · ${c.address.split(',')[0]}</div>
        </div>
        <span class="prio-dot prio-${c.priority}" style="width:22px;height:22px;font-size:11px;flex-shrink:0">${c.priority}</span>
      </div>`).join('');
    panel.classList.remove('hidden');
  }

  function clearMapSearch() {
    state.mapSearchQuery = '';
    const input = document.getElementById('map-search-input');
    if (input) { input.value = ''; input.focus(); }
    const panel = document.getElementById('map-results-panel');
    if (panel) panel.classList.add('hidden');
    const btn = document.getElementById('map-search-clear');
    if (btn) btn.classList.add('hidden');
  }

  function updateMapMarkers() {
    if (!state.gmap) return;
    const visible = new Set(getMapFiltered().map(c => c.id));
    state.mapMarkers.forEach(({ id, marker }) => {
      marker.map = visible.has(id) ? state.gmap : null;
    });
  }

  // ── Map customer bottom sheet ─────────────────────────────

  function selectMapCustomer(id) {
    state.mapSelectedId = id;
    // Close search
    const panel = document.getElementById('map-results-panel');
    if (panel) panel.classList.add('hidden');
    const input = document.getElementById('map-search-input');
    if (input) { input.value = ''; input.blur(); }
    state.mapSearchQuery = '';
    const clearBtn = document.getElementById('map-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');

    // Pan map
    const c = DB.getCustomer(id);
    if (c && state.gmap) state.gmap.panTo({ lat: c.lat, lng: c.lng });

    const sheet = document.getElementById('map-bottom-sheet');
    if (!sheet || !c) return;

    const navUrl = `https://maps.google.com/maps?daddr=${encodeURIComponent(c.address)}`;
    const telUrl = `tel:${c.phone.replace(/\s/g,'')}`;
    const distStr = state.userLat
      ? (() => { const d = haversine(state.userLat, state.userLng, c.lat, c.lng);
          return d < 1 ? `${Math.round(d*1000)} m` : `${d.toFixed(1)} km`; })()
      : null;
    const lastVisits = DB.getVisitsForCustomer(id).slice(0,1);

    sheet.innerHTML = `
      <div class="map-bsheet-handle"></div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px">
        <div class="cust-avatar ${c.type==='pharmacy'?'pharmacy':''}" style="flex-shrink:0;width:48px;height:48px">
          ${c.type==='pharmacy'?'⚕':c.name.replace('Dr. med. ','').replace('Dr. ','').split(' ').map(w=>w[0]).slice(0,2).join('')}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:16px;font-weight:700;margin-bottom:2px">${c.name}</div>
          <div style="font-size:13px;color:var(--clr-primary);font-weight:600">${c.specialty}</div>
          <div style="font-size:12px;color:var(--clr-on-surface-var);margin-top:3px;display:flex;gap:4px;align-items:flex-start">
            <span class="mi" style="font-size:14px;flex-shrink:0;margin-top:1px">location_on</span>
            ${c.address}
          </div>
          ${distStr?`<div style="font-size:12px;color:var(--clr-on-surface-var);margin-top:3px"><strong>${distStr}</strong> entfernt</div>`:''}
          ${lastVisits.length?`<div style="font-size:12px;color:var(--clr-on-surface-var);margin-top:2px">Letzter Besuch: ${new Date(lastVisits[0].date).toLocaleDateString('de-DE')}</div>`:''}
        </div>
        <button onclick="App.closeMapSheet()" style="padding:4px;flex-shrink:0">
          <span class="mi" style="color:var(--clr-on-surface-var);font-size:22px">close</span>
        </button>
      </div>
      <div style="display:flex;gap:8px">
        <a href="${telUrl}" class="btn btn-primary" style="flex:1;text-decoration:none;gap:6px;padding:12px 8px;font-size:13px">
          <span class="mi" style="font-size:18px">call</span> Anrufen
        </a>
        <a href="${navUrl}" target="_blank" class="btn btn-tonal" style="flex:1;text-decoration:none;gap:6px;padding:12px 8px;font-size:13px">
          <span class="mi" style="font-size:18px">navigation</span> Navigation
        </a>
        <button class="btn btn-outline" style="flex:1;gap:6px;padding:12px 8px;font-size:13px"
          onclick="App.navigate('detail','${c.id}')">
          <span class="mi" style="font-size:18px">person</span> Details
        </button>
      </div>`;

    requestAnimationFrame(() => sheet.classList.add('visible'));
  }

  function closeMapSheet() {
    const sheet = document.getElementById('map-bottom-sheet');
    if (sheet) {
      sheet.classList.remove('visible');
      state.mapSelectedId = null;
    }
  }

  function mapLocate() {
    if (state.userLat && state.gmap) {
      state.gmap.panTo({ lat: state.userLat, lng: state.userLng });
      state.gmap.setZoom(14);
    } else {
      requestLocation(() => {
        if (state.gmap) {
          state.gmap.panTo({ lat: state.userLat, lng: state.userLng });
          state.gmap.setZoom(14);
        }
      });
    }
  }

  // Called by Google Maps script callback
  function onMapsReady() {
    state.gmapReady = true;
    if (state.view === 'map') renderView();
  }

  // ═══════════════════════════════════════════════════════════
  // NEARBY VIEW
  // ═══════════════════════════════════════════════════════════
  function renderNearby() {
    const hasLoc = state.userLat !== null;
    const refLat = hasLoc ? state.userLat : 48.1351;
    const refLng = hasLoc ? state.userLng : 11.5820;

    const withDist = DB.customers.map(c => ({
      ...c,
      dist: haversine(refLat, refLng, c.lat, c.lng),
    })).sort((a,b) => a.dist - b.dist);

    const filtered = withDist.filter(c => c.dist <= state.radius);

    return `
    <div class="nearby-view">
      <div class="nearby-header">
        <div class="loc-status">
          <span class="mi">${hasLoc ? 'location_on' : 'location_off'}</span>
          <div class="loc-text">
            ${hasLoc
              ? `Standort: ${refLat.toFixed(4)}, ${refLng.toFixed(4)}`
              : 'Standort nicht verfügbar (Simuliere München Mitte)'}
          </div>
          <button class="loc-btn" onclick="App.requestLoc()">
            ${hasLoc ? 'Aktualisieren' : 'Erlauben'}
          </button>
        </div>
        <div class="radius-row">
          ${[1,2,5,10,20].map(r => `
            <button class="radius-btn ${state.radius===r?'active':''}"
              onclick="App.setRadius(${r})">${r} km</button>`).join('')}
        </div>
      </div>
      <div class="nearby-list">
        ${filtered.length === 0
          ? `<div class="empty-state"><span class="mi">location_searching</span><h3>Keine Kunden in ${state.radius} km</h3><p>Radius vergrößern oder Standort aktualisieren</p></div>`
          : filtered.map(c => nearbyCard(c)).join('')}
      </div>
    </div>`;
  }

  function nearbyCard(c) {
    const distStr = c.dist < 1
      ? `${Math.round(c.dist * 1000)} m`
      : `${c.dist.toFixed(1)} km`;
    return `
    <div class="nearby-item" onclick="App.navigate('detail','${c.id}')">
      <div class="cust-avatar ${c.type==='pharmacy'?'pharmacy':''}">
        ${c.type==='pharmacy' ? '⚕' : c.name.replace('Dr. med. ','').replace('Dr. ','').split(' ').map(w=>w[0]).slice(0,2).join('')}
      </div>
      <div class="cust-info">
        <div class="cust-name">${c.name}</div>
        <div class="cust-spec">${c.specialty}</div>
        <div class="cust-addr">${c.address}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
        <span class="dist-badge">${distStr}</span>
        <span class="prio-dot prio-${c.priority}" style="width:22px;height:22px;font-size:11px">${c.priority}</span>
      </div>
    </div>`;
  }

  function setRadius(r) {
    state.radius = r;
    renderView();
  }

  // ═══════════════════════════════════════════════════════════
  // PROFILE VIEW
  // ═══════════════════════════════════════════════════════════
  function renderProfile() {
    const rep = DB.rep;
    const pct = Math.round((rep.quota.current / rep.quota.target) * 100);
    return `
    <div class="profile-view">
      <div class="profile-hero">
        <div class="profile-avatar">${rep.name.split(' ').map(w=>w[0]).join('').slice(0,2)}</div>
        <div class="profile-name">${rep.name}</div>
        <div class="profile-role">${rep.team}</div>
        <div class="quota-bar-wrap">
          <div class="quota-labels">
            <span>Quota April: ${rep.quota.current}/${rep.quota.target}</span>
            <span>${pct}%</span>
          </div>
          <div class="quota-bar">
            <div class="quota-bar-fill" style="width:${pct}%"></div>
          </div>
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-row">
          <span class="mi">mail</span>
          <span class="menu-row-label">${rep.email}</span>
        </div>
        <div class="menu-row">
          <span class="mi">call</span>
          <span class="menu-row-label">${rep.phone}</span>
        </div>
        <div class="menu-row">
          <span class="mi">place</span>
          <span class="menu-row-label">Region: ${rep.region}</span>
        </div>
      </div>

      <!-- Theme -->
      <div class="theme-section">
        <div class="theme-hd">App-Farbe</div>
        <div class="theme-swatches" id="theme-swatches">
          ${state.themes.map((t,i) => `
            <div class="swatch ${i===state.activeTheme?'active':''}"
              style="background:${t.primary}"
              title="${t.name}"
              onclick="App.applyTheme(${i})"></div>`).join('')}
        </div>
      </div>

      <div class="menu-section">
        <div class="menu-row" onclick="App.showToast('Outlook-Sync wird vorbereitet…')">
          <span class="mi">calendar_month</span>
          <span class="menu-row-label">Outlook-Kalender synchronisieren</span>
          <span class="mi mi-chevron">chevron_right</span>
        </div>
        <div class="menu-row" onclick="App.showToast('Daten werden exportiert…')">
          <span class="mi">download</span>
          <span class="menu-row-label">Daten exportieren</span>
          <span class="mi mi-chevron">chevron_right</span>
        </div>
        <div class="menu-row" onclick="App.showToast('Version 1.0.0 – auf dem neuesten Stand.')">
          <span class="mi">info</span>
          <span class="menu-row-label">Version 1.0.0</span>
          <span class="mi mi-chevron">chevron_right</span>
        </div>
      </div>
    </div>`;
  }

  function initThemeSwatches() { /* swatches already rendered via onclick */ }

  function applyTheme(idx) {
    state.activeTheme = idx;
    const t = state.themes[idx];
    const root = document.documentElement;
    root.style.setProperty('--clr-primary',        t.primary);
    root.style.setProperty('--clr-primary-dark',   t.dark);
    root.style.setProperty('--clr-primary-light',  t.light);
    root.style.setProperty('--clr-primary-container', t.cont);
    root.style.setProperty('--clr-on-primary-cont', t.onCont);
    // Re-render profile to update swatch active state
    document.querySelectorAll('.swatch').forEach((s,i) => s.classList.toggle('active', i === idx));
    // Update theme-color meta
    document.querySelector('meta[name="theme-color"]').content = t.primary;
    showToast(`Farbe: ${t.name} aktiv`);
  }

  // ═══════════════════════════════════════════════════════════
  // BOTTOM SHEET: VISIT DOCUMENTATION
  // ═══════════════════════════════════════════════════════════
  function showVisitDoc(customerId) {
    state.visitCustomerId = customerId;
    state.sheetType = 'visit';
    state.selectedProds = [];
    state.selectedRating = '😊';
    state.uploadedPhotos = [];

    const c = DB.getCustomer(customerId);
    const today = new Date().toISOString().split('T')[0];
    const prods = DB.products;

    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">Besuch dokumentieren</div>
      <p style="font-size:14px;color:var(--clr-on-surface-var);margin-bottom:var(--sp-md)">
        <strong>${c ? c.name : ''}</strong>
      </p>

      <div class="form-group">
        <label class="form-label">Datum</label>
        <input type="date" class="form-input" id="vd-date" value="${today}">
      </div>

      <div class="form-group">
        <label class="form-label">Dauer (Minuten)</label>
        <input type="number" class="form-input" id="vd-dur" value="20" min="5" max="120">
      </div>

      <div class="form-group">
        <label class="form-label">Besprochene Produkte</label>
        <div class="prod-chips" id="vd-prods">
          ${prods.map(p => `
            <div class="prod-chip" data-pid="${p.id}" onclick="App.toggleProd('${p.id}',this)">
              ${p.name}
            </div>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Bewertung</label>
        <div class="rating-row">
          ${['😐','😊','🤩','😟'].map(r => `
            <div class="rating-btn ${r==='😊'?'sel':''}" onclick="App.setRating('${r}',this)">${r}</div>`).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Notizen</label>
        <textarea class="form-input" id="vd-notes" placeholder="Was wurde besprochen?"></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Fotos (Visitenkarte, Praxisschild)</label>
        <div class="photo-zone" onclick="document.getElementById('vd-file').click()">
          <span class="mi">photo_camera</span>
          <p>Foto aufnehmen oder auswählen</p>
        </div>
        <input type="file" id="vd-file" accept="image/*" capture="environment" multiple style="display:none" onchange="App.handlePhotoUpload(this)">
        <div class="photo-preview" id="vd-photos"></div>
      </div>

      <div class="btn-row">
        <button class="btn btn-outline" onclick="App.closeSheet()">Abbrechen</button>
        <button class="btn btn-primary" onclick="App.saveVisit()">
          <span class="mi">save</span> Speichern
        </button>
      </div>
    `);
  }

  function toggleProd(pid, el) {
    if (state.selectedProds.includes(pid)) {
      state.selectedProds = state.selectedProds.filter(p => p !== pid);
      el.classList.remove('sel');
    } else {
      state.selectedProds.push(pid);
      el.classList.add('sel');
    }
  }

  function setRating(r, el) {
    state.selectedRating = r;
    document.querySelectorAll('.rating-btn').forEach(b => b.classList.remove('sel'));
    el.classList.add('sel');
  }

  function handlePhotoUpload(input) {
    const preview = document.getElementById('vd-photos');
    Array.from(input.files).forEach(file => {
      const url = URL.createObjectURL(file);
      state.uploadedPhotos.push(url);
      const img = document.createElement('img');
      img.src = url;
      img.className = 'photo-thumb';
      preview.appendChild(img);
    });
    showToast(`${input.files.length} Foto(s) hinzugefügt`);
  }

  function saveVisit() {
    const date  = document.getElementById('vd-date').value;
    const dur   = parseInt(document.getElementById('vd-dur').value);
    const notes = document.getElementById('vd-notes').value.trim();

    if (!notes) { showToast('Bitte Notizen eintragen'); return; }

    DB.addVisit({
      customerId: state.visitCustomerId,
      date, duration: dur,
      products: [...state.selectedProds],
      rating: state.selectedRating,
      notes,
    });

    closeSheet();
    showToast('Besuch gespeichert ✓');

    // Refresh detail view if we're there
    if (state.view === 'detail') renderView();
  }

  // ═══════════════════════════════════════════════════════════
  // BOTTOM SHEET: NEW CUSTOMER
  // ═══════════════════════════════════════════════════════════
  function showNewCustomer() {
    state.sheetType = 'newcust';
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">Neuen Kunden anlegen</div>

      <button class="scan-banner" onclick="App.showCardScanner()">
        <div class="scan-banner-icon-wrap"><span class="mi">document_scanner</span></div>
        <div class="scan-banner-text">
          <div class="scan-banner-title">Visitenkarte scannen</div>
          <div class="scan-banner-sub">Felder automatisch ausfüllen</div>
        </div>
        <span class="mi" style="color:var(--clr-primary);font-size:22px;flex-shrink:0">chevron_right</span>
      </button>

      <div class="form-section-hd">Typ</div>
      <div class="form-group">
        <select class="form-select" id="nc-type" onchange="App.togglePracticeField()">
          <option value="doctor">Arzt / Ärztin</option>
          <option value="pharmacy">Apotheke</option>
        </select>
      </div>

      <div class="form-section-hd">Name</div>
      <div class="form-group" id="nc-practice-grp">
        <label class="form-label">Praxisname</label>
        <input type="text" class="form-input" id="nc-practice" placeholder="Praxis Mustermann">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vorname</label>
          <input type="text" class="form-input" id="nc-first" placeholder="Maria">
        </div>
        <div class="form-group">
          <label class="form-label">Nachname *</label>
          <input type="text" class="form-input" id="nc-last" placeholder="Mustermann">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Fachrichtung</label>
        <select class="form-select" id="nc-spec">
          <option value="Allgemeinmedizin">Allgemeinmedizin</option>
          ${['Dermatologie','Kardiologie','Pädiatrie','Orthopädie','Gynäkologie',
             'Innere Medizin','Neurologie','HNO','Urologie','Augenheilkunde',
             'Chirurgie','Apotheke','Sonstiges'].map(s=>`<option value="${s}">${s}</option>`).join('')}
        </select>
      </div>

      <div class="form-section-hd">Kontakt</div>
      <div class="form-group">
        <label class="form-label">Adresse *</label>
        <input type="text" class="form-input" id="nc-addr" placeholder="Musterstraße 1, 80331 München">
      </div>
      <div class="form-group">
        <label class="form-label">Telefon</label>
        <input type="tel" class="form-input" id="nc-phone" placeholder="+49 89 ...">
      </div>
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input type="email" class="form-input" id="nc-email" placeholder="praxis@...">
      </div>

      <div class="form-group">
        <label class="form-label">Priorität</label>
        <select class="form-select" id="nc-prio">
          <option value="A">A – Hoch</option>
          <option value="B" selected>B – Mittel</option>
          <option value="C">C – Niedrig</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Foto (optional)</label>
        <div class="photo-zone" onclick="document.getElementById('nc-file').click()">
          <span class="mi">photo_camera</span>
          <p>Visitenkarte / Praxisschild fotografieren</p>
        </div>
        <input type="file" id="nc-file" accept="image/*" capture="environment" style="display:none">
      </div>

      <div class="btn-row">
        <button class="btn btn-outline" onclick="App.closeSheet()">Abbrechen</button>
        <button class="btn btn-primary" onclick="App.saveNewCustomer()">
          <span class="mi">person_add</span> Anlegen
        </button>
      </div>
    `);
  }

  function togglePracticeField() {
    const type = document.getElementById('nc-type').value;
    const grp  = document.getElementById('nc-practice-grp');
    if (grp) grp.style.display = type === 'pharmacy' ? 'block' : 'block';
  }

  function saveNewCustomer() {
    const type  = document.getElementById('nc-type').value;
    const first = document.getElementById('nc-first').value.trim();
    const last  = document.getElementById('nc-last').value.trim();
    const practice = document.getElementById('nc-practice').value.trim();
    const spec  = document.getElementById('nc-spec').value;
    const addr  = document.getElementById('nc-addr').value.trim();
    const phone = document.getElementById('nc-phone').value.trim();
    const email = document.getElementById('nc-email').value.trim();
    const prio  = document.getElementById('nc-prio').value;

    if (!last && !practice) { showToast('Bitte Name eingeben'); return; }
    if (!addr) { showToast('Bitte Adresse eingeben'); return; }

    const name = type === 'pharmacy'
      ? practice
      : `Dr. med. ${first} ${last}`.trim().replace('Dr. med.  ','Dr. med. ');

    const c = DB.addCustomer({
      type, name, practice, specialty: spec,
      address: addr, phone: phone || '–', email,
      priority: prio, notes: '',
    });

    closeSheet();
    showToast(`${name} angelegt`);
    navigate('detail', c.id);
  }

  // ═══════════════════════════════════════════════════════════
  // BUSINESS CARD SCANNER
  // ═══════════════════════════════════════════════════════════

  function showCardScanner() {
    state.sheetType = 'scanner';
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">
        <span class="mi" style="font-size:24px;vertical-align:middle;margin-right:8px;color:var(--clr-primary)">document_scanner</span>
        Visitenkarte scannen
      </div>

      <!-- Step 1: Capture -->
      <div id="sc-step1">
        <p style="font-size:14px;color:var(--clr-on-surface-var);margin-bottom:var(--sp-md)">
          Karte auf hellem Untergrund fotografieren – Kontaktdaten werden automatisch erkannt.
        </p>
        <div class="scan-capture-zone" onclick="document.getElementById('sc-file').click()">
          <span class="mi" style="font-size:52px;color:var(--clr-primary)">add_a_photo</span>
          <div style="font-size:15px;font-weight:600;color:var(--clr-on-surface);margin-top:10px">Visitenkarte fotografieren</div>
          <div style="font-size:13px;color:var(--clr-on-surface-var);margin-top:4px">Gut beleuchtet, gerader Bildwinkel</div>
        </div>
        <input type="file" id="sc-file" accept="image/*" capture="environment" style="display:none" onchange="App.processCardScan(this)">
      </div>

      <!-- Step 2: Analyzing -->
      <div id="sc-step2" style="display:none">
        <div style="text-align:center;margin-bottom:16px">
          <img id="sc-preview-big" style="max-width:100%;max-height:220px;border-radius:12px;box-shadow:var(--shadow-2);object-fit:contain">
        </div>
        <div class="scan-status-card">
          <div class="scan-spinner"></div>
          <div>
            <div id="sc-status-title" style="font-size:14px;font-weight:600;color:var(--clr-on-surface)">Karte wird analysiert …</div>
            <div id="sc-status-sub" style="font-size:12px;color:var(--clr-on-surface-var);margin-top:2px">Texterkennung läuft</div>
          </div>
        </div>
      </div>

      <!-- Step 3: Form pre-filled -->
      <div id="sc-step3" style="display:none">
        <div class="scan-result-badge" id="sc-result-badge">
          <img id="sc-thumb" style="width:72px;height:46px;object-fit:cover;border-radius:8px;flex-shrink:0">
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:700;color:var(--clr-on-surface)">Karte erkannt</div>
            <div id="sc-confidence" style="font-size:12px;color:var(--clr-on-surface-var)">Felder prüfen und ergänzen</div>
          </div>
          <button onclick="App.resetCardScanner()" style="color:var(--clr-primary);padding:4px;flex-shrink:0" title="Neu scannen">
            <span class="mi" style="font-size:22px">refresh</span>
          </button>
        </div>

        <div class="form-section-hd">Kontaktdaten</div>

        <div class="form-group">
          <select class="form-select" id="sc-type">
            <option value="doctor">Arzt / Ärztin</option>
            <option value="pharmacy">Apotheke</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Vorname</label>
            <input type="text" class="form-input" id="sc-first" placeholder="Maria">
          </div>
          <div class="form-group">
            <label class="form-label">Nachname *</label>
            <input type="text" class="form-input" id="sc-last" placeholder="Mustermann">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Praxis / Institution</label>
          <input type="text" class="form-input" id="sc-practice" placeholder="Praxis Mustermann">
        </div>

        <div class="form-group">
          <label class="form-label">Fachrichtung</label>
          <select class="form-select" id="sc-spec">
            <option value="Allgemeinmedizin">Allgemeinmedizin</option>
            ${['Dermatologie','Kardiologie','Pädiatrie','Orthopädie','Gynäkologie',
               'Innere Medizin','Neurologie','HNO','Urologie','Augenheilkunde',
               'Chirurgie','Apotheke','Sonstiges'].map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Telefon</label>
          <input type="tel" class="form-input" id="sc-phone" placeholder="+49 89 …">
        </div>

        <div class="form-group">
          <label class="form-label">E-Mail</label>
          <input type="email" class="form-input" id="sc-email" placeholder="praxis@…">
        </div>

        <div class="form-group">
          <label class="form-label">Adresse *</label>
          <input type="text" class="form-input" id="sc-addr" placeholder="Musterstraße 1, 80331 München">
        </div>

        <div class="form-group">
          <label class="form-label">Priorität</label>
          <select class="form-select" id="sc-prio">
            <option value="A">A – Hoch</option>
            <option value="B" selected>B – Mittel</option>
            <option value="C">C – Niedrig</option>
          </select>
        </div>

        <div class="form-section-hd" style="display:flex;align-items:center;gap:6px">
          <span class="mi" style="font-size:16px;color:var(--clr-primary)">badge</span>
          Kongress-Kontext
        </div>

        <div class="form-group">
          <label class="form-label">Veranstaltung</label>
          <input type="text" class="form-input" id="sc-event" placeholder="z. B. Kardiologiekongress 2026">
        </div>

        <div class="congress-checks">
          <label class="congress-chip">
            <input type="checkbox" id="cc-interest" hidden>
            <span class="mi congress-chip-icon">thumb_up</span>
            <span>Interesse an Produkten</span>
            <span class="mi congress-chip-check">check</span>
          </label>
          <label class="congress-chip">
            <input type="checkbox" id="cc-followup" hidden>
            <span class="mi congress-chip-icon">calendar_add_on</span>
            <span>Folgetermin vereinbart</span>
            <span class="mi congress-chip-check">check</span>
          </label>
          <label class="congress-chip">
            <input type="checkbox" id="cc-samples" hidden>
            <span class="mi congress-chip-icon">medication</span>
            <span>Muster / Material übergeben</span>
            <span class="mi congress-chip-check">check</span>
          </label>
          <label class="congress-chip">
            <input type="checkbox" id="cc-invite" hidden>
            <span class="mi congress-chip-icon">event</span>
            <span>Zu Veranstaltung eingeladen</span>
            <span class="mi congress-chip-check">check</span>
          </label>
          <label class="congress-chip">
            <input type="checkbox" id="cc-newsletter" hidden>
            <span class="mi congress-chip-icon">mail</span>
            <span>Newsletter gewünscht</span>
            <span class="mi congress-chip-check">check</span>
          </label>
        </div>

        <div class="form-group" style="margin-top:12px">
          <label class="form-label">Notizen vom Kongress</label>
          <textarea class="form-input" id="sc-notes" placeholder="Was wurde besprochen, vereinbart …"></textarea>
        </div>

        <div class="btn-row">
          <button class="btn btn-outline" onclick="App.closeSheet()">Abbrechen</button>
          <button class="btn btn-primary" onclick="App.saveScannedCustomer()">
            <span class="mi">person_add</span> Anlegen
          </button>
        </div>
      </div>
    `);
  }

  async function processCardScan(input) {
    if (!input.files || !input.files[0]) return;
    const rawUrl = URL.createObjectURL(input.files[0]);

    document.getElementById('sc-step1').style.display = 'none';
    document.getElementById('sc-step2').style.display = 'block';
    document.getElementById('sc-preview-big').src = rawUrl;

    const setStatus = (title, sub) => {
      const t = document.getElementById('sc-status-title');
      const s = document.getElementById('sc-status-sub');
      if (t) t.textContent = title;
      if (s) s.textContent = sub;
    };

    try {
      setStatus('Bild wird vorbereitet …', 'Kontrast und Schärfe optimieren');
      const processedUrl = await preprocessCardImage(rawUrl);

      await ensureTesseract();

      setStatus('Sprachpaket wird geladen …', 'Einmalig ~3 MB, danach gecacht');

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'loading language traineddata') {
            setStatus('Sprachpaket wird geladen …', `${Math.round((m.progress||0)*100)} %`);
          } else if (m.status === 'recognizing text') {
            setStatus('Text wird erkannt …', `${Math.round((m.progress||0)*100)} %`);
          }
        },
      });

      // PSM 11 = Sparse text: best for business cards with mixed layout
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      const { data } = await worker.recognize(processedUrl);
      await worker.terminate();

      const parsed = parseBusinessCard(data.text);
      const confidence = Math.round(data.confidence || 0);

      document.getElementById('sc-step2').style.display = 'none';
      document.getElementById('sc-step3').style.display = 'block';
      document.getElementById('sc-thumb').src = rawUrl;
      document.getElementById('sc-confidence').textContent =
        `Erkennungsrate ${confidence} % · Felder prüfen und ergänzen`;

      const fill = (id, val) => {
        if (!val) return;
        const el = document.getElementById(id);
        if (!el) return;
        el.value = val;
        el.classList.add('field-detected');
      };

      fill('sc-first',    parsed.first);
      fill('sc-last',     parsed.last);
      fill('sc-practice', parsed.practice);
      fill('sc-phone',    parsed.phone);
      fill('sc-email',    parsed.email);
      fill('sc-addr',     parsed.address);

    } catch (err) {
      document.getElementById('sc-step2').style.display = 'none';
      document.getElementById('sc-step3').style.display = 'block';
      document.getElementById('sc-thumb').src = rawUrl;
      document.getElementById('sc-confidence').textContent =
        'Erkennung nicht möglich – bitte manuell eingeben';
      showToast('OCR fehlgeschlagen – Daten manuell eingeben');
    }
  }

  function preprocessCardImage(blobUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Scale to max 1600px on the long side — large enough for OCR, not too slow
        const MAX = 1600;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width  * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const id = ctx.getImageData(0, 0, w, h);
        const d  = id.data;

        // Grayscale + contrast boost (factor ~1.6) + slight brightness lift
        const CONTRAST = 1.6;
        const BRIGHT   = 10;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const c = Math.min(255, Math.max(0,
            CONTRAST * (gray - 128) + 128 + BRIGHT
          ));
          d[i] = d[i + 1] = d[i + 2] = c;
        }

        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = blobUrl;
    });
  }

  function ensureTesseract() {
    if (typeof Tesseract !== 'undefined') return Promise.resolve();
    if (_tesseractReady) return _tesseractReady;
    _tesseractReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Tesseract nicht geladen'));
      document.head.appendChild(s);
    });
    return _tesseractReady;
  }

  function parseBusinessCard(text) {
    // Normalize common OCR artifacts
    const clean = text
      .replace(/[|l](?=\d)/g, '1')   // l/| misread as 1 before digits
      .replace(/\r\n/g, '\n');

    const lines = clean.split('\n').map(l => l.trim()).filter(l => l.length > 1);
    const parsed = {};

    // ── Email ─────────────────────────────────────────────────
    const emailM = clean.match(/[\w.+\-]+@[\w.\-]+\.[a-zA-Z]{2,}/);
    if (emailM) parsed.email = emailM[0].toLowerCase();

    // ── Phone – handles +49, 0049, leading 0, brackets, dashes ─
    const phoneM = clean.match(
      /(\+49|0049)[\s\-]?(\(?\d{2,5}\)?[\s\-]?\d{3,}[\d\s\-]{2,})|(\(?\b0\d{2,5}\)?[\s\/\-]?\d{3,}[\d\s\-\/]{2,})/
    );
    if (phoneM) {
      parsed.phone = phoneM[0].replace(/\s{2,}/g, ' ').trim().replace(/\s*[-\/]\s*/g, ' / ');
    }

    // ── ZIP code + city ───────────────────────────────────────
    // Also handles OCR noise like "8O331" → fuzzy match for 5-digit groups
    const zipM = clean.match(/[0-9O]{5}\s+[A-ZÄÖÜ][a-zäöüß\-]+/);
    if (zipM) {
      const zipFix  = zipM[0].replace(/O/g, '0');
      const zipLine = lines.find(l => l.replace(/O/g,'0').includes(zipFix.split(' ')[0]));
      if (zipLine) {
        const zipIdx = lines.indexOf(zipLine);
        const prev   = zipIdx > 0 ? lines[zipIdx - 1] : null;
        parsed.address = (prev && /\d/.test(prev) && prev.length < 60)
          ? `${prev}, ${zipLine.replace(/O/g,'0')}`
          : zipLine.replace(/O/g,'0');
      }
    }

    // ── Street without ZIP (fallback) ─────────────────────────
    if (!parsed.address) {
      const streetM = clean.match(
        /[A-ZÄÖÜ][a-zäöüß]+(straße|str\.|weg|allee|platz|gasse|ring|damm)\s+\d+/i
      );
      if (streetM) parsed.address = streetM[0];
    }

    // ── Name: title + first + last ────────────────────────────
    // Matches: Dr. / Dr. med. / Prof. Dr. / Dr. rer. nat. etc.
    const titlePattern = /(?:(?:Prof\.?\s*)?(?:Dr\.?\s*(?:med\.?|rer\.?\s*nat\.?|phil\.?|ing\.?)?\s*))+/i;
    const namePattern  = new RegExp(
      titlePattern.source + '([A-ZÄÖÜ][a-zäöüß]{1,20}(?:-[A-ZÄÖÜ][a-zäöüß]+)?)\\s+([A-ZÄÖÜ][a-zäöüß]{2,30}(?:-[A-ZÄÖÜ][a-zäöüß]+)?)'
    );
    const nameM = clean.match(namePattern);
    if (nameM) {
      parsed.first = nameM[1];
      parsed.last  = nameM[2];
    } else {
      // Fallback: two consecutive capitalized words on a standalone line
      for (const line of lines) {
        if (parsed.email && line.includes('@')) continue;
        if (/^\d/.test(line)) continue;
        const words = line.match(/\b[A-ZÄÖÜ][a-zäöüß]{2,}(?:-[A-ZÄÖÜ][a-zäöüß]+)?\b/g);
        if (words && words.length >= 2 && words.length <= 4) {
          parsed.first = words[0];
          parsed.last  = words[words.length - 1];
          break;
        }
      }
    }

    // ── Practice / institution ────────────────────────────────
    const keywords = [
      'Praxis','Klinik','Krankenhaus','MVZ','Medizinisches Versorgungszentrum',
      'Institut','Apotheke','Gemeinschaftspraxis','Universitätsklinik','Ambulanz',
      'Facharzt','Fachärztin','Ärztehaus','Gesundheitszentrum','Medical Center',
    ];
    for (const line of lines) {
      if (keywords.some(k => line.toLowerCase().includes(k.toLowerCase()))) {
        parsed.practice = line;
        break;
      }
    }

    return parsed;
  }

  function resetCardScanner() {
    showCardScanner();
  }

  function saveScannedCustomer() {
    const type     = document.getElementById('sc-type').value;
    const first    = (document.getElementById('sc-first').value || '').trim();
    const last     = (document.getElementById('sc-last').value || '').trim();
    const practice = (document.getElementById('sc-practice').value || '').trim();
    const spec     = document.getElementById('sc-spec').value;
    const addr     = (document.getElementById('sc-addr').value || '').trim();
    const phone    = (document.getElementById('sc-phone').value || '').trim();
    const email    = (document.getElementById('sc-email').value || '').trim();
    const prio     = document.getElementById('sc-prio').value;
    const event    = (document.getElementById('sc-event').value || '').trim();

    if (!last && !practice) { showToast('Bitte Name eingeben'); return; }
    if (!addr)               { showToast('Bitte Adresse eingeben'); return; }

    const name = type === 'pharmacy'
      ? practice
      : `Dr. med. ${first} ${last}`.trim().replace('Dr. med.  ', 'Dr. med. ');

    const checks = [
      document.getElementById('cc-interest').checked  && 'Interesse an Produkten',
      document.getElementById('cc-followup').checked  && 'Folgetermin vereinbart',
      document.getElementById('cc-samples').checked   && 'Muster/Material übergeben',
      document.getElementById('cc-invite').checked    && 'Einladung zu Veranstaltung',
      document.getElementById('cc-newsletter').checked && 'Newsletter gewünscht',
    ].filter(Boolean);

    const extra = (document.getElementById('sc-notes').value || '').trim();

    let notes = '';
    if (event)          notes += `Kongress: ${event}\n`;
    if (checks.length)  notes += checks.join(' · ') + '\n';
    if (extra)          notes += extra;
    notes = notes.trim();

    const c = DB.addCustomer({
      type, name, practice, specialty: spec,
      address: addr, phone: phone || '–', email,
      priority: prio, notes,
    });

    closeSheet();
    showToast(`${name} angelegt`);
    navigate('detail', c.id);
  }

  // ═══════════════════════════════════════════════════════════
  // SHEET HELPERS
  // ═══════════════════════════════════════════════════════════
  function showSheet(html) {
    const overlay = document.getElementById('overlay');
    const sheet   = document.getElementById('sheet');
    overlay.classList.remove('hidden');
    sheet.innerHTML = html;
    sheet.classList.remove('hidden');
  }

  function closeSheet() {
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('sheet').classList.add('hidden');
  }

  // ═══════════════════════════════════════════════════════════
  // SEARCH
  // ═══════════════════════════════════════════════════════════
  function toggleSearch() {
    state.searchActive = !state.searchActive;
    const bar = document.getElementById('searchbar');
    if (state.searchActive) {
      bar.classList.remove('hidden');
      setTimeout(() => bar.querySelector('input').focus(), 50);
    } else {
      closeSearch();
    }
  }

  function closeSearch() {
    state.searchActive = false;
    state.searchQuery = '';
    const bar = document.getElementById('searchbar');
    if (bar) {
      bar.classList.add('hidden');
      bar.querySelector('input').value = '';
    }
  }

  function handleSearch(q) {
    state.searchQuery = q;
    if (state.view !== 'customers') {
      navigate('customers');
    } else {
      renderView();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // FAB ACTION  (context-aware)
  // ═══════════════════════════════════════════════════════════
  function fabAction() {
    switch (state.view) {
      case 'detail':
        showVisitDoc(state.detailId); break;
      default:
        showNewCustomer(); break;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // GEOLOCATION
  // ═══════════════════════════════════════════════════════════
  function requestLocation(cb) {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        state.userLat = pos.coords.latitude;
        state.userLng = pos.coords.longitude;
        if (state.view === 'nearby') renderView();
        if (cb) cb();
      },
      () => { /* denied – use München default */ }
    );
  }

  function requestLoc() {
    requestLocation(() => {
      showToast('Standort aktualisiert');
      renderView();
    });
  }

  // ═══════════════════════════════════════════════════════════
  // TOAST
  // ═══════════════════════════════════════════════════════════
  function showToast(msg) {
    const wrap = document.getElementById('toast-wrap');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3100);
  }

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════
  function haversine(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  function showProfile() {
    navigate('profile');
  }

  // Swipe-back gesture (horizontal)
  function setupSwipe() {
    let startX = 0;
    const el = document.getElementById('main');
    el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 80 && state.view === 'detail') goBack();
    }, { passive: true });
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    navigate,
    goBack,
    setFilter,
    setRadius,
    showVisitDoc,
    showNewCustomer,
    closeSheet,
    toggleSearch,
    closeSearch,
    handleSearch,
    fabAction,
    toggleProd,
    setRating,
    handlePhotoUpload,
    saveVisit,
    saveNewCustomer,
    togglePracticeField,
    showProfile,
    applyTheme,
    showToast,
    showCardScanner,
    processCardScan,
    resetCardScanner,
    saveScannedCustomer,
    mapLocate,
    requestLoc,
    setMapFilter,
    onMapSearch,
    clearMapSearch,
    selectMapCustomer,
    closeMapSheet,
    initMap: onMapsReady,   // called by Google Maps callback
  };

})();

// Expose globally so Google Maps callback (App.initMap) can find it
window.App = App;

// Kick off when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
