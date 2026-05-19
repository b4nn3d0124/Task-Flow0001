// ── Data ──
const CATEGORIES = [
  { id: 'work', label: 'Work', color: '#e8a634', icon: 'fa-briefcase' },
  { id: 'personal', label: 'Personal', color: '#a78bfa', icon: 'fa-user' },
  { id: 'design', label: 'Design', color: '#f472b6', icon: 'fa-palette' },
  { id: 'development', label: 'Development', color: '#60b5e8', icon: 'fa-code' },
  { id: 'marketing', label: 'Marketing', color: '#4ade80', icon: 'fa-bullhorn' }
];

// Seed data for first-time visitors
const SEED_TASKS = [
  { id: genId(), title: 'Redesign landing page hero section', desc: 'Update the hero with new brand guidelines, add animated gradient background and revised copy.', priority: 'high', category: 'design', status: 'progress', due: getFutureDate(2), created: Date.now() },
  { id: genId(), title: 'Set up CI/CD pipeline for staging', desc: 'Configure GitHub Actions for automated deployment to staging environment on merge to develop branch.', priority: 'urgent', category: 'development', status: 'todo', due: getFutureDate(1), created: Date.now() },
  { id: genId(), title: 'Write Q4 marketing campaign brief', desc: 'Outline goals, target audience, channels, budget allocation, and timeline for the holiday campaign.', priority: 'medium', category: 'marketing', status: 'todo', due: getFutureDate(5), created: Date.now() },
  { id: genId(), title: 'Fix navigation accessibility issues', desc: 'Add proper ARIA labels, keyboard navigation support, and focus management for the main nav dropdowns.', priority: 'high', category: 'development', status: 'todo', due: getFutureDate(3), created: Date.now() },
  { id: genId(), title: 'Book dentist appointment', desc: 'Schedule a routine checkup. Prefer morning slots.', priority: 'low', category: 'personal', status: 'done', due: getPastDate(1), created: Date.now() },
  { id: genId(), title: 'Create component library documentation', desc: 'Document all reusable components with props, usage examples, and accessibility notes.', priority: 'medium', category: 'development', status: 'progress', due: getFutureDate(7), created: Date.now() },
  { id: genId(), title: 'Prepare weekly team standup notes', desc: 'Compile blockers, progress updates, and priorities for Monday standup.', priority: 'low', category: 'work', status: 'done', due: getPastDate(2), created: Date.now() },
  { id: genId(), title: 'Design email template for product launch', desc: 'Create a responsive HTML email template following the new brand guidelines.', priority: 'medium', category: 'design', status: 'todo', due: getFutureDate(4), created: Date.now() },
];

function genId() { return 'task_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }
function getFutureDate(d) { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0]; }
function getPastDate(d) { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt.toISOString().split('T')[0]; }

let tasks = [];
let currentView = 'board';
let currentFilter = 'all';
let draggedTaskId = null;

// ── Local Storage ──
function loadTasks() {
  const stored = localStorage.getItem('taskflow_tasks');
  if (stored) {
    try { tasks = JSON.parse(stored); } catch { tasks = [...SEED_TASKS]; }
  } else {
    tasks = [...SEED_TASKS];
  }
}
function saveTasks() {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
}

