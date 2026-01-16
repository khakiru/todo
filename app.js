// Common JS for all pages
let sections = JSON.parse(localStorage.getItem('sections')) || [];

// ------------------- HOME PAGE -------------------
function renderHomeSections() {
  const container = document.getElementById('sectionsContainer');
  if (!container) return;

  container.innerHTML = '';
  sections.forEach((section, index) => {
    const card = document.createElement('div');
    card.className = 'section-card';

    // Apply the section color dynamically
    card.style.borderLeft = `8px solid ${section.color || '#2196F3'}`;

    const total = section.tasks.length;
    const completed = section.tasks.filter(t => t.completed).length;
    const progressPercent = total ? Math.round((completed / total) * 100) : 0;

    card.innerHTML = `
      <div class="section-header">
        <h2>${section.name}</h2>
      </div>
      <div class="progress-container">
        <div class="progress-bar" style="width:${progressPercent}%; background:${section.color || '#2196F3'}"></div>
      </div>
      <div class="section-stats">
        <p>${completed}/${total} completed</p>
      </div>
    `;

    // Make the entire card clickable
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => openSection(index));

    container.appendChild(card);
  });
}

function addSection() {
  const name = document.getElementById('newSectionInput').value.trim();
  const color = document.getElementById('newSectionColor').value;
  if (!name) return;

  sections.push({ name, color, tasks: [] });
  localStorage.setItem('sections', JSON.stringify(sections));
  document.getElementById('newSectionInput').value = '';
  renderHomeSections();
}

function openSection(index) {
  location.href = `section.html?index=${index}`;
}

// ------------------- SECTION PAGE -------------------
function renderSectionPage() {
  const params = new URLSearchParams(location.search);
  const index = parseInt(params.get('index'));
  if (isNaN(index) || !sections[index]) return alert('Section not found');

  const section = sections[index];
  const titleElem = document.getElementById('sectionTitle');
  if (titleElem) titleElem.textContent = section.name;

  const content = document.getElementById('sectionContent');
  if (!content) return;

  content.innerHTML = `
    <div class="progress-container" id="progress-${index}">
      <div class="progress-bar" style="background:${section.color || '#2196F3'}"></div>
    </div>
    <h3>Active Tasks</h3>
    <ul id="active-${index}"></ul>
    <h3>Completed Tasks</h3>
    <ul id="completed-${index}"></ul>
    <div class="task-inputs">
      <input type="text" id="task-input-${index}" placeholder="New Task">
      <input type="datetime-local" id="due-input-${index}">
      <button onclick="addTask(${index})">Add</button>
      <button class="clear-completed" onclick="clearCompleted(${index})">Clear Completed</button>
    </div>
  `;

  const activeUl = document.getElementById(`active-${index}`);
  if (activeUl) {
    activeUl.addEventListener('dragover', e => { e.preventDefault(); activeUl.classList.add('drag-over'); });
    activeUl.addEventListener('dragleave', e => activeUl.classList.remove('drag-over'));
    activeUl.addEventListener('drop', e => {
      e.preventDefault();
      activeUl.classList.remove('drag-over');
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      moveTask(data.taskId, data.fromSectionIndex, index);
    });
  }

  renderTasks(index);
  updateSectionProgress(index);
}

// ------------------- TASK FUNCTIONS -------------------
function addTask(sectionIndex) {
  const taskInput = document.getElementById(`task-input-${sectionIndex}`);
  const dueInput = document.getElementById(`due-input-${sectionIndex}`);
  if (!taskInput) return;

  const text = taskInput.value.trim();
  if (!text) return;

  const task = {
    id: Date.now(),
    text,
    due: dueInput && dueInput.value ? new Date(dueInput.value).getTime() : null,
    completed: false
  };

  sections[sectionIndex].tasks.push(task);
  localStorage.setItem('sections', JSON.stringify(sections));
  if (taskInput) taskInput.value = '';
  if (dueInput) dueInput.value = '';
  renderTasks(sectionIndex);

  if (task.due) scheduleNotification(task);
}

function renderTasks(sectionIndex) {
  const section = sections[sectionIndex];
  const activeUl = document.getElementById(`active-${sectionIndex}`);
  const completedUl = document.getElementById(`completed-${sectionIndex}`);
  if (!activeUl || !completedUl) return;

  activeUl.innerHTML = '';
  completedUl.innerHTML = '';

  const activeTasks = section.tasks.filter(t => !t.completed).sort((a, b) => (a.due || Infinity) - (b.due || Infinity));
  const completedTasks = section.tasks.filter(t => t.completed);

  activeTasks.forEach(t => renderTask(t, sectionIndex, activeUl));
  completedTasks.forEach(t => renderTask(t, sectionIndex, completedUl));
}

