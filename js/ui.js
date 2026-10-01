const UI = {
  collapseSections(container) {
    for (const section of container.querySelectorAll('.section, .import-card, [data-accordion-title]')) {
      // data-accordion="off": sayfa kendi düzenini kurar (ana sayfa, yıllık plan).
      if (section.dataset.collapsible === 'true' || section.closest('details.app-accordion, [data-accordion="off"]')) continue;
      const header = section.querySelector(':scope > .section-header');
      const heading = header?.querySelector('h2, h3, strong') || section.querySelector(':scope > h2, :scope > h3');
      const title = section.dataset.accordionTitle || heading?.textContent.trim();
      if (!title) continue;
      section.dataset.collapsible = 'true';
      const details = document.createElement('details'); details.className = 'app-accordion';
      const summary = document.createElement('summary'); summary.textContent = title;
      const body = document.createElement('div'); body.className = 'accordion-body';
      if (heading) heading.remove();
      if (header && !header.children.length) header.remove();
      while (section.firstChild) body.appendChild(section.firstChild);
      details.append(summary, body); section.appendChild(details);
      // Açık/kapalı durumu sayfa yeniden çizildiğinde korunur.
      const key = `accordion:${typeof Router !== 'undefined' ? Router.currentPage : ''}:${title}`;
      try { details.open = sessionStorage.getItem(key) === '1'; } catch { /* Storage kapalı. */ }
      details.addEventListener('toggle', () => {
        try { sessionStorage.setItem(key, details.open ? '1' : '0'); } catch { /* Storage kapalı. */ }
      });
    }
    this.groupAccordions(container);
  },
  // Art arda gelen akordeonları tek bir liste kartında birleştirir.
  groupAccordions(container) {
    for (const section of container.querySelectorAll('[data-collapsible="true"]')) {
      if (section.parentElement.classList.contains('accordion-group')) continue;
      const prev = section.previousElementSibling;
      if (prev?.classList.contains('accordion-group')) { prev.appendChild(section); continue; }
      const group = document.createElement('div'); group.className = 'accordion-group';
      section.before(group); group.appendChild(section);
    }
  },
  escape(value = '') {
    return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  id(prefix = 'id') { return `${prefix}_${crypto.randomUUID()}`; },
  date(value = new Date()) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  },
  days: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],
  normalize(value) { return String(value).toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i'); }
};
