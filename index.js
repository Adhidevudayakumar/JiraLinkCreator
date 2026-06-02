'use strict';

const jiraBaseInput = document.getElementById('jiraBase');
const csvFile      = document.getElementById('csvFile');
const dropZone     = document.getElementById('dropZone');
const fileName     = document.getElementById('fileName');
const generateBtn  = document.getElementById('generateBtn');
const copyBtn      = document.getElementById('copyBtn');
const inlineMsg    = document.getElementById('inlineMsg');
const results      = document.getElementById('results');
const countBadge   = document.getElementById('countBadge');
const linksList    = document.getElementById('linksList');

let clipboardPayload = null;

// ── File input ────────────────────────────────────────────────────────────────

csvFile.addEventListener('change', () => {
  const file = csvFile.files[0];
  if (file) setFileName(file.name);
});

// ── Drag and drop ─────────────────────────────────────────────────────────────

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('active');
});

dropZone.addEventListener('dragleave', (e) => {
  if (!dropZone.contains(e.relatedTarget)) {
    dropZone.classList.remove('active');
  }
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('active');

  const file = e.dataTransfer?.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith('.csv')) {
    showMsg('Only .csv files are accepted.', 'error');
    return;
  }

  const dt = new DataTransfer();
  dt.items.add(file);
  csvFile.files = dt.files;
  setFileName(file.name);
});

// ── Buttons ───────────────────────────────────────────────────────────────────

generateBtn.addEventListener('click', handleGenerate);
copyBtn.addEventListener('click', handleCopy);

// ── Helpers ───────────────────────────────────────────────────────────────────

function setFileName(name) {
  fileName.textContent = `✓  ${name}`;
  fileName.style.display = 'block';
}

function showMsg(text, type) {
  inlineMsg.textContent = text;
  inlineMsg.className = `inline-msg ${type}`;
  inlineMsg.style.display = 'block';
}

function clearMsg() {
  inlineMsg.style.display = 'none';
}

// Sort PROJ-123 by project name then by number
function compareTicketIds(a, b) {
  const ai = a.lastIndexOf('-');
  const bi = b.lastIndexOf('-');
  const projA = a.slice(0, ai);
  const projB = b.slice(0, bi);
  if (projA !== projB) return projA.localeCompare(projB);
  return parseInt(a.slice(ai + 1), 10) - parseInt(b.slice(bi + 1), 10);
}

// ── Generate ──────────────────────────────────────────────────────────────────

function handleGenerate() {
  clearMsg();
  clipboardPayload = null;
  copyBtn.disabled = true;
  results.style.display = 'none';

  const base = jiraBaseInput.value.trim();

  if (!base) {
    showMsg('Please enter a Jira base URL.', 'error');
    return;
  }

  if (!csvFile.files.length) {
    showMsg('Please select a CSV file first.', 'error');
    return;
  }

  const reader = new FileReader();

  reader.onload = ({ target }) => {
    const text   = target.result;
    const unique = [...new Set(text.match(/[A-Z]+-\d+/g) ?? [])].sort(compareTicketIds);
    const baseUrl = base.endsWith('/') ? base : base + '/';

    countBadge.textContent = `${unique.length} ticket${unique.length !== 1 ? 's' : ''}`;
    results.style.display = 'block';

    if (unique.length === 0) {
      linksList.innerHTML = '<div class="empty-msg">No Jira ticket IDs found in this file.</div>';
      return;
    }

    linksList.innerHTML = unique
      .map(id => `<div class="link-row"><a href="${baseUrl}${id}" target="_blank" rel="noopener">${id}</a></div>`)
      .join('');

    clipboardPayload = unique
      .map(id => `<a href="${baseUrl}${id}">${id}</a>`)
      .join('<br>\n');

    copyBtn.disabled = false;
  };

  reader.onerror = () => showMsg('Failed to read the file. Please try again.', 'error');
  reader.readAsText(csvFile.files[0]);
}

// ── Copy ──────────────────────────────────────────────────────────────────────

async function handleCopy() {
  if (!clipboardPayload) return;

  try {
    const blob = new Blob([clipboardPayload], { type: 'text/html' });
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
    showMsg('✓  Rich links copied to clipboard!', 'success');
  } catch {
    showMsg('Copy failed — page must be served over HTTPS or localhost.', 'error');
  }
}
