/* =============================================
   旅遊口袋名單 - 主要應用程式邏輯
   使用 Supabase SDK 操作資料庫
   ============================================= */

const TABLE = 'travel-spots';  // Supabase 資料表名稱

// ── Supabase Client ────────────────────────────
let sbClient = null;

function initSupabase() {
  if (!window.supabase || !window.SUPABASE_CONFIG) {
    console.error('❌ Supabase SDK 或 config.js 未載入');
    return false;
  }
  const { createClient } = window.supabase;
  sbClient = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
  console.log('🚀 Supabase 初始化成功');
  return true;
}

// ── State ──────────────────────────────────────
let allSpots  = [];
let editingId = null;
let currentRating = 0;
let viewMode  = 'grid';

// ── DOM refs ───────────────────────────────────
const spotsContainer = document.getElementById('spotsContainer');
const emptyState     = document.getElementById('emptyState');
const loadingState   = document.getElementById('loadingState');
const searchInput    = document.getElementById('searchInput');
const filterStatus   = document.getElementById('filterStatus');
const filterCategory = document.getElementById('filterCategory');
const filterPriority = document.getElementById('filterPriority');
const sortBy         = document.getElementById('sortBy');
const modalOverlay   = document.getElementById('modalOverlay');
const detailOverlay  = document.getElementById('detailOverlay');
const spotForm       = document.getElementById('spotForm');