// ── Toast ──
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const iconMap = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
  const colorMap = { success: 'var(--success)', error: 'var(--danger)', info: 'var(--info)' };
  toast.className = 'toast';
  toast.style.cssText = `background:var(--bg-raised);border:1px solid var(--border);border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:10px;font-size:13px;box-shadow:0 8px 32px rgba(0,0,0,0.4);min-width:250px;`;
  toast.innerHTML = `<i class="fa-solid ${iconMap[type]}" style="color:${colorMap[type]};font-size:16px;"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 2800);
}

// ── Views ──
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.sidebar-item[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
    el.style.color = el.dataset.view === view ? 'var(--accent)' : 'var(--fg-muted)';
  });
  document.getElementById('boardView').style.display = view === 'board' ? '' : 'none';
  document.getElementById('listView').style.display = view === 'list' ? '' : 'none';
  document.getElementById('statsView').style.display = view === 'stats' ? '' : 'none';
  document.getElementById('filterChips').style.display = view === 'stats' ? 'none' : 'flex';
  renderCurrentView();
}

function renderCurrentView() {
  if (currentView === 'board') renderBoard();
  else if (currentView === 'list') renderList();
  else if (currentView === 'stats') renderStats();
  updateSidebar();
  updateProgress();
}

// ── Filtering ──
function getFilteredTasks() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  return tasks.filter(t => {
    if (currentFilter !== 'all' && t.priority !== currentFilter) return false;
    if (search && !t.title.toLowerCase().includes(search) && !t.desc.toLowerCase().includes(search)) return false;
    return true;
  });
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.filter === filter);
  });
  renderCurrentView();
}

// ── Board ──
function renderBoard() {
  const filtered = getFilteredTasks();
  const statuses = ['todo', 'progress', 'done'];
  const countEls = { todo: 'countTodo', progress: 'countProgress', done: 'countDone' };
  const colEls = { todo: 'col-todo', progress: 'col-progress', done: 'col-done' };

  statuses.forEach(status => {
    const statusTasks = filtered.filter(t => t.status === status);
    document.getElementById(countEls[status]).textContent = statusTasks.length;
    const col = document.getElementById(colEls[status]);
    if (statusTasks.length === 0) {
      col.innerHTML = `<div class="empty-state"><i class="fa-solid fa-inbox" style="font-size:28px;margin-bottom:10px;opacity:0.3;"></i><p style="font-size:13px;">No tasks here</p></div>`;
    } else {
      col.innerHTML = statusTasks.map(t => renderTaskCard(t)).join('');
    }
  });
}

function renderTaskCard(task) {
  const cat = CATEGORIES.find(c => c.id === task.category) || CATEGORIES[0];
  const dueStr = task.due ? formatDue(task.due) : '';
  const isOverdue = task.due && task.status !== 'done' && new Date(task.due) < new Date(new Date().toISOString().split('T')[0]);
  return `
    <div class="task-card" data-priority="${task.priority}" draggable="true"
         ondragstart="handleDragStart(event,'${task.id}')" ondragend="handleDragEnd(event)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <span class="priority-badge priority-${task.priority}">${task.priority}</span>
        <div style="display:flex;gap:4px;">
          <button onclick="editTask('${task.id}')" style="background:none;border:none;color:var(--fg-muted);cursor:pointer;padding:4px;font-size:12px;border-radius:4px;transition:color 0.2s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--fg-muted)'"><i class="fa-solid fa-pen"></i></button>
          <button onclick="confirmDelete('${task.id}')" style="background:none;border:none;color:var(--fg-muted);cursor:pointer;padding:4px;font-size:12px;border-radius:4px;transition:color 0.2s;" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--fg-muted)'"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
      <h4 style="font-size:14px;font-weight:600;margin-bottom:6px;line-height:1.4;${task.status === 'done' ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escHtml(task.title)}</h4>
      ${task.desc ? `<p style="font-size:12px;color:var(--fg-muted);line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escHtml(task.desc)}</p>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="category-dot cat-${task.category}"></span>
          <span style="font-size:11px;color:var(--fg-muted);">${cat.label}</span>
        </div>
        ${dueStr ? `<span style="font-size:11px;color:${isOverdue ? 'var(--danger)' : 'var(--fg-muted)'};display:flex;align-items:center;gap:4px;"><i class="fa-regular fa-calendar" style="font-size:10px;"></i>${dueStr}</span>` : ''}
      </div>
    </div>`;
}