function renderTask(task, sectionIndex, container) {
  const li = document.createElement('li');
  li.id = `task-${task.id}`;
  li.setAttribute('draggable', true);

  li.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, fromSectionIndex: sectionIndex }));
  });

  li.innerHTML = `
    <input type="checkbox" onchange="toggleCompleted(${sectionIndex},${task.id})" ${task.completed ? 'checked' : ''}>
    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
    ${task.completed ? '' : `<span class="countdown" id="count-${task.id}">${task.due ? new Date(task.due).toLocaleString() : 'No due'}</span>`}
    <button onclick="deleteTask(${sectionIndex},${task.id})">Delete</button>
  `;
  container.appendChild(li);
}

function toggleCompleted(sectionIndex, taskId) {
  const task = sections[sectionIndex].tasks.find(t => t.id === taskId);
  if (!task) return;
  task.completed = !task.completed;
  localStorage.setItem('sections', JSON.stringify(sections));
  renderTasks(sectionIndex);
}

function deleteTask(sectionIndex, taskId) {
  sections[sectionIndex].tasks = sections[sectionIndex].tasks.filter(t => t.id !== taskId);
  localStorage.setItem('sections', JSON.stringify(sections));
  renderTasks(sectionIndex);
}

function clearCompleted(sectionIndex) {
  sections[sectionIndex].tasks = sections[sectionIndex].tasks.filter(t => !t.completed);
  localStorage.setItem('sections', JSON.stringify(sections));
  renderTasks(sectionIndex);
}

// ------------------- DRAG & DROP -------------------
function moveTask(taskId, fromSectionIndex, toSectionIndex) {
  if (fromSectionIndex === toSectionIndex) return;
  const from = sections[fromSectionIndex];
  const to = sections[toSectionIndex];
  const idx = from.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return;
  const [task] = from.tasks.splice(idx, 1);
  to.tasks.push(task);
  localStorage.setItem('sections', JSON.stringify(sections));
  renderTasks(fromSectionIndex);
  renderTasks(toSectionIndex);
}

// ------------------- COUNTDOWN & URGENT -------------------
function updateCountdowns() {
  const now = Date.now();
  sections.forEach((section, sectionIndex) => {
    section.tasks.forEach(task => {
      const elem = document.getElementById(`count-${task.id}`);
      if (!elem || task.completed || !task.due) return;

      const timeLeft = task.due - now;
      const li = elem.parentElement;

      if (timeLeft <= 0) {
        elem.textContent = 'Expired';
        li.classList.add('expired');
      } else {
        const h = Math.floor(timeLeft / (1000 * 60 * 60));
        const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((timeLeft % (1000 * 60)) / 1000);
        elem.textContent = `${h}h ${m}m ${s}s left`;

        if (timeLeft <= 60 * 60 * 1000) li.classList.add('urgent');
        else li.classList.remove('urgent');
      }
    });
    updateSectionProgress(sectionIndex);
  });
  setTimeout(updateCountdowns, 1000);
}

// ------------------- SECTION PROGRESS -------------------
function updateSectionProgress(sectionIndex) {
  const section = sections[sectionIndex];
  const total = section.tasks.length;
  const completed = section.tasks.filter(t => t.completed).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const bar = document.getElementById(`progress-${sectionIndex}`)?.querySelector('.progress-bar');
  if (bar) bar.style.width = `${percent}%`;
}

// ------------------- NOTIFICATIONS -------------------
function requestNotifications() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then(p => {
      if (p === 'granted') {
        navigator.serviceWorker.register('/sw.js');
        alert('Notifications enabled!');
      }
    });
  } else alert('Browser does not support notifications.');
}

function scheduleNotification(task) {
  const delay = Math.max(5000, task.due - Date.now() - 60000);
  setTimeout(() => {
    if (!task.completed && Notification.permission === 'granted') {
      new Notification('Todo Reminder', { body: task.text, icon: 'icon-192.png' });
    }
  }, delay);
}

// ------------------- RESET APP -------------------
function resetApp() {
  if (confirm('Delete all sections and tasks?')) {
    sections = [];
    localStorage.setItem('sections', JSON.stringify(sections));
    location.href = 'index.html';
  }
}

// ------------------- SERVICE WORKER -------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); });
}

function toggleMenu() {
  const links = document.querySelector('.nav-links');
  links.classList.toggle('active');
}

function deleteSection() {
  const sectionName = document.getElementById('sectionTitle').textContent;
  if (confirm(`Are you sure you want to delete the section "${sectionName}"? This will remove all tasks.`)) {
    // Remove the section from localStorage or data
    // Redirect back to home
    location.href = 'index.html';
  }
}