// ── Utility ────────────────────────────────────
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast ${type} show`;
  setTimeout(() => { t.className = 'toast'; }, 3000);
}

function categoryEmoji(cat) {
  const map = {
    '自然風景': '🌿', '文化歷史': '🏛️', '美食': '🍜', '購物': '🛍️',
    '主題樂園': '🎡', '海灘': '🏖️', '山岳': '⛰️', '城市探索': '🏙️', '其他': '📌'
  };
  return map[cat] || '📍';
}

function priorityLabel(p) {
  const map = { '夢想清單': '⭐', '強烈想去': '🔥', '有機會去': '✅', '隨興': '💫' };
  return map[p] ? `${map[p]} ${p}` : p || '';
}

function statusLabel(s) {
  const map = { '未去': '🗺️', '計畫中': '📅', '已去': '✈️' };
  return map[s] ? `${map[s]} ${s}` : s || '';
}

function budgetLabel(b) {
  const map = { '$': '$ 便宜', '$$': '$$ 中等', '$$$': '$$$ 高消費', '$$$$': '$$$$ 奢華' };
  return map[b] || b || '';
}

function seasonLabel(s) {
  const map = { '春': '🌸 春', '夏': '☀️ 夏', '秋': '🍁 秋', '冬': '❄️ 冬', '全年': '🌍 全年' };
  return map[s] || s || '';
}

function starsHTML(rating, cls = 'card-rating') {
  let html = `<div class="${cls}">`;
  for (let i = 1; i <= 5; i++) {
    html += `<span class="s${i <= rating ? ' lit' : ''}">★</span>`;
  }
  return html + '</div>';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Fetch / Load ───────────────────────────────
async function loadSpots() {
  loadingState.style.display = 'flex';
  emptyState.style.display   = 'none';
  spotsContainer.innerHTML   = '';

  try {
    const { data, error } = await sbClient
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allSpots = data || [];
    renderAll();
    console.log(`✅ 載入 ${allSpots.length} 筆資料`);
  } catch (e) {
    console.error('載入失敗:', e);
    showToast('載入資料失敗，請重新整理', 'error');
  } finally {
    loadingState.style.display = 'none';
  }
}

// ── Render ─────────────────────────────────────
function getFiltered() {
  const q     = searchInput.value.trim().toLowerCase();
  const st    = filterStatus.value;
  const cat   = filterCategory.value;
  const pri   = filterPriority.value;
  const sort  = sortBy.value;

  let list = allSpots.filter(s => {
    const text = [s.name, s.country, s.city, s.notes, s.tags].join(' ').toLowerCase();
    if (q   && !text.includes(q))  return false;
    if (st  && s.status   !== st)  return false;
    if (cat && s.category !== cat) return false;
    if (pri && s.priority !== pri) return false;
    return true;
  });

  list = list.sort((a, b) => {
    switch (sort) {
      case 'created_at_asc':  return new Date(a.created_at) - new Date(b.created_at);
      case 'name_asc':        return (a.name || '').localeCompare(b.name || '');
      case 'country_asc':     return (a.country || '').localeCompare(b.country || '');
      case 'rating_desc':     return (b.rating || 0) - (a.rating || 0);
      default: /* created_at_desc */ return new Date(b.created_at) - new Date(a.created_at);
    }
  });
  return list;
}

function renderAll() {
  const list = getFiltered();
  updateStats();

  if (list.length === 0) {
    emptyState.style.display   = 'flex';
    spotsContainer.innerHTML   = '';
    return;
  }
  emptyState.style.display = 'none';
  spotsContainer.innerHTML = list.map(s => cardHTML(s)).join('');

  spotsContainer.querySelectorAll('.spot-card').forEach(card => {
    const id = parseInt(card.dataset.id);
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.card-action-btn')) openDetail(id);
    });
    const editBtn = card.querySelector('.btn-edit-card');
    if (editBtn) editBtn.addEventListener('click', (e) => { e.stopPropagation(); openEdit(id); });
    const delBtn  = card.querySelector('.btn-delete-card');
    if (delBtn)  delBtn.addEventListener('click', (e) => { e.stopPropagation(); confirmDelete(id); });
  });
}

function cardHTML(s) {
  const imageSection = s.image_url
    ? `<img class="card-image" src="${escapeHtml(s.image_url)}" alt="${escapeHtml(s.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
       + `<div class="card-image-placeholder" style="display:none">${categoryEmoji(s.category)}</div>`
    : `<div class="card-image-placeholder">${categoryEmoji(s.category)}</div>`;

  const tagsHTML = s.tags
    ? s.tags.split(',').filter(t => t.trim()).slice(0, 3)
        .map(t => `<span class="tag-chip">#${escapeHtml(t.trim())}</span>`).join('')
    : '';

  const notesPreview = s.notes ? `<div class="card-notes">${escapeHtml(s.notes)}</div>` : '';

  const budgetBadge = s.budget ? `<span class="badge badge-category">${s.budget}</span>` : '';
  const seasonBadge = s.best_season ? `<span class="badge badge-category">${seasonLabel(s.best_season)}</span>` : '';

  return `
<div class="spot-card${s.status === '已去' ? ' visited-card' : ''}" data-id="${s.id}">
  ${s.priority ? `<div class="priority-ribbon ribbon-${s.priority}">${priorityLabel(s.priority)}</div>` : ''}
  ${imageSection}
  <div class="card-body">
    <div class="card-top">
      <div class="card-name">${escapeHtml(s.name)}</div>
    </div>
    <div class="card-location">
      <i class="fas fa-map-marker-alt"></i>
      ${escapeHtml([s.city, s.country].filter(Boolean).join('・'))}
    </div>
    <div class="card-badges">
      <span class="badge badge-status-${s.status || '未去'}">${statusLabel(s.status || '未去')}</span>
      ${s.category ? `<span class="badge badge-category">${categoryEmoji(s.category)} ${escapeHtml(s.category)}</span>` : ''}
      ${budgetBadge}
      ${seasonBadge}
    </div>
    ${tagsHTML ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px">${tagsHTML}</div>` : ''}
    ${notesPreview}
    <div class="card-footer">
      ${starsHTML(s.rating || 0)}
      <div class="card-actions">
        <button class="card-action-btn btn-edit-card" title="編輯"><i class="fas fa-pen"></i></button>
        <button class="card-action-btn btn-delete-card" title="刪除"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  </div>
