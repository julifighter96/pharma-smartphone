// =============================================================
// MESSE LEAD CAPTURE  –  App Controller
// =============================================================

const App = (() => {

  // ── Tesseract lazy-load handle ────────────────────────────
  let _tesseractReady = null;

  // ── New-contact sheet temp selections (chip-based, not bound to an input) ──
  let tmpSalutation = 'Herr';
  let tmpRole = '';

  // ── Action / quality vocab ────────────────────────────────
  const ACTIONS = [
    { key: 'muster',      label: 'Muster übergeben',   icon: 'medication' },
    { key: 'katalog',     label: 'Katalogwunsch',      icon: 'menu_book' },
    { key: 'folgetermin', label: 'Folgetermin',        icon: 'calendar_add_on' },
    { key: 'auftrag',     label: 'Auftrag',            icon: 'shopping_cart' },
    { key: 'info',        label: 'Nur Info',           icon: 'info' },
  ];
  const ACTION_LABELS = Object.fromEntries(ACTIONS.map(a => [a.key, a.label]));
  const QUALITY_LABELS = { heiss: 'Heiß', warm: 'Warm', kalt: 'Kalt' };

  // ── Approved-Mail-Vorschläge (Abschluss-Screen nach dem Speichern) ──
  const MAIL_SUGGESTIONS = [
    { key: 'welcome',     label: 'Willkommensmail',    icon: 'waving_hand' },
    { key: 'pricelist',   label: 'Preisliste',         icon: 'sell' },
    { key: 'closing',     label: 'Abschluss Mail',     icon: 'task_alt' },
    { key: 'appointment', label: 'Termin vereinbaren', icon: 'event' },
  ];
  const MAIL_LABELS = Object.fromEntries(MAIL_SUGGESTIONS.map(m => [m.key, m.label]));

  // ── State ─────────────────────────────────────────────────
  function defaultCapture() {
    return {
      step: 1,
      institution: null,       // { id, name, address, assignedRep, contacts }
      contact: null,           // { id, salutation, first, last, role, phone, email }
      contactSkipped: false,
      custType: 'bestand',     // 'bestand' | 'neu'
      leadQuality: 'warm',     // 'heiss' | 'warm' | 'kalt'
      brands: [],
      actions: [],
      followUpDate: '',
      followUpTime: '',
      secondaryRep: '',
      notes: '',
      formFilled: false,
      consent: false,
    };
  }

  let state = {
    view: 'capture',          // 'capture' | 'contacts' | 'lead-detail' | 'profile' | 'wrapup'
    detailId: null,            // lead id for lead-detail
    lastSavedLeadId: null,     // for the wrapup screen
    searchQuery: '',
    searchActive: false,
    capture: defaultCapture(),
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

  // ═══════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════
  function init() {
    navigate('capture');
    setupSwipe();
    window.addEventListener('online', () => trySyncDrafts(false));
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
    if (state.view === 'lead-detail') {
      navigate('contacts');
    } else {
      navigate('capture');
    }
  }

  function updateBottomNav(view) {
    const navView = view === 'lead-detail' ? 'contacts' : (view === 'wrapup' ? 'capture' : view);
    document.querySelectorAll('.bnav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === navView);
    });
    const backBtn = $('#back-btn');
    if (view === 'lead-detail') {
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
    let title = 'Messe erfassen';

    switch (state.view) {
      case 'capture':
        html = renderCapture(); title = captureTitle(); break;
      case 'contacts':
        html = renderContacts(); title = 'Kontakte'; break;
      case 'lead-detail': {
        const lead = DB.leads.find(l => l.id === state.detailId);
        html = renderLeadDetail(state.detailId);
        title = lead ? leadDisplayName(lead) : '';
        break;
      }
      case 'profile':
        html = renderProfile(); title = 'Profil'; break;
      case 'wrapup':
        html = renderWrapup(); title = 'Nächste Schritte'; break;
      default:
        html = renderCapture(); title = captureTitle();
    }

    el.innerHTML = `<div class="view-enter">${html}</div>`;
    topbar().textContent = title;

    if (state.view === 'profile') initThemeSwatches();
  }

  // ═══════════════════════════════════════════════════════════
  // CAPTURE FLOW – shell + stepper
  // ═══════════════════════════════════════════════════════════
  function captureTitle() {
    const titles = ['', 'Apotheke finden', 'Ansprechpartner', 'Details erfassen', 'Formular & Einwilligung'];
    return titles[state.capture.step] || 'Erfassen';
  }

  function renderCapture() {
    let body = '';
    switch (state.capture.step) {
      case 1: body = renderCaptureStep1(); break;
      case 2: body = renderCaptureStep2(); break;
      case 3: body = renderCaptureStep3(); break;
      case 4: body = renderCaptureStep4(); break;
      default: body = renderCaptureStep1();
    }
    return `<div class="capture-view">${renderStepper()}${body}</div>`;
  }

  function renderStepper() {
    const labels = ['Apotheke', 'Ansprechpartner', 'Details', 'Formular'];
    const cur = state.capture.step;
    return `
    <div class="stepper">
      ${labels.map((l, i) => {
        const n = i + 1;
        const cls = n === cur ? 'current' : (n < cur ? 'done' : '');
        return `<div class="step-dot-wrap ${cls}" ${n < cur ? `onclick="App.goToCaptureStep(${n})"` : ''}>
          <div class="step-dot">${n < cur ? '<span class="mi">check</span>' : n}</div>
          <div class="step-label">${l}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function goToCaptureStep(n) {
    if (n > 1 && !state.capture.institution) n = 1;
    state.capture.step = n;
    renderView();
  }

  function prevCaptureStep() {
    if (state.capture.step > 1) goToCaptureStep(state.capture.step - 1);
  }

  function resetCapture() {
    state.capture = defaultCapture();
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1 – APOTHEKE FINDEN
  // ═══════════════════════════════════════════════════════════
  function renderCaptureStep1() {
    return `
    <div class="capture-step">
      <div class="form-group">
        <label class="form-label">Apotheke suchen</label>
        <input type="text" class="form-input" id="cap-inst-search" placeholder="Name oder Adresse …"
          oninput="App.onInstitutionSearch(this.value)"
          autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
      </div>
      <div id="cap-inst-results">${renderInstitutionResults([], '')}</div>
    </div>`;
  }

  function renderInstitutionResults(results, q) {
    if (!q || q.trim().length < 2) {
      return `<p class="hint-text">Mindestens 2 Zeichen eingeben, um eine Apotheke zu finden.</p>`;
    }
    if (!results.length) {
      return `<div class="empty-state"><span class="mi">search_off</span><h3>Keine Treffer für „${q}“</h3><p>Neue Apotheken werden nicht hier angelegt – bitte an den Innendienst melden.</p></div>`;
    }
    return results.map(c => `
      <div class="institution-result" onclick="App.selectInstitution('${c.id}')">
        <div class="institution-result-icon"><span class="mi">local_pharmacy</span></div>
        <div style="flex:1;min-width:0">
          <div class="institution-result-name">${c.name}</div>
          <div class="institution-result-sub">${c.address}</div>
          <div class="institution-result-meta">Zuständig: ${c.assignedRep || DB.rep.name}${c.lastContact ? ' · Letzter Kontakt ' + new Date(c.lastContact).toLocaleDateString('de-DE') : ''}</div>
        </div>
        <span class="mi" style="color:var(--clr-on-surface-var)">chevron_right</span>
      </div>`).join('');
  }

  function onInstitutionSearch(q) {
    const results = q.trim().length >= 2 ? DB.searchInstitutions(q).slice(0, 8) : [];
    const el = document.getElementById('cap-inst-results');
    if (el) el.innerHTML = renderInstitutionResults(results, q);
  }

  function selectInstitution(id) {
    const c = DB.getCustomer(id);
    if (!c) return;
    state.capture.institution = {
      id: c.id, name: c.name, address: c.address,
      assignedRep: c.assignedRep || DB.rep.name,
      contacts: c.contacts || [],
    };
    state.capture.custType = 'bestand';
    goToCaptureStep(2);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2 – ANSPRECHPARTNER
  // ═══════════════════════════════════════════════════════════
  function renderCaptureStep2() {
    const inst = state.capture.institution;
    const contacts = inst.contacts || [];
    return `
    <div class="capture-step">
      <div class="institution-banner">
        <span class="mi">local_pharmacy</span>
        <div>
          <div class="institution-banner-name">${inst.name}</div>
          <div class="institution-banner-addr">${inst.address}</div>
        </div>
      </div>

      ${contacts.length ? `
        <div class="form-section-hd">Bekannte Ansprechpartner</div>
        ${contacts.map(c => {
          const sel = state.capture.contact && state.capture.contact.id === c.id;
          return `
          <div class="institution-result ${sel ? 'sel' : ''}" onclick="App.selectContact('${c.id}')">
            <div class="institution-result-icon"><span class="mi">${sel ? 'check_circle' : 'person'}</span></div>
            <div style="flex:1;min-width:0">
              <div class="institution-result-name">${c.salutation} ${c.first} ${c.last}</div>
              <div class="institution-result-sub">${c.role || ''}</div>
            </div>
            <span class="mi" style="color:var(--clr-on-surface-var)">chevron_right</span>
          </div>`;
        }).join('')}
      ` : `<p class="hint-text">Noch keine Ansprechpartner hinterlegt.</p>`}

      <button class="btn btn-outline" style="width:100%;margin-top:12px" onclick="App.showNewContactSheet()">
        <span class="mi">person_add</span> Neuen Ansprechpartner anlegen
      </button>
      <button class="btn btn-tonal ${state.capture.contactSkipped ? 'sel' : ''}" style="width:100%;margin-top:8px" onclick="App.skipContact()">
        <span class="mi">skip_next</span> Später anlegen${state.capture.contactSkipped ? ' ✓' : ''}
      </button>

      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-outline" onclick="App.prevCaptureStep()">Zurück</button>
      </div>
    </div>`;
  }

  function selectContact(id) {
    const c = (state.capture.institution.contacts || []).find(c => c.id === id);
    if (!c) return;
    state.capture.contact = c;
    state.capture.contactSkipped = false;
    goToCaptureStep(3);
  }

  function skipContact() {
    state.capture.contact = null;
    state.capture.contactSkipped = true;
    goToCaptureStep(3);
  }

  function showNewContactSheet() {
    tmpSalutation = 'Herr';
    tmpRole = '';
    showSheet(`
      <div class="sheet-handle"></div>
      <div class="sheet-title">Neuen Ansprechpartner anlegen</div>

      <button class="scan-banner" onclick="document.getElementById('cn-file').click()">
        <div class="scan-banner-icon-wrap"><span class="mi">document_scanner</span></div>
        <div class="scan-banner-text">
          <div class="scan-banner-title">Visitenkarte scannen</div>
          <div class="scan-banner-sub">Felder automatisch ausfüllen</div>
        </div>
        <span class="mi" style="color:var(--clr-primary);font-size:22px;flex-shrink:0">chevron_right</span>
      </button>
      <input type="file" id="cn-file" accept="image/*" capture="environment" style="display:none" onchange="App.processContactCardScan(this)">
      <div id="cn-scan-status"></div>

      <div class="form-group">
        <label class="form-label">Anrede</label>
        <div class="prod-chips" id="cn-salutation">
          ${['Herr','Frau','Divers'].map(s => `<div class="prod-chip ${s==='Herr'?'sel':''}" data-val="${s}" onclick="App.setContactSalutation('${s}')">${s}</div>`).join('')}
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Vorname</label>
          <input type="text" class="form-input" id="cn-first" placeholder="Maria">
        </div>
        <div class="form-group">
          <label class="form-label">Nachname</label>
          <input type="text" class="form-input" id="cn-last" placeholder="Mustermann">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Rolle</label>
        <div class="prod-chips" id="cn-role">
          ${['PTA','Apotheker','Filialleitung','Sonstiges'].map(r => `<div class="prod-chip" data-val="${r}" onclick="App.setContactRole('${r}')">${r}</div>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Telefon</label>
        <input type="tel" class="form-input" id="cn-phone" placeholder="+49 …">
      </div>
      <div class="form-group">
        <label class="form-label">E-Mail</label>
        <input type="email" class="form-input" id="cn-email" placeholder="name@…">
      </div>

      <div class="btn-row">
        <button class="btn btn-outline" onclick="App.closeSheet()">Abbrechen</button>
        <button class="btn btn-primary" onclick="App.saveNewContact()">
          <span class="mi">person_add</span> Übernehmen
        </button>
      </div>
    `);
  }

  function setContactSalutation(v) {
    tmpSalutation = v;
    document.querySelectorAll('#cn-salutation .prod-chip').forEach(el => el.classList.toggle('sel', el.dataset.val === v));
  }

  function setContactRole(v) {
    tmpRole = (tmpRole === v) ? '' : v;
    document.querySelectorAll('#cn-role .prod-chip').forEach(el => el.classList.toggle('sel', el.dataset.val === tmpRole));
  }

  async function processContactCardScan(input) {
    if (!input.files || !input.files[0]) return;
    const statusEl = document.getElementById('cn-scan-status');
    const setStatus = (html) => { if (statusEl) statusEl.innerHTML = html; };
    setStatus(`<div class="scan-status-card"><div class="scan-spinner"></div><div style="font-size:13px;color:var(--clr-on-surface-var)">Bild wird analysiert …</div></div>`);

    const rawUrl = URL.createObjectURL(input.files[0]);
    try {
      const processedUrl = await preprocessCardImage(rawUrl);
      await ensureTesseract();

      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setStatus(`<div class="scan-status-card"><div class="scan-spinner"></div><div style="font-size:13px;color:var(--clr-on-surface-var)">Text wird erkannt … ${Math.round((m.progress||0)*100)} %</div></div>`);
          }
        },
      });
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      const { data } = await worker.recognize(processedUrl);
      await worker.terminate();

      const parsed = parseBusinessCard(data.text);
      const fill = (id, val) => {
        if (!val) return;
        const el = document.getElementById(id);
        if (!el) return;
        el.value = val;
        el.classList.add('field-detected');
      };
      fill('cn-first', parsed.first);
      fill('cn-last',  parsed.last);
      fill('cn-phone', parsed.phone);
      fill('cn-email', parsed.email);

      setStatus(`<p style="font-size:12px;color:var(--clr-on-surface-var);margin:6px 0 12px">Felder aus Visitenkarte übernommen – bitte prüfen.</p>`);
    } catch (err) {
      setStatus(`<p style="font-size:12px;color:var(--clr-on-surface-var);margin:6px 0 12px">Erkennung fehlgeschlagen – bitte manuell eingeben.</p>`);
      showToast('OCR fehlgeschlagen – Daten manuell eingeben');
    }
  }

  function saveNewContact() {
    const first = (document.getElementById('cn-first').value || '').trim();
    const last  = (document.getElementById('cn-last').value  || '').trim();
    const phone = (document.getElementById('cn-phone').value || '').trim();
    const email = (document.getElementById('cn-email').value || '').trim();

    if (!first && !last) { showToast('Bitte mindestens den Namen eingeben'); return; }

    const newContact = {
      id: 'ct' + Date.now(),
      salutation: tmpSalutation,
      first, last,
      role: tmpRole,
      phone, email,
    };

    // In der Institution mitführen, damit der Ansprechpartner beim
    // Zurückgehen zu Schritt 2 als bekannt/ausgewählt erscheint statt
    // wieder als "keine Ansprechpartner hinterlegt".
    state.capture.institution.contacts = state.capture.institution.contacts || [];
    state.capture.institution.contacts.push(newContact);

    state.capture.contact = newContact;
    state.capture.contactSkipped = false;
    closeSheet();
    goToCaptureStep(3);
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3 – FORMULAR
  // ═══════════════════════════════════════════════════════════
  function renderCaptureStep3() {
    const cap = state.capture;
    const today = new Date();
    const todayStr = today.toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
    const zustaendigerAD = cap.institution.assignedRep || DB.rep.name;

    return `
    <div class="capture-step">
      <div class="capture-header-chips">
        <div class="info-chip"><span class="mi">event</span> ${todayStr}</div>
        <div class="info-chip"><span class="mi">badge</span> ${zustaendigerAD}</div>
      </div>

      <div class="form-group">
        <label class="form-label">Gesprächspartner (optional, 2. AD)</label>
        <select class="form-select" id="cap-secondary-rep" onchange="App.setSecondaryRep(this.value)">
          <option value="">–</option>
          ${DB.team.filter(t => t.name !== zustaendigerAD).map(t =>
            `<option value="${t.name}" ${cap.secondaryRep === t.name ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </div>

      <div class="form-section-hd">Kundentyp</div>
      <div class="prod-chips" id="cap-custtype-group">
        <div class="prod-chip ${cap.custType==='bestand'?'sel':''}" data-val="bestand" onclick="App.setCustType('bestand')">Bestandskunde</div>
        <div class="prod-chip ${cap.custType==='neu'?'sel':''}" data-val="neu" onclick="App.setCustType('neu')">Neukunde</div>
      </div>

      <div class="form-section-hd">Lead-Qualität</div>
      <div class="prod-chips" id="cap-quality-group">
        <div class="prod-chip ${cap.leadQuality==='heiss'?'sel':''}" data-val="heiss" onclick="App.setLeadQuality('heiss')">🔥 Heiß</div>
        <div class="prod-chip ${cap.leadQuality==='warm'?'sel':''}" data-val="warm" onclick="App.setLeadQuality('warm')">🌤️ Warm</div>
        <div class="prod-chip ${cap.leadQuality==='kalt'?'sel':''}" data-val="kalt" onclick="App.setLeadQuality('kalt')">❄️ Kalt</div>
      </div>

      <div class="form-section-hd">Marke / Eigenmarke</div>
      <div class="prod-chips" id="cap-brands-group">
        ${DB.products.map(p => `<div class="prod-chip ${cap.brands.includes(p.id)?'sel':''}" onclick="App.toggleBrand('${p.id}', this)">${p.name}</div>`).join('')}
      </div>

      <div class="form-section-hd">Aktionstyp</div>
      <div class="congress-checks">
        ${ACTIONS.map(a => `
          <label class="congress-chip">
            <input type="checkbox" id="act-${a.key}" ${cap.actions.includes(a.key)?'checked':''} onchange="App.toggleAction('${a.key}', this.checked)" hidden>
            <span class="mi congress-chip-icon">${a.icon}</span>
            <span>${a.label}</span>
            <span class="mi congress-chip-check">check</span>
          </label>`).join('')}
      </div>

      ${cap.actions.includes('folgetermin') ? `
      <div class="form-section-hd">Folgetermin</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Datum</label>
          <input type="date" class="form-input" id="cap-fu-date" value="${cap.followUpDate}" onchange="App.setFollowUp('date', this.value)">
        </div>
        <div class="form-group">
          <label class="form-label">Uhrzeit</label>
          <input type="time" class="form-input" id="cap-fu-time" value="${cap.followUpTime}" onchange="App.setFollowUp('time', this.value)">
        </div>
      </div>` : ''}

      <div class="form-group">
        <label class="form-label">Notizen (optional)</label>
        <textarea class="form-input" id="cap-notes" placeholder="Kurzstichpunkte …" oninput="App.setNotes(this.value)">${cap.notes}</textarea>
        <p class="compliance-hint"><span class="mi">info</span> Bitte keine Gesundheitsdaten Dritter oder werbliche Heilversprechen im Freitext notieren.</p>
      </div>

      <div class="btn-row">
        <button class="btn btn-outline" onclick="App.prevCaptureStep()">Zurück</button>
        <button class="btn btn-primary" onclick="App.goToCaptureStep(4)">Weiter</button>
      </div>
    </div>`;
  }

  function setSecondaryRep(v) { state.capture.secondaryRep = v; }

  function setCustType(v) {
    state.capture.custType = v;
    document.querySelectorAll('#cap-custtype-group .prod-chip').forEach(el => el.classList.toggle('sel', el.dataset.val === v));
  }

  function setLeadQuality(v) {
    state.capture.leadQuality = v;
    document.querySelectorAll('#cap-quality-group .prod-chip').forEach(el => el.classList.toggle('sel', el.dataset.val === v));
  }

  function toggleBrand(pid, el) {
    const i = state.capture.brands.indexOf(pid);
    if (i === -1) { state.capture.brands.push(pid); el.classList.add('sel'); }
    else { state.capture.brands.splice(i, 1); el.classList.remove('sel'); }
  }

  function toggleAction(key, checked) {
    const i = state.capture.actions.indexOf(key);
    if (checked && i === -1) state.capture.actions.push(key);
    else if (!checked && i !== -1) state.capture.actions.splice(i, 1);
    renderView(); // follow-up date fields depend on this
  }

  function setFollowUp(field, val) {
    if (field === 'date') state.capture.followUpDate = val;
    else state.capture.followUpTime = val;
  }

  function setNotes(v) { state.capture.notes = v; }

  // ═══════════════════════════════════════════════════════════
  // STEP 4 – FORMULAR & EINWILLIGUNG
  // ═══════════════════════════════════════════════════════════
  function renderCaptureStep4() {
    const cap = state.capture;
    if (cap.custType !== 'neu') {
      return `
      <div class="capture-step">
        <div class="empty-state">
          <span class="mi">verified_user</span>
          <h3>Bestandskunde</h3>
          <p>Einwilligung liegt bereits vor – kein weiterer Nachweis nötig.</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-outline" onclick="App.prevCaptureStep()">Zurück</button>
          <button class="btn btn-primary" onclick="App.saveLead()">
            <span class="mi">save</span> Speichern
          </button>
        </div>
      </div>`;
    }

    return `
    <div class="capture-step">
      <p class="section-title" style="margin-bottom:10px">Formular &amp; Einwilligung</p>

      <label class="consent-row">
        <input type="checkbox" id="cap-form-flag" ${cap.formFilled ? 'checked' : ''} onchange="App.setFormFlag(this.checked)">
        <span>Formular ausgefüllt (Kennzeichen – Papierformular liegt vor, wird nicht digitalisiert)</span>
      </label>

      <label class="consent-row">
        <input type="checkbox" id="cap-consent" ${cap.consent ? 'checked' : ''} onchange="App.setConsent(this.checked)">
        <span>Einwilligung (DSGVO) eingeholt – der/die Ansprechpartner:in hat der Verarbeitung der Kontaktdaten zu Marketingzwecken zugestimmt.</span>
      </label>

      <div class="btn-row">
        <button class="btn btn-outline" onclick="App.prevCaptureStep()">Zurück</button>
        <button class="btn btn-primary" onclick="App.saveLead()">
          <span class="mi">save</span> Speichern
        </button>
      </div>
    </div>`;
  }

  function setFormFlag(v) { state.capture.formFilled = v; }
  function setConsent(v) { state.capture.consent = v; }

  // ═══════════════════════════════════════════════════════════
  // SAVE LEAD + OFFLINE SYNC
  // ═══════════════════════════════════════════════════════════
  function saveLead() {
    const cap = state.capture;
    if (!cap.institution) { showToast('Bitte zuerst eine Apotheke wählen'); return; }

    if (cap.custType === 'neu') {
      const formEl = document.getElementById('cap-form-flag');
      if (!formEl || !formEl.checked) { showToast('Bitte "Formular ausgefüllt" bestätigen'); return; }
      const consentEl = document.getElementById('cap-consent');
      if (!consentEl || !consentEl.checked) { showToast('Bitte Einwilligung bestätigen'); return; }
    }

    let institutionId = cap.institution.id;
    const assignedRep = cap.institution.assignedRep || DB.rep.name;

    if (!institutionId) {
      // Neukunde: gleich im lokalen CRM-Mock als Institution anlegen
      const instType = cap.institution.type || 'pharmacy';
      const created = DB.addCustomer({
        type: instType, name: cap.institution.name, practice: '',
        specialty: instType === 'pharmacy' ? 'Apotheke' : 'Allgemeinmedizin',
        address: cap.institution.address,
        street: cap.institution.street, zip: cap.institution.zip, city: cap.institution.city,
        state: cap.institution.state, country: cap.institution.country || 'Deutschland',
        phone: '–', email: '', priority: 'B', notes: '',
      });
      created.assignedRep = assignedRep;
      created.contacts = cap.contact ? [cap.contact] : [];
      institutionId = created.id;
    } else if (cap.contact) {
      const inst = DB.getCustomer(institutionId);
      if (inst && !(inst.contacts || []).some(c => c.id === cap.contact.id)) {
        inst.contacts = inst.contacts || [];
        inst.contacts.push(cap.contact);
      }
    }

    const lead = {
      institutionId,
      institutionName: cap.institution.name,
      address: cap.institution.address,
      isNewCustomer: cap.custType === 'neu',
      contact: cap.contact,
      contactSkipped: cap.contactSkipped,
      assignedRep,
      secondaryRep: cap.secondaryRep || null,
      leadQuality: cap.leadQuality,
      brands: [...cap.brands],
      actions: [...cap.actions],
      followUp: cap.actions.includes('folgetermin') ? { date: cap.followUpDate, time: cap.followUpTime } : null,
      notes: cap.notes,
      formFilled: cap.custType === 'neu' ? !!cap.formFilled : null,
      consentGiven: true,
      suggestedMails: [],
      syncStatus: navigator.onLine ? 'synced' : 'draft',
    };

    const saved = DB.addLead(lead);

    // Rein visuelle Simulation – es gibt kein echtes Innendienst-Ticketsystem angebunden.
    if (cap.actions.includes('katalog') || cap.actions.includes('auftrag')) {
      showToast('Folgeaufgabe für Innendienst/Versand vorgemerkt (Demo)');
    }
    showToast(lead.syncStatus === 'synced'
      ? 'Kontakt gespeichert ✓'
      : 'Als Entwurf gespeichert – wird synchronisiert, sobald online');

    state.lastSavedLeadId = saved.id;
    resetCapture();
    navigate('wrapup');
  }

  function trySyncDrafts(manual) {
    if (!navigator.onLine) {
      if (manual) showToast('Kein Netz verfügbar – Entwürfe bleiben lokal gespeichert');
      return;
    }
    const drafts = DB.leads.filter(l => l.syncStatus === 'draft');
    if (!drafts.length) {
      if (manual) showToast('Alles bereits synchronisiert');
      return;
    }
    drafts.forEach(l => DB.updateLeadSyncStatus(l.id, 'synced'));
    showToast(`${drafts.length} Entwurf/Entwürfe synchronisiert ✓`);
    if (state.view === 'contacts' || state.view === 'profile' || state.view === 'lead-detail') renderView();
  }

  // ═══════════════════════════════════════════════════════════
  // WRAPUP – Approved-Mail-Vorschläge nach dem Speichern
  // ═══════════════════════════════════════════════════════════
  function defaultSuggestedMails(lead) {
    const s = [];
    if (lead.isNewCustomer) s.push('welcome');
    if (lead.actions.includes('katalog')) s.push('pricelist');
    if (lead.actions.includes('auftrag')) s.push('closing');
    if (lead.actions.includes('folgetermin')) s.push('appointment');
    return s;
  }

  function renderWrapup() {
    const lead = DB.leads.find(l => l.id === state.lastSavedLeadId);
    if (!lead) return renderCapture();

    if (!lead.suggestedMails || !lead.suggestedMails.length) {
      lead.suggestedMails = defaultSuggestedMails(lead);
      DB.updateLead(lead.id, { suggestedMails: lead.suggestedMails });
    }

    return `
    <div class="capture-step">
      <div class="empty-state" style="padding-top:8px">
        <span class="mi" style="color:var(--clr-success)">check_circle</span>
        <h3>${leadDisplayName(lead)}</h3>
        <p>Kontakt gespeichert. Vorgeschlagene nächste Schritte – nur zur Vormerkung, es wird nichts automatisch verschickt.</p>
      </div>

      <div class="congress-checks">
        ${MAIL_SUGGESTIONS.map(m => `
          <label class="congress-chip">
            <input type="checkbox" ${lead.suggestedMails.includes(m.key) ? 'checked' : ''}
              onchange="App.toggleMailSuggestion('${m.key}', this.checked)" hidden>
            <span class="mi congress-chip-icon">${m.icon}</span>
            <span>${m.label}</span>
            <span class="mi congress-chip-check">check</span>
          </label>`).join('')}
      </div>

      <div class="btn-row" style="margin-top:16px">
        <button class="btn btn-primary" style="width:100%" onclick="App.finishWrapup()">
          <span class="mi">arrow_forward</span> Fertig – nächster Kontakt
        </button>
      </div>
    </div>`;
  }

  function toggleMailSuggestion(key, checked) {
    const lead = DB.leads.find(l => l.id === state.lastSavedLeadId);
    if (!lead) return;
    const set = new Set(lead.suggestedMails || []);
    if (checked) set.add(key); else set.delete(key);
    lead.suggestedMails = [...set];
    DB.updateLead(lead.id, { suggestedMails: lead.suggestedMails });
  }

  function finishWrapup() {
    state.lastSavedLeadId = null;
    navigate('capture');
  }

  // ═══════════════════════════════════════════════════════════
  // KONTAKTE (erfasste Leads)
  // ═══════════════════════════════════════════════════════════
  function leadDisplayName(l) {
    if (l.contact && (l.contact.first || l.contact.last)) {
      return `${l.contact.first} ${l.contact.last}`.trim();
    }
    return l.institutionName;
  }

  function renderContacts() {
    let list = DB.leads;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter(l =>
        l.institutionName.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        (l.contact && `${l.contact.first} ${l.contact.last}`.toLowerCase().includes(q))
      );
    }
    return `
    <div class="customers-view">
      <div class="cust-list">
        ${list.length === 0
          ? `<div class="empty-state"><span class="mi">contacts</span><h3>Noch keine Kontakte</h3><p>Über „Erfassen" den ersten Messekontakt anlegen.</p></div>`
          : list.map(l => leadCard(l)).join('')}
      </div>
    </div>`;
  }

  function leadCard(l) {
    const name = leadDisplayName(l);
    const initials = (l.contact && (l.contact.first || l.contact.last))
      ? ((l.contact.first[0] || '') + (l.contact.last[0] || ''))
      : '⚕';
    return `
    <div class="cust-item" onclick="App.navigate('lead-detail','${l.id}')">
      <div class="cust-avatar ${!l.contact ? 'pharmacy' : ''}">${initials}</div>
      <div class="cust-info">
        <div class="cust-name">${name}</div>
        <div class="cust-spec">${l.institutionName}</div>
        <div class="cust-addr">${l.address}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        <span class="type-badge ${l.isNewCustomer ? 'new' : 'existing'}">${l.isNewCustomer ? 'Neu' : 'Bestand'}</span>
        <span class="quality-badge quality-${l.leadQuality}">${QUALITY_LABELS[l.leadQuality] || '–'}</span>
        <span class="mi sync-icon ${l.syncStatus}">${l.syncStatus === 'synced' ? 'check_circle' : 'schedule'}</span>
      </div>
    </div>`;
  }

  function renderLeadDetail(id) {
    const l = DB.leads.find(x => x.id === id);
    if (!l) return '<div class="empty-state"><span class="mi">error</span><p>Nicht gefunden</p></div>';

    const name = leadDisplayName(l);
    const capturedStr = new Date(l.capturedAt).toLocaleString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
    const telUrl  = (l.contact && l.contact.phone) ? `tel:${l.contact.phone.replace(/\s/g,'')}` : null;
    const mailUrl = (l.contact && l.contact.email) ? `mailto:${l.contact.email}` : null;

    return `
    <div class="detail-view">
      <div class="detail-hero">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span class="type-badge ${l.isNewCustomer?'new':'existing'}">${l.isNewCustomer?'Neukunde':'Bestandskunde'}</span>
          <span class="quality-badge quality-${l.leadQuality}">${QUALITY_LABELS[l.leadQuality]||'–'}</span>
        </div>
        <div class="detail-hero-name">${name}</div>
        <div class="detail-hero-spec">${l.institutionName}</div>
        <div class="detail-hero-addr"><span class="mi">location_on</span>${l.address}</div>
      </div>

      <div class="detail-actions">
        ${telUrl ? `<button class="detail-action-btn" onclick="window.location='${telUrl}'"><span class="mi">call</span><span>Anrufen</span></button>` : ''}
        ${mailUrl ? `<button class="detail-action-btn" onclick="window.location='${mailUrl}'"><span class="mi">mail</span><span>E-Mail</span></button>` : ''}
        <button class="detail-action-btn" onclick="window.open('https://maps.google.com/?q=${encodeURIComponent(l.address)}','_blank')">
          <span class="mi">map</span><span>Karte</span>
        </button>
      </div>

      <div class="detail-section">
        <div class="detail-section-hd">Ansprechpartner</div>
        ${l.contact ? `
          <div class="detail-row"><span class="mi">person</span><div><div class="dr-label">Name</div><div class="dr-value">${l.contact.salutation} ${l.contact.first} ${l.contact.last}</div></div></div>
          ${l.contact.role  ? `<div class="detail-row"><span class="mi">badge</span><div><div class="dr-label">Rolle</div><div class="dr-value">${l.contact.role}</div></div></div>` : ''}
          ${l.contact.phone ? `<div class="detail-row"><span class="mi">call</span><div><div class="dr-label">Telefon</div><div class="dr-value">${l.contact.phone}</div></div></div>` : ''}
          ${l.contact.email ? `<div class="detail-row"><span class="mi">mail</span><div><div class="dr-label">E-Mail</div><div class="dr-value">${l.contact.email}</div></div></div>` : ''}
        ` : `<p style="font-size:14px;color:var(--clr-on-surface-var)">Noch kein Ansprechpartner hinterlegt.</p>`}
      </div>

      <div class="detail-section">
        <div class="detail-section-hd">Messe-Kopfdaten</div>
        <div class="detail-row"><span class="mi">event</span><div><div class="dr-label">Erfasst am</div><div class="dr-value">${capturedStr}</div></div></div>
        <div class="detail-row"><span class="mi">badge</span><div><div class="dr-label">Zuständiger AD</div><div class="dr-value">${l.assignedRep}</div></div></div>
        ${l.secondaryRep ? `<div class="detail-row"><span class="mi">group</span><div><div class="dr-label">Gesprächspartner</div><div class="dr-value">${l.secondaryRep}</div></div></div>` : ''}
        ${l.followUp ? `<div class="detail-row"><span class="mi">calendar_add_on</span><div><div class="dr-label">Folgetermin</div><div class="dr-value">${l.followUp.date}${l.followUp.time ? ' · ' + l.followUp.time + ' Uhr' : ''}</div></div></div>` : ''}
      </div>

      ${l.brands.length ? `
      <div class="detail-section">
        <div class="detail-section-hd">Marke / Eigenmarke</div>
        <div class="visit-products" style="margin-top:4px">${l.brands.map(pid => `<span class="visit-prod-tag">${DB.getProductName(pid)}</span>`).join('')}</div>
      </div>` : ''}

      ${l.actions.length ? `
      <div class="detail-section">
        <div class="detail-section-hd">Aktionen</div>
        <div class="visit-products" style="margin-top:4px">${l.actions.map(a => `<span class="visit-prod-tag">${ACTION_LABELS[a]||a}</span>`).join('')}</div>
      </div>` : ''}

      ${l.notes ? `
      <div class="detail-section">
        <div class="detail-section-hd">Notizen</div>
        <p style="font-size:14px;line-height:1.6;color:var(--clr-on-surface)">${l.notes}</p>
      </div>` : ''}

      ${l.formFilled !== null ? `
      <div class="detail-section">
        <div class="detail-section-hd">Formular &amp; Einwilligung</div>
        <div class="detail-row">
          <span class="mi">${l.formFilled ? 'check_circle' : 'radio_button_unchecked'}</span>
          <div><div class="dr-label">Formular</div><div class="dr-value">${l.formFilled ? 'Ausgefüllt' : 'Nicht markiert'}</div></div>
        </div>
        <div class="detail-row">
          <span class="mi">${l.consentGiven ? 'check_circle' : 'radio_button_unchecked'}</span>
          <div><div class="dr-label">DSGVO</div><div class="dr-value">${l.consentGiven ? 'Einwilligung eingeholt' : 'Nicht markiert'}</div></div>
        </div>
      </div>` : ''}

      ${l.suggestedMails && l.suggestedMails.length ? `
      <div class="detail-section">
        <div class="detail-section-hd">Vorgeschlagene Mail-Aktionen</div>
        <div class="visit-products" style="margin-top:4px">${l.suggestedMails.map(k => `<span class="visit-prod-tag">${MAIL_LABELS[k]||k}</span>`).join('')}</div>
      </div>` : ''}

      <div class="detail-section">
        <div class="detail-row">
          <span class="mi">${l.syncStatus==='synced'?'cloud_done':'cloud_off'}</span>
          <div><div class="dr-label">Status</div><div class="dr-value">${l.syncStatus==='synced'?'Synchronisiert':'Entwurf – wartet auf Synchronisierung'}</div></div>
        </div>
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════════
  // PROFILE VIEW
  // ═══════════════════════════════════════════════════════════
  function renderProfile() {
    const rep = DB.rep;
    const pct = Math.round((rep.quota.current / rep.quota.target) * 100);
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLeads = DB.leads.filter(l => l.capturedAt.startsWith(todayStr)).length;
    const draftCount = DB.leads.filter(l => l.syncStatus === 'draft').length;

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
          <span class="mi">event</span>
          <span class="menu-row-label">${todayLeads} Kontakte heute erfasst</span>
        </div>
        <div class="menu-row" onclick="App.trySyncDrafts(true)">
          <span class="mi">${draftCount>0?'cloud_off':'cloud_done'}</span>
          <span class="menu-row-label">${draftCount>0 ? draftCount + ' Entwürfe offen – jetzt synchronisieren' : 'Alle Kontakte synchronisiert'}</span>
          ${draftCount>0 ? '<span class="mi mi-chevron">chevron_right</span>' : ''}
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
    document.querySelectorAll('.swatch').forEach((s,i) => s.classList.toggle('active', i === idx));
    document.querySelector('meta[name="theme-color"]').content = t.primary;
    showToast(`Farbe: ${t.name} aktiv`);
  }

  // ═══════════════════════════════════════════════════════════
  // BUSINESS CARD OCR – shared utilities (used by Step 2 scan)
  // ═══════════════════════════════════════════════════════════
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
    if (state.view !== 'contacts') {
      navigate('contacts');
    } else {
      renderView();
    }
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
  // SWIPE-BACK GESTURE
  // ═══════════════════════════════════════════════════════════
  function setupSwipe() {
    let startX = 0;
    const el = document.getElementById('main');
    el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (dx > 80 && state.view === 'lead-detail') goBack();
    }, { passive: true });
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    navigate,
    goBack,
    closeSheet,
    toggleSearch,
    closeSearch,
    handleSearch,
    showToast,
    applyTheme,
    trySyncDrafts,

    // capture flow
    goToCaptureStep,
    prevCaptureStep,
    onInstitutionSearch,
    selectInstitution,
    selectContact,
    skipContact,
    showNewContactSheet,
    setContactSalutation,
    setContactRole,
    processContactCardScan,
    saveNewContact,
    setSecondaryRep,
    setCustType,
    setLeadQuality,
    toggleBrand,
    toggleAction,
    setFollowUp,
    setNotes,
    setFormFlag,
    setConsent,
    saveLead,

    // wrapup
    toggleMailSuggestion,
    finishWrapup,
  };

})();

// Expose globally
window.App = App;

// Kick off when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());