// ── List ──
function renderList() {
  const filtered = getFilteredTasks();
  const container = document.getElementById('listContainer');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:60px 20px;"><i class="fa-solid fa-search" style="font-size:32px;margin-bottom:12px;opacity:0.3;"></i><p style="font-size:14px;">No tasks match your filters</p></div>`;
    return;
  }
  // Sort: urgent first, then by due date
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) return priorityOrder[a.priority] - priorityOrder[b.priority];
    if (a.due && b.due) return new Date(a.due) - new Date(b.due);
    if (a.due) return -1;
    return 1;
  });

  container.innerHTML = sorted.map(t => {
    const cat = CATEGORIES.find(c => c.id === t.category) || CATEGORIES[0];
    const isDone = t.status === 'done';
    const isOverdue = t.due && !isDone && new Date(t.due) < new Date(new Date().toISOString().split('T')[0]);
    return `
      <div class="list-task" draggable="true" ondragstart="handleDragStart(event,'${t.id}')" ondragend="handleDragEnd(event)">
        <div class="custom-checkbox ${isDone ? 'checked' : ''}" onclick="toggleDone('${t.id}')">
          <i class="fa-solid fa-check"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:14px;font-weight:500;${isDone ? 'text-decoration:line-through;opacity:0.5;' : ''}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(t.title)}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <span class="priority-badge priority-${t.priority}" style="font-size:9px;">${t.priority}</span>
            <span style="font-size:11px;color:var(--fg-muted);display:flex;align-items:center;gap:4px;"><span class="category-dot cat-${t.category}"></span>${cat.label}</span>
            ${t.due ? `<span style="font-size:11px;color:${isOverdue ? 'var(--danger)' : 'var(--fg-muted)'};"><i class="fa-regular fa-calendar" style="font-size:9px;margin-right:3px;"></i>${formatDue(t.due)}</span>` : ''}
          </div>
        </div>
        <div style="display:flex;gap:4px;">
          <button onclick="editTask('${t.id}')" style="background:none;border:none;color:var(--fg-muted);cursor:pointer;padding:6px;border-radius:6px;transition:all 0.2s;font-size:13px;" onmouseover="this.style.color='var(--accent)';this.style.background='var(--accent-glow)'" onmouseout="this.style.color='var(--fg-muted)';this.style.background='transparent'"><i class="fa-solid fa-pen"></i></button>
          <button onclick="confirmDelete('${task.id}' || '${t.id}')" style="background:none;border:none;color:var(--fg-muted);cursor:pointer;padding:6px;border-radius:6px;transition:all 0.2s;font-size:13px;" onmouseover="this.style.color='var(--danger)';this.style.background='rgba(224,82,82,0.1)'" onmouseout="this.style.color='var(--fg-muted)';this.style.background='transparent'"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
  }).join('');
}

function toggleDone(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === 'done' ? 'todo' : 'done';
  saveTasks();
  renderCurrentView();
  showToast(task.status === 'done' ? 'Task completed!' : 'Task reopened', task.status === 'done' ? 'success' : 'info');
}

// ── Drag & Drop ──
function handleDragStart(e, id) {
  draggedTaskId = id;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}
function handleDragEnd(e) {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.kanban-column').forEach(c => c.classList.remove('drag-over'));
  draggedTaskId = null;
}
function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.classList.add('drag-over');
}
function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const newStatus = e.currentTarget.dataset.status;
  if (!draggedTaskId || !newStatus) return;
  const task = tasks.find(t => t.id === draggedTaskId);
  if (task && task.status !== newStatus) {
    task.status = newStatus;
    saveTasks();
    renderCurrentView();
    const statusLabels = { todo: 'To Do', progress: 'In Progress', done: 'Done' };
    showToast(`Moved to ${statusLabels[newStatus]}`, 'info');
  }
}

// ── Stats ──
function renderStats() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const todo = tasks.filter(t => t.status === 'todo').length;
  const progress = tasks.filter(t => t.status === 'progress').length;
  const overdue = tasks.filter(t => t.due && t.status !== 'done' && new Date(t.due) < new Date(new Date().toISOString().split('T')[0])).length;
  const urgent = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length;

  const stats = [
    { label: 'Total Tasks', value: total, icon: 'fa-layer-group', color: 'var(--fg)' },
    { label: 'Completed', value: done, icon: 'fa-circle-check', color: 'var(--success)' },
    { label: 'In Progress', value: progress, icon: 'fa-spinner', color: 'var(--accent)' },
    { label: 'To Do', value: todo, icon: 'fa-clock', color: 'var(--fg-muted)' },
    { label: 'Overdue', value: overdue, icon: 'fa-exclamation-triangle', color: 'var(--danger)' },
    { label: 'Urgent', value: urgent, icon: 'fa-fire', color: 'var(--urgent)' },
  ];

  document.getElementById('statsGrid').innerHTML = stats.map(s => `
    <div class="stat-card">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:${s.color}15;display:flex;align-items:center;justify-content:center;">
          <i class="fa-solid ${s.icon}" style="color:${s.color};font-size:16px;"></i>
        </div>
        <div>
          <div style="font-size:22px;font-weight:700;font-family:'Space Grotesk',sans-serif;">${s.value}</div>
          <div style="font-size:12px;color:var(--fg-muted);">${s.label}</div>
        </div>
      </div>
    </div>`).join('');

  drawPriorityChart();
  drawCategoryChart();
}

function drawPriorityChart() {
  const canvas = document.getElementById('priorityChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  const priorities = ['urgent', 'high', 'medium', 'low'];
  const colors = ['#ff6b6b', '#e8a634', '#60b5e8', '#4ade80'];
  const counts = priorities.map(p => tasks.filter(t => t.priority === p).length);
  const maxVal = Math.max(...counts, 1);
  const barWidth = 36;
  const gap = (w - priorities.length * barWidth) / (priorities.length + 1);
  const chartH = h - 40;

  counts.forEach((count, i) => {
    const x = gap + i * (barWidth + gap);
    const barH = (count / maxVal) * (chartH - 20);
    const y = chartH - barH;

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(x, 20, barWidth, chartH - 20, 6);
    ctx.fill();

    // Bar fill
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barH, 6);
    ctx.fill();

    // Count
    ctx.fillStyle = '#f0ece4';
    ctx.font = '600 13px "Space Grotesk"';
    ctx.textAlign = 'center';
    ctx.fillText(count, x + barWidth / 2, y - 8);

    // Label
    ctx.fillStyle = '#8a8778';
    ctx.font = '500 11px "DM Sans"';
    ctx.fillText(priorities[i].charAt(0).toUpperCase() + priorities[i].slice(1), x + barWidth / 2, h - 8);
  });
}

function drawCategoryChart() {
  const canvas = document.getElementById('categoryChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = canvas.offsetWidth, h = canvas.offsetHeight;
  ctx.clearRect(0, 0, w, h);

  const counts = CATEGORIES.map(c => tasks.filter(t => t.category === c.id).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const cx = w / 2, cy = h / 2 - 10;
  const outerR = Math.min(w, h) / 2 - 30;
  const innerR = outerR * 0.55;

  let startAngle = -Math.PI / 2;
  counts.forEach((count, i) => {
    const slice = (count / total) * Math.PI * 2;
    if (count === 0) { startAngle += slice; return; }
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = CATEGORIES[i].color;
    ctx.fill();
    startAngle += slice;
  });

  // Center text
  ctx.fillStyle = '#f0ece4';
  ctx.font = '700 22px "Space Grotesk"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total, cx, cy - 6);
  ctx.fillStyle = '#8a8778';
  ctx.font = '400 11px "DM Sans"';
  ctx.fillText('total tasks', cx, cy + 14);

  // Legend
  const legendY = h - 12;
  const legendWidth = CATEGORIES.length * 70;
  const legendStart = (w - legendWidth) / 2;
  CATEGORIES.forEach((cat, i) => {
    const x = legendStart + i * 70 + 10;
    ctx.fillStyle = cat.color;
    ctx.beginPath();
    ctx.arc(x, legendY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a8778';
    ctx.font = '400 10px "DM Sans"';
    ctx.textAlign = 'left';
    ctx.fillText(cat.label, x + 8, legendY + 3);
  });
}

// ── Sidebar ──
function updateSidebar() {
  const container = document.getElementById('sidebarCategories');
  container.innerHTML = CATEGORIES.map(cat => {
    const count = tasks.filter(t => t.category === cat.id && t.status !== 'done').length;
    return `
      <div style="padding:8px 16px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--fg-muted);cursor:default;">
        <span class="category-dot cat-${cat.id}"></span>
        <span style="flex:1;">${cat.label}</span>
        <span style="font-size:11px;opacity:0.6;">${count}</span>
      </div>`;
  }).join('');
}

function updateProgress() {
  const total = tasks.length;
  const done = tasks.filter(t => t.status === 'done').length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('progressPercent').textContent = pct + '%';
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressCount').textContent = `${done} of ${total} completed`;
}

// ── Modal ──
function openModal(taskId = null) {
  const modal = document.getElementById('taskModal');
  const form = document.getElementById('taskForm');
  form.reset();
  document.getElementById('taskId').value = '';

  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('modalSubmitBtn').textContent = 'Save Changes';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.desc;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskDue').value = task.due || '';
  } else {
    document.getElementById('modalTitle').textContent = 'New Task';
    document.getElementById('modalSubmitBtn').textContent = 'Create Task';
  }

  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeModal() {
  document.getElementById('taskModal').style.display = 'none';
}

function handleTaskSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('taskId').value;
  const data = {
    title: document.getElementById('taskTitle').value.trim(),
    desc: document.getElementById('taskDesc').value.trim(),
    priority: document.getElementById('taskPriority').value,
    category: document.getElementById('taskCategory').value,
    status: document.getElementById('taskStatus').value,
    due: document.getElementById('taskDue').value || null,
  };

  if (!data.title) return;

  if (id) {
    const task = tasks.find(t => t.id === id);
    if (task) Object.assign(task, data);
    showToast('Task updated successfully', 'success');
  } else {
    tasks.push({ id: genId(), ...data, created: Date.now() });
    showToast('Task created successfully', 'success');
  }

  saveTasks();
  closeModal();
  renderCurrentView();
}

function editTask(id) {
  openModal(id);
}

// ── Delete ──
let pendingDeleteId = null;
function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').style.display = 'flex';
}
function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').style.display = 'none';
}
document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
  if (pendingDeleteId) {
    tasks = tasks.filter(t => t.id !== pendingDeleteId);
    saveTasks();
    renderCurrentView();
    showToast('Task deleted', 'error');
  }
  closeDeleteModal();
});

// ── Helpers ──
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDue(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < -1) return `${Math.abs(diff)}d overdue`;
  if (diff <= 7) return `In ${diff}d`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Close modals on overlay click ──
document.getElementById('taskModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('deleteModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDeleteModal();
});

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openModal();
  }
});

// ── Init ──
loadTasks();
renderCurrentView();