</div>`;
}

function updateStats() {
  document.getElementById('totalCount').textContent   = allSpots.length;
  document.getElementById('visitedCount').textContent = allSpots.filter(s => s.status === '已去').length;
  document.getElementById('planCount').textContent    = allSpots.filter(s => s.status === '計畫中').length;
}

// ── Modal: Add / Edit ──────────────────────────
function openAddModal() {
  editingId = null;
  currentRating = 0;
  spotForm.reset();
  document.getElementById('spotId').value = '';
  document.getElementById('fRating').value = 0;
  document.getElementById('modalTitle').textContent = '✨ 新增旅遊景點';
  renderStars(0);
  modalOverlay.classList.add('open');
}

function openEdit(id) {
  const s = allSpots.find(x => x.id === id);
  if (!s) return;
  editingId = id;
  currentRating = s.rating || 0;

  document.getElementById('modalTitle').textContent = '✏️ 編輯景點';
  document.getElementById('spotId').value       = s.id;
  document.getElementById('fName').value        = s.name || '';
  document.getElementById('fCountry').value     = s.country || '';
  document.getElementById('fCity').value        = s.city || '';
  document.getElementById('fCategory').value    = s.category || '';
  document.getElementById('fStatus').value      = s.status || '未去';
  document.getElementById('fPriority').value    = s.priority || '有機會去';
  document.getElementById('fBudget').value      = s.budget || '';
  document.getElementById('fSeason').value      = s.best_season || '';
  document.getElementById('fVisitedDate').value = s.visited_date || '';
  document.getElementById('fRating').value      = currentRating;
  document.getElementById('fTags').value        = s.tags || '';
  document.getElementById('fImageUrl').value    = s.image_url || '';
  document.getElementById('fSourceUrl').value   = s.source_url || '';
  document.getElementById('fNotes').value       = s.notes || '';

  renderStars(currentRating);
  modalOverlay.classList.add('open');
}

function closeModal() {
  modalOverlay.classList.remove('open');
  editingId = null;
}

// ── Save (Supabase) ────────────────────────────
async function saveSpot() {
  const name    = document.getElementById('fName').value.trim();
  const country = document.getElementById('fCountry').value.trim();
  if (!name || !country) { showToast('請填寫景點名稱與國家', 'error'); return; }

  const payload = {
    name,
    country,
    city:         document.getElementById('fCity').value.trim() || null,
    category:     document.getElementById('fCategory').value || null,
    status:       document.getElementById('fStatus').value || '未去',
    priority:     document.getElementById('fPriority').value || null,
    budget:       document.getElementById('fBudget').value || null,
    best_season:  document.getElementById('fSeason').value || null,
    visited_date: document.getElementById('fVisitedDate').value || null,
    rating:       parseInt(document.getElementById('fRating').value) || 0,
    tags:         document.getElementById('fTags').value.trim() || null,
    image_url:    document.getElementById('fImageUrl').value.trim() || null,
    source_url:   document.getElementById('fSourceUrl').value.trim() || null,
    notes:        document.getElementById('fNotes').value.trim() || null,
  };

  const btnSave = document.getElementById('btnSave');
  btnSave.disabled = true;
  btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 儲存中...';

  try {
    if (editingId) {
      // 更新
      const { data, error } = await sbClient
        .from(TABLE)
        .update(payload)
        .eq('id', editingId)
        .select()
        .single();

      if (error) throw error;
      allSpots = allSpots.map(s => s.id === editingId ? data : s);
      showToast('景點已更新 ✅', 'success');
    } else {
      // 新增
      const { data, error } = await sbClient
        .from(TABLE)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      allSpots.unshift(data);
      showToast('景點已新增 🎉', 'success');
    }
    closeModal();
    renderAll();
  } catch (e) {
    console.error('儲存失敗:', e);
    showToast(`儲存失敗：${e.message}`, 'error');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = '<i class="fas fa-save"></i> 儲存景點';
  }
}

// ── Delete (Supabase) ──────────────────────────
function confirmDelete(id) {
  const s = allSpots.find(x => x.id === id);
  if (!s) return;
  if (!confirm(`確定要刪除「${s.name}」嗎？\n此動作無法復原。`)) return;
  deleteSpot(id);
}

async function deleteSpot(id) {
  try {
    const { error } = await sbClient
      .from(TABLE)
      .delete()
      .eq('id', id);

    if (error) throw error;

    allSpots = allSpots.filter(s => s.id !== id);
    renderAll();
    showToast('景點已刪除', '');
    detailOverlay.classList.remove('open');
  } catch (e) {
    console.error('刪除失敗:', e);
    showToast('刪除失敗，請重試', 'error');
  }
}

// ── Detail View ────────────────────────────────
function openDetail(id) {
  const s = allSpots.find(x => x.id === id);
  if (!s) return;

  document.getElementById('detailName').textContent = s.name || '未命名';
  document.getElementById('detailLocation').textContent =
    [s.city, s.country].filter(Boolean).join('・');

  // Image
  const imgWrap = document.getElementById('detailImageWrap');
  if (s.image_url) {
    imgWrap.innerHTML = `<img src="${escapeHtml(s.image_url)}" alt="${escapeHtml(s.name)}" onerror="this.parentElement.innerHTML=''"/>`;
  } else {
    imgWrap.innerHTML = '';
  }

  // Meta
  const meta = document.getElementById('detailMeta');
  const metaItems = [
    s.status    && `<div class="detail-meta-item"><i class="fas fa-circle-dot"></i> ${statusLabel(s.status)}</div>`,
    s.category  && `<div class="detail-meta-item"><i class="fas fa-tag"></i> ${categoryEmoji(s.category)} ${s.category}</div>`,
    s.priority  && `<div class="detail-meta-item"><i class="fas fa-fire"></i> ${priorityLabel(s.priority)}</div>`,
    s.budget    && `<div class="detail-meta-item"><i class="fas fa-wallet"></i> ${budgetLabel(s.budget)}</div>`,
    s.best_season && `<div class="detail-meta-item"><i class="fas fa-sun"></i> ${seasonLabel(s.best_season)}</div>`,
    s.visited_date && `<div class="detail-meta-item"><i class="fas fa-calendar-check"></i> 拜訪：${s.visited_date}</div>`,
    s.rating    && starsHTML(s.rating, 'detail-meta-item'),
    s.source_url && `<div class="detail-meta-item"><a href="${escapeHtml(s.source_url)}" target="_blank" rel="noopener" style="color:var(--primary);text-decoration:none"><i class="fas fa-link"></i> 參考連結</a></div>`,
  ].filter(Boolean);
  meta.innerHTML = metaItems.join('');

  // Tags
  const existingTagsDiv = meta.nextElementSibling;
  if (existingTagsDiv && existingTagsDiv.classList.contains('detail-tags')) {
    existingTagsDiv.remove();
  }
  if (s.tags) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'detail-tags';
    tagsDiv.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px';
    tagsDiv.innerHTML = s.tags.split(',').filter(t => t.trim())
      .map(t => `<span class="tag-chip">#${escapeHtml(t.trim())}</span>`).join('');
    meta.after(tagsDiv);
  }

  // Notes
  const notesEl = document.getElementById('detailNotes');
  if (s.notes) {
    notesEl.style.display = 'block';
    notesEl.textContent = s.notes;
  } else {
    notesEl.style.display = 'none';
  }

  // Bind edit / delete
  document.getElementById('detailEditBtn').onclick   = () => { detailOverlay.classList.remove('open'); openEdit(id); };
  document.getElementById('detailDeleteBtn').onclick = () => { if (confirm(`確定要刪除「${s.name}」？`)) deleteSpot(id); };

  detailOverlay.classList.add('open');
}

