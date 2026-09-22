const UI = {
  collapseSections(container) {
    for (const section of container.querySelectorAll('.section, .import-card, [data-accordion-title]')) {
      if (section.dataset.collapsible === 'true' || section.closest('details.app-accordion')) continue;
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
