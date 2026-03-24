(() => {
  const KEYS = {
    users: 'habinest_users',
    session: 'habinest_session',
    properties: 'habinest_properties',
    seeded: 'habinest_seeded_v1',
    purgedSeed: 'habinest_purged_seed_v1',
    bulkSeed: 'habinest_bulk_seed_v1'
  };

  // ---------- Utilities ----------
  const load = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : (fallback ?? null); }
    catch (_) { return fallback ?? null; }
  };
  const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));

  // ---------- Auth ----------
  const getUsers = () => load(KEYS.users, []);
  const setUsers = (users) => save(KEYS.users, users);
  const getSession = () => load(KEYS.session, null);
  const setSession = (sess) => save(KEYS.session, sess);
  const clearSession = () => localStorage.removeItem(KEYS.session);

  function registerUser({ name, email, password }) {
    const users = getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('Email already registered');
    }
    const user = { id: uid(), name: name?.trim() || email.split('@')[0], email, password };
    users.push(user);
    setUsers(users);
    setSession({ userId: user.id });
    return user;
  }

  function loginUser({ email, password }) {
    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid email or password');
    setSession({ userId: user.id });
    return user;
  }

  function currentUser() {
    const sess = getSession();
    if (!sess) return null;
    const users = getUsers();
    return users.find(u => u.id === sess.userId) || null;
  }

  // ---------- Properties ----------
  const getProps = () => load(KEYS.properties, []);
  const setProps = (props) => save(KEYS.properties, props);

  // Royalty-free placeholder images (Unsplash)
  const PLACEHOLDERS = {
    Apartment: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=60',
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=60',
      'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=60'
    ],
    Villa: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=60',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=60'
    ],
    PG: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=60',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=60'
    ],
    Hostel: [
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=60',
      'https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=1200&q=60'
    ]
  };
  function chooseImagesFor(category) {
    const list = PLACEHOLDERS[category] || PLACEHOLDERS['Apartment'];
    // Return 1-3 images randomly
    const shuffled = list.slice().sort(() => Math.random() - 0.5);
    const count = Math.min(3, Math.max(1, Math.floor(Math.random()*3)+1));
    return shuffled.slice(0, count);
  }

  async function filesToDataURLs(fileList, max = 3) {
    const files = Array.from(fileList || []).slice(0, max);
    const toDataUrl = (file) => new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
    const urls = [];
    for (const f of files) {
      try { urls.push(await toDataUrl(f)); } catch { /* ignore */ }
    }
    return urls;
  }

  // Seeding disabled per request – we keep only user-owned data
  function seedDataIfNeeded() { return; }

  function purgeSeededDemoPropertiesOnce() {
    if (load(KEYS.purgedSeed)) return;
    const all = getProps();
    if (!all || !all.length) {
      localStorage.removeItem(KEYS.seeded);
      save(KEYS.purgedSeed, true);
      return;
    }
    const filtered = all.filter(p => !!p.ownerId);
    if (filtered.length !== all.length) {
      setProps(filtered);
    }
    localStorage.removeItem(KEYS.seeded);
    save(KEYS.purgedSeed, true);
  }

  // Ensure a user exists by email (without changing session)
  function ensureUserByEmail(email, name = null, password = 'habinest') {
    const users = getUsers();
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      user = { id: uid(), name: name || email.split('@')[0], email, password };
      users.push(user);
      setUsers(users);
    }
    return user;
  }

  // Add 10 Buy and 10 Rent properties once
  function seedBulkIfNeeded() {
    if (load(KEYS.bulkSeed)) return;
    const now = Date.now();
    const cities = [
      'Mumbai, Maharashtra', 'Pune, Maharashtra', 'Bengaluru, Karnataka', 'Hyderabad, Telangana',
      'Chennai, Tamil Nadu', 'Delhi, NCR', 'Gurugram, Haryana', 'Noida, Uttar Pradesh',
      'Kolkata, West Bengal', 'Ahmedabad, Gujarat'
    ];

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const buyTitles = [
      '2 BHK Apartment', '3 BHK Apartment', 'Luxury Villa', 'Compact 1 BHK', 'Spacious 4 BHK',
      'Garden View Apartment', 'Penthouse Suite', 'Lake Facing Flat', 'Parkside Apartment', 'Corner Villa'
    ];
    const rentTitles = [
      'Cozy 1 BHK for Rent', 'Furnished 2 BHK', 'PG for Students', 'PG for Working Professionals', 'Hostel Room',
      'Studio Apartment', 'Shared Accommodation', 'Compact Room', 'Premium PG', 'Girls Hostel Room'
    ];

    const props = getProps();

    // Assign owner to mandlesh@gmail.com
    const owner = ensureUserByEmail('mandlesh@gmail.com', 'Mandlesh', 'habinest');

    // Generate 10 Buy
    for (let i = 0; i < 10; i++) {
      const propertyType = Math.random() < 0.6 ? 'Apartment' : 'Villa';
      const price = randInt(3000000, 25000000); // 30L to 2.5Cr
      props.push({
        id: uid(),
        title: `${pick(buyTitles)} in ${pick(['Andheri','HSR','Kondapur','Whitefield','Baner','Velachery'])}`,
        description: 'Well-maintained property in a prime locality with good connectivity.',
        location: pick(cities),
        price,
        type: 'buy',
        propertyType,
        images: chooseImagesFor(propertyType),
        createdAt: now - randInt(0, 30) * 24 * 3600 * 1000,
        ownerId: owner.id,
        contactName: owner.name,
        contactEmail: owner.email
      });
    }

    // Generate 10 Rent
    for (let i = 0; i < 10; i++) {
      const propertyType = pick(['Apartment','PG','Hostel']);
      const price = randInt(6000, 65000); // monthly
      props.push({
        id: uid(),
        title: `${pick(rentTitles)} in ${pick(['Koramangala','Kukatpally','Powai','Aundh','Gachibowli','Indiranagar'])}`,
        description: 'Convenient location, near public transit and essentials. Suitable for singles or families.',
        location: pick(cities),
        price,
        type: 'rent',
        propertyType,
        images: chooseImagesFor(propertyType),
        createdAt: now - randInt(0, 30) * 24 * 3600 * 1000,
        ownerId: owner.id,
        contactName: owner.name,
        contactEmail: owner.email
      });
    }

    setProps(props);
    save(KEYS.bulkSeed, true);
  }

  // ---------- Rendering / Routing ----------
  const els = {
    app: () => document.getElementById('app'),
    nav: {
      buy: () => document.getElementById('navBuy'),
      rent: () => document.getElementById('navRent'),
      pgHostel: () => document.getElementById('navPGHostel'),
      post: () => document.getElementById('navPost'),
      dashboard: () => document.getElementById('navDashboard'),
      login: () => document.getElementById('navLogin'),
      register: () => document.getElementById('navRegister'),
      logout: () => document.getElementById('navLogout'),
      user: () => document.getElementById('navUser')
    }
  };

  function updateNav() {
    const user = currentUser();
    const show = (el, flag) => el.classList.toggle('d-none', !flag);

    // Public links always visible
    [els.nav.buy(), els.nav.rent(), els.nav.pgHostel()].forEach(el => el && show(el, true));

    if (user) {
      show(els.nav.post(), true);
      show(els.nav.dashboard(), true);
      show(els.nav.logout(), true);
      show(els.nav.login(), false);
      show(els.nav.register(), false);
      const u = els.nav.user();
      u.textContent = `Hi, ${user.name || 'User'}`;
      show(u, true);
    } else {
      show(els.nav.post(), false);
      show(els.nav.dashboard(), false);
      show(els.nav.logout(), false);
      show(els.nav.login(), true);
      show(els.nav.register(), true);
      show(els.nav.user(), false);
    }
  }

  function renderTemplate(id) {
    const tpl = document.getElementById(id);
    const node = tpl.content.cloneNode(true);
    const app = els.app();
    app.innerHTML = '';
    app.appendChild(node);
    return app;
  }

  function requireAuthOrRedirect() {
    if (!currentUser()) {
      location.hash = '#/login';
      return false;
    }
    return true;
  }

  // Landing
  function renderLanding() {
    renderTemplate('landing-view');
    let mode = 'buy';
    const tabs = document.getElementById('landingTabs');
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mode]');
      if (!btn) return;
      tabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      mode = btn.getAttribute('data-mode');
    });

    const form = document.getElementById('landingSearch');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = (document.getElementById('landingQuery').value || '').trim();
      const min = (document.getElementById('landingMin').value || '').trim();
      const max = (document.getElementById('landingMax').value || '').trim();
      let path = mode === 'buy' ? '#/buy' : '#/rent';
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (min) params.set('min', min);
      if (max) params.set('max', max);
      if (mode === 'pg') params.set('category', 'PG');
      if (mode === 'hostel') params.set('category', 'Hostel');
      const qs = params.toString();
      location.hash = qs ? `${path}?${qs}` : path;
    });
  }

  function renderLogin() {
    renderTemplate('login-view');
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      try {
        loginUser({ email, password });
        updateNav();
        location.hash = '#/dashboard';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function renderRegister() {
    renderTemplate('register-view');
    const form = document.getElementById('registerForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const password2 = document.getElementById('regPassword2').value;
      if (password !== password2) { alert('Passwords do not match'); return; }
      try {
        registerUser({ name, email, password });
        updateNav();
        location.hash = '#/dashboard';
      } catch (err) {
        alert(err.message);
      }
    });
  }

  function renderHome() {
    if (!requireAuthOrRedirect()) return;
    renderTemplate('home-view');
  }

  // Dashboard (user’s listings)
  function renderDashboard() {
    if (!requireAuthOrRedirect()) return;
    renderTemplate('dashboard-view');
    const user = currentUser();
    document.getElementById('dashName').textContent = user?.name || 'User';
    document.getElementById('dashEmail').textContent = user?.email || '';
    const grid = document.getElementById('dashGrid');
    const mine = getProps().filter(p => p.ownerId === user.id);
    document.getElementById('dashCount').textContent = mine.length;

    const toCol = (p) => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6';
      const hasImage = p.images && p.images[0];
      const mediaHtml = hasImage
        ? `<img class="property-img" src="${p.images[0]}" alt="${escapeHtml(p.title)}" />`
        : `<div class="placeholder-media"><span>🏠</span></div>`;
      col.innerHTML = `
        <div class="card h-100 shadow-sm clickable" data-action="view" data-id="${p.id}">
          ${mediaHtml}
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h2 class="h6 mb-0">${escapeHtml(p.title)}</h2>
              <span class="badge text-bg-${p.type === 'buy' ? 'success' : 'info'} badge-type">${p.type}</span>
            </div>
            <div class="text-secondary small mb-1">${escapeHtml(p.location)}</div>
            <div class="fw-semibold mb-2">${formatCurrency(p.price)}</div>
            <div class="d-flex justify-content-between align-items-center mt-auto">
              <div class="text-secondary small">${timeAgo(p.createdAt)}</div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${p.id}">Edit</button>
                <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${p.id}">Delete</button>
              </div>
            </div>
          </div>
        </div>`;
      return col;
    };

    if (!mine.length) {
      grid.innerHTML = '<div class="col-12 text-center text-secondary py-4">You have no listings yet. <a href="#/post">Post your first property</a>.</div>';
    } else {
      mine.sort((a,b) => Number(b.createdAt||0) - Number(a.createdAt||0)).forEach(p => grid.appendChild(toCol(p)));
    }

    grid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) { const id = editBtn.getAttribute('data-id'); location.hash = `#/edit?id=${id}`; return; }
      const delBtn = e.target.closest('[data-action="delete"]');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        const all = getProps();
        const idx = all.findIndex(x => x.id === id);
        if (idx === -1) return;
        if (!confirm('Delete this property? This action cannot be undone.')) return;
        all.splice(idx, 1); setProps(all);
        renderDashboard();
        return;
      }
      const viewBtn = e.target.closest('[data-action="view"]');
      if (viewBtn) { const id = viewBtn.getAttribute('data-id'); location.hash = `#/property?id=${id}`; }
    });
  }

  function renderList(type) {
    if (!requireAuthOrRedirect()) return;
    renderTemplate('list-view');
    const titleEl = document.getElementById('listTitle');
    titleEl.textContent = type === 'buy' ? 'Buy Properties' : 'Rent Properties';

    const grid = document.getElementById('propertiesGrid');
    const searchEl = document.getElementById('filterSearch');
    const minEl = document.getElementById('filterMin');
    const maxEl = document.getElementById('filterMax');
    const catEl = document.getElementById('filterCategory');
    const mineEl = document.getElementById('filterMine');
    const sortEl = document.getElementById('filterSort');
    const resetBtn = document.getElementById('filterReset');

    const user = currentUser();
    const base = getProps().filter(p => p.type === type);

    const toCol = (p) => {
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-lg-4';
      const canModify = user && p.ownerId && user.id === p.ownerId;
      const hasImage = p.images && p.images[0];
      const mediaHtml = hasImage
        ? `<img class=\"property-img\" src=\"${p.images[0]}\" alt=\"${escapeHtml(p.title)}\" />`
        : `<div class=\"placeholder-media\"><span>🏠</span></div>`;
      col.innerHTML = `
        <div class=\"card h-100 shadow-sm clickable\" tabindex=\"0\" data-action=\"view\" data-id=\"${p.id}\">
          ${mediaHtml}
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h2 class="h6 mb-0">${escapeHtml(p.title)}</h2>
              <span class="badge text-bg-${p.type === 'buy' ? 'success' : 'info'} badge-type">${p.type}</span>
            </div>
            <div class="text-secondary small mb-1">${escapeHtml(p.location)}</div>
            <div class="text-secondary small mb-1">Type: ${escapeHtml(p.propertyType || 'Apartment')}</div>
            <div class="fw-semibold mb-2">${formatCurrency(p.price)}</div>
            ${(() => { const parts = [];
                if (p.contactName) parts.push(escapeHtml(p.contactName));
                if (p.contactPhone) parts.push(escapeHtml(p.contactPhone));
                if (p.contactEmail) parts.push(escapeHtml(p.contactEmail));
                return parts.length ? `<div class=\"text-secondary small mb-2\">Contact: ${parts.join(' • ')}</div>` : '';
              })()}
            <p class="text-secondary small flex-grow-1">${escapeHtml((p.description || '').slice(0, 100))}${(p.description || '').length > 100 ? '…' : ''}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <button class="btn btn-sm btn-primary" data-action="view" data-id="${p.id}">View</button>
              ${canModify ? `
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${p.id}">Edit</button>
                  <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${p.id}">Delete</button>
                </div>` : ''}
            </div>
          </div>
        </div>`;
      return col;
    };

    function renderGrid(list) {
      grid.innerHTML = '';
      if (!list.length) {
        grid.innerHTML = '<div class="col-12 text-center text-secondary">No matching properties.</div>';
        return;
      }
      list.forEach(p => grid.appendChild(toCol(p)));
    }

    function applyFilters() {
      let list = base.slice();
      const q = (searchEl.value || '').trim().toLowerCase();
      if (q) list = list.filter(p => (p.title || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q));
      if (minEl.value !== '') list = list.filter(p => Number(p.price) >= Number(minEl.value));
      if (maxEl.value !== '') list = list.filter(p => Number(p.price) <= Number(maxEl.value));
      const cat = catEl.value;
      if (cat) list = list.filter(p => (p.propertyType || 'Apartment') === cat);
      if (mineEl && mineEl.checked && user) list = list.filter(p => p.ownerId === user.id);
      // Sorting
      const mode = (sortEl && sortEl.value) || 'newest';
      if (mode === 'price_asc') list.sort((a,b) => Number(a.price) - Number(b.price));
      else if (mode === 'price_desc') list.sort((a,b) => Number(b.price) - Number(a.price));
      else list.sort((a,b) => Number(b.createdAt||0) - Number(a.createdAt||0));
      renderGrid(list);
    }

    // Preselect from query
    const params = getQuery();
    const qCat = params.get('category'); if (qCat) catEl.value = qCat;
    const qQ = params.get('q'); if (qQ) searchEl.value = qQ;
    const qMin = params.get('min'); if (qMin) minEl.value = qMin;
    const qMax = params.get('max'); if (qMax) maxEl.value = qMax;

    if (!base.length) {
      grid.innerHTML = '<div class="col-12 text-center text-secondary">No properties yet. Be the first to post!</div>';
    } else {
      applyFilters();
    }

    // Filter listeners
    [searchEl, minEl, maxEl].forEach(el => el.addEventListener('input', applyFilters));
    catEl.addEventListener('change', applyFilters);
    if (mineEl) mineEl.addEventListener('change', applyFilters);
    if (sortEl) sortEl.addEventListener('change', applyFilters);
    resetBtn.addEventListener('click', () => {
      searchEl.value = '';
      minEl.value = '';
      maxEl.value = '';
      catEl.value = '';
      if (mineEl) mineEl.checked = false;
      if (sortEl) sortEl.value = 'newest';
      applyFilters();
    });

    // Actions (edit/delete prioritized over view)
    grid.addEventListener('click', (e) => {
      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        location.hash = `#/edit?id=${id}`;
        return;
      }
      const delBtn = e.target.closest('[data-action="delete"]');
      if (delBtn) {
        const id = delBtn.getAttribute('data-id');
        const all = getProps();
        const idx = all.findIndex(x => x.id === id);
        if (idx === -1) return;
        const prop = all[idx];
        const u = currentUser();
        if (!u || !prop.ownerId || u.id !== prop.ownerId) { alert('You can only delete your own property.'); return; }
        if (!confirm('Delete this property? This action cannot be undone.')) return;
        all.splice(idx, 1);
        setProps(all);
        applyFilters();
        return;
      }
      const viewBtn = e.target.closest('[data-action="view"]');
      if (viewBtn) {
        const id = viewBtn.getAttribute('data-id');
        location.hash = `#/property?id=${id}`;
        return;
      }
    });
  }

  // Post
  function renderPost() {
    if (!requireAuthOrRedirect()) return;
    renderTemplate('post-view');

    const imgInput = document.getElementById('propImages');
    const preview = document.getElementById('imagePreview');
    imgInput.addEventListener('change', async () => {
      preview.innerHTML = '';
      const files = Array.from(imgInput.files || []).slice(0, 3);
      for (const f of files) {
        const url = URL.createObjectURL(f);
        const img = document.createElement('img');
        img.src = url; img.className = 'preview-img'; img.alt = f.name;
        preview.appendChild(img);
      }
    });

    const form = document.getElementById('postForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = currentUser();
      if (!user) { alert('Please log in'); return; }

      const title = document.getElementById('propTitle').value.trim();
      const locationVal = document.getElementById('propLocation').value.trim();
      const price = Number(document.getElementById('propPrice').value);
      const type = document.getElementById('propType').value;
      const propertyType = document.getElementById('propCategory').value;
      const description = document.getElementById('propDesc').value.trim();
      const contactName = (document.getElementById('propContactName')?.value || '').trim();
      const contactPhone = (document.getElementById('propContactPhone')?.value || '').trim();
      const contactEmail = (document.getElementById('propContactEmail')?.value || '').trim();
      const images = await filesToDataURLs(document.getElementById('propImages').files, 3);

      if (!images.length) { alert('Please add at least one image (up to 3).'); return; }
      if (!contactPhone && !contactEmail) { alert('Please provide at least a phone or email for contact.'); return; }

      const prop = { id: uid(), title, location: locationVal, price, type, propertyType, description, contactName, contactPhone, contactEmail, images, createdAt: Date.now(), ownerId: user.id };
      const list = getProps();
      list.unshift(prop);
      setProps(list);
      alert('Property posted!');
      location.hash = type === 'buy' ? '#/buy' : '#/rent';
    });
  }

  // Edit
  function renderEdit() {
    if (!requireAuthOrRedirect()) return;
    const params = getQuery();
    const id = params.get('id');
    const all = getProps();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) { alert('Property not found'); location.hash = '#/landing'; return; }
    const prop = all[idx];
    const user = currentUser();
    if (!prop.ownerId || !user || user.id !== prop.ownerId) { alert('You can only edit your own property.'); location.hash = prop.type === 'buy' ? '#/buy' : '#/rent'; return; }

    renderTemplate('edit-view');

    // Prefill
    document.getElementById('propTitle').value = prop.title || '';
    document.getElementById('propLocation').value = prop.location || '';
    document.getElementById('propPrice').value = prop.price || 0;
    document.getElementById('propType').value = prop.type || 'buy';
    document.getElementById('propCategory').value = prop.propertyType || 'Apartment';
    document.getElementById('propDesc').value = prop.description || '';
    const cn = document.getElementById('propContactName'); if (cn) cn.value = prop.contactName || '';
    const cp = document.getElementById('propContactPhone'); if (cp) cp.value = prop.contactPhone || '';
    const ce = document.getElementById('propContactEmail'); if (ce) ce.value = prop.contactEmail || '';

    const imgInput = document.getElementById('propImages');
    const preview = document.getElementById('imagePreview');
    const renderExisting = () => {
      preview.innerHTML = '';
      (prop.images || []).slice(0,3).forEach((url) => {
        const img = document.createElement('img');
        img.src = url; img.className = 'preview-img'; img.alt = 'Current image';
        preview.appendChild(img);
      });
    };
    renderExisting();

    let newFiles = null;
    imgInput.addEventListener('change', () => {
      preview.innerHTML = '';
      newFiles = Array.from(imgInput.files || []).slice(0,3);
      if (!newFiles.length) { renderExisting(); return; }
      newFiles.forEach(f => {
        const url = URL.createObjectURL(f);
        const img = document.createElement('img');
        img.src = url; img.className = 'preview-img'; img.alt = f.name;
        preview.appendChild(img);
      });
    });

    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('propTitle').value.trim();
      const locationVal = document.getElementById('propLocation').value.trim();
      const price = Number(document.getElementById('propPrice').value);
      const type = document.getElementById('propType').value;
      const propertyType = document.getElementById('propCategory').value;
      const description = document.getElementById('propDesc').value.trim();
      const contactName = (document.getElementById('propContactName')?.value || '').trim();
      const contactPhone = (document.getElementById('propContactPhone')?.value || '').trim();
      const contactEmail = (document.getElementById('propContactEmail')?.value || '').trim();

      let images = prop.images || [];
      if (newFiles && newFiles.length) {
        images = await filesToDataURLs(newFiles, 3);
        if (!images.length) { alert('Please include at least one image.'); return; }
      }
      if (!contactPhone && !contactEmail) { alert('Please provide at least a phone or email for contact.'); return; }

      const updated = { ...prop, title, location: locationVal, price, type, propertyType, description, contactName, contactPhone, contactEmail, images };
      all[idx] = updated;
      setProps(all);
      alert('Property updated!');
      location.hash = type === 'buy' ? '#/buy' : '#/rent';
    });

    document.getElementById('editCancel').addEventListener('click', (e) => {
      e.preventDefault();
      location.hash = prop.type === 'buy' ? '#/buy' : '#/rent';
    });
  }

  // Detail
  function renderDetail() {
    if (!requireAuthOrRedirect()) return;
    const params = getQuery();
    const id = params.get('id');
    const all = getProps();
    const prop = all.find(p => p.id === id);
    if (!prop) { alert('Property not found'); location.hash = '#/landing'; return; }

    renderTemplate('detail-view');

    const gallery = document.getElementById('detailGallery');
    const makeImg = (src) => {
      const img = document.createElement('img');
      img.src = src; img.alt = 'Property image';
      img.className = 'preview-img';
      img.style.width = '160px'; img.style.height = '120px';
      img.style.objectFit = 'cover';
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        const modalEl = document.getElementById('imageModal');
        const modalImg = document.getElementById('imageModalImg');
        if (modalEl && modalImg && window.bootstrap && bootstrap.Modal) {
          modalImg.src = src;
          const m = bootstrap.Modal.getOrCreateInstance(modalEl);
          m.show();
        } else {
          window.open(src, '_blank');
        }
      });
      return img;
    };

    if (prop.images && prop.images.length) {
      prop.images.slice(0,3).forEach(u => gallery.appendChild(makeImg(u)));
    } else {
      const ph = document.createElement('div');
      ph.className = 'placeholder-media';
      ph.style.width = '100%'; ph.style.maxWidth = '320px';
      ph.innerHTML = '<span>🏠</span>';
      gallery.appendChild(ph);
    }

    document.getElementById('detailTitle').textContent = prop.title || '';
    const badge = document.getElementById('detailBadge');
    badge.textContent = prop.type || '';
    badge.classList.add(prop.type === 'buy' ? 'text-bg-success' : 'text-bg-info');
    document.getElementById('detailCategory').textContent = prop.propertyType || 'Apartment';
    document.getElementById('detailLocation').textContent = prop.location || '';
    document.getElementById('detailPrice').textContent = formatCurrency(prop.price);
    document.getElementById('detailDesc').textContent = prop.description || '';

    // Contact
    const cParts = [];
    if (prop.contactName) cParts.push(`Name: ${escapeHtml(prop.contactName)}`);
    if (prop.contactPhone) cParts.push(`Phone: ${escapeHtml(prop.contactPhone)}`);
    if (prop.contactEmail) cParts.push(`Email: ${escapeHtml(prop.contactEmail)}`);
    document.getElementById('detailContact').innerHTML = cParts.join(' • ');
    const callBtn = document.getElementById('detailCall');
    const emailBtn = document.getElementById('detailEmail');
    if (prop.contactPhone) { callBtn.classList.remove('d-none'); callBtn.href = `tel:${prop.contactPhone}`; }
    if (prop.contactEmail) { emailBtn.classList.remove('d-none'); emailBtn.href = `mailto:${prop.contactEmail}`; }

    document.getElementById('detailMeta').textContent = `Posted ${timeAgo(prop.createdAt)}`;

    const user = currentUser();
    const isOwner = user && prop.ownerId && user.id === prop.ownerId;
    const editBtn = document.getElementById('detailEdit');
    const delBtn = document.getElementById('detailDelete');
    if (isOwner) {
      editBtn.classList.remove('d-none');
      delBtn.classList.remove('d-none');
      editBtn.setAttribute('href', `#/edit?id=${prop.id}`);
      delBtn.addEventListener('click', () => {
        if (!confirm('Delete this property? This action cannot be undone.')) return;
        const idx = all.findIndex(p => p.id === prop.id);
        if (idx !== -1) {
          all.splice(idx, 1);
          setProps(all);
        }
        location.hash = prop.type === 'buy' ? '#/buy' : '#/rent';
      });
    }

    const back = document.getElementById('detailBack');
    back.setAttribute('href', prop.type === 'buy' ? '#/buy' : '#/rent');
  }

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - (ts || Date.now())) / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s/60); if (m < 60) return `${m}m ago`;
    const h = Math.floor(m/60); if (h < 24) return `${h}h ago`;
    const d = Math.floor(h/24); return `${d}d ago`;
  }
  function getQuery() {
    const hash = location.hash;
    const qs = hash.includes('?') ? hash.split('?')[1] : '';
    return new URLSearchParams(qs);
  }

  // ---------- Router ----------
  const routes = {
    '': () => currentUser() ? renderDashboard() : renderLanding(),
    '/landing': renderLanding,
    '/dashboard': renderDashboard,
    '/home': renderHome,
    '/login': renderLogin,
    '/register': renderRegister,
    '/buy': () => renderList('buy'),
    '/rent': () => renderList('rent'),
    '/post': renderPost,
    '/edit': renderEdit,
    '/property': renderDetail
  };

  function handleRoute() {
    updateNav();
    const hash = location.hash.replace(/^#/, '');
    const path = (hash.split('?')[0]) || '';
    const fn = routes[path] || routes[''];
    fn();
  }

  // ---------- Init ----------
  // Assign any previous seed_system properties to requested user
  function assignSeedOwnershipTo(email) {
    const owner = ensureUserByEmail(email);
    const list = getProps();
    let changed = false;
    for (const p of list) {
      if (p.ownerId === 'seed_system') {
        p.ownerId = owner.id;
        if (!p.contactEmail) p.contactEmail = owner.email;
        if (!p.contactName) p.contactName = owner.name;
        // add placeholders if missing
        if (!p.images || !p.images.length) p.images = chooseImagesFor(p.propertyType || (p.type === 'rent' ? 'Apartment' : 'Villa'));
        changed = true;
      }
    }
    if (changed) setProps(list);
  }

  // Ensure seeded owner listings have images
  function addPlaceholdersToOwnerListings(email) {
    const owner = ensureUserByEmail(email);
    const list = getProps();
    let changed = false;
    for (const p of list) {
      if (p.ownerId === owner.id && (!p.images || !p.images.length)) {
        p.images = chooseImagesFor(p.propertyType || (p.type === 'rent' ? 'Apartment' : 'Villa'));
        changed = true;
      }
    }
    if (changed) setProps(list);
  }

  function init() {
    purgeSeededDemoPropertiesOnce();
    seedBulkIfNeeded();
    assignSeedOwnershipTo('mandlesh@gmail.com');
    addPlaceholdersToOwnerListings('mandlesh@gmail.com');

    // Nav logout
    const logoutBtn = els.nav.logout();
    logoutBtn.addEventListener('click', () => {
      clearSession();
      updateNav();
      location.hash = '#/landing';
    });

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