// ── Star Rating ────────────────────────────────
function renderStars(val) {
  document.querySelectorAll('#starRating .star').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= val);
  });
}

document.getElementById('starRating').addEventListener('click', e => {
  if (e.target.classList.contains('star')) {
    currentRating = parseInt(e.target.dataset.val);
    document.getElementById('fRating').value = currentRating;
    renderStars(currentRating);
  }
});
document.getElementById('starRating').addEventListener('mouseover', e => {
  if (e.target.classList.contains('star')) {
    const hv = parseInt(e.target.dataset.val);
    document.querySelectorAll('#starRating .star').forEach(s => {
      s.classList.toggle('hover', parseInt(s.dataset.val) <= hv);
    });
  }
});
document.getElementById('starRating').addEventListener('mouseleave', () => {
  document.querySelectorAll('#starRating .star').forEach(s => s.classList.remove('hover'));
});

// ── View Toggle ────────────────────────────────
document.getElementById('viewGrid').addEventListener('click', () => {
  viewMode = 'grid';
  spotsContainer.classList.remove('list-view');
  document.getElementById('viewGrid').classList.add('active');
  document.getElementById('viewList').classList.remove('active');
});
document.getElementById('viewList').addEventListener('click', () => {
  viewMode = 'list';
  spotsContainer.classList.add('list-view');
  document.getElementById('viewList').classList.add('active');
  document.getElementById('viewGrid').classList.remove('active');
});

// ── Filters / Search ───────────────────────────
let searchTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderAll, 300);
});
filterStatus.addEventListener('change',   renderAll);
filterCategory.addEventListener('change', renderAll);
filterPriority.addEventListener('change', renderAll);
sortBy.addEventListener('change',         renderAll);

// ── Modal buttons ──────────────────────────────
document.getElementById('btnOpenAdd').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
document.getElementById('btnSave').addEventListener('click', saveSpot);
document.getElementById('detailClose').addEventListener('click', () => detailOverlay.classList.remove('open'));

modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
detailOverlay.addEventListener('click', e => { if (e.target === detailOverlay) detailOverlay.classList.remove('open'); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    detailOverlay.classList.remove('open');
  }
});

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (initSupabase()) {
    loadSpots();
  } else {
    showToast('初始化失敗，請檢查 config.js', 'error');
    loadingState.style.display = 'none';
  }
});
