// Estado global
let undoStack = [];
let redoStack = [];
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentFilter = "todas";
let draggedTaskId = null;
let editingTask = null;
let editingRow = null;

// Elementos del DOM
const form = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const filters = document.querySelectorAll(".filter-buttons button");
const undoButton = document.getElementById("undoButton");
const redoButton = document.getElementById("redoButton");
const taskText = document.getElementById("taskText");
const taskDate = document.getElementById("taskDate");
const taskPriority = document.getElementById("taskPriority");
const themeToggle = document.getElementById("themeToggle");
const editModal = document.getElementById("editModal");
const editTaskText = document.getElementById("editTaskText");
const editTaskDate = document.getElementById("editTaskDate");
const editTaskPriority = document.getElementById("editTaskPriority");
const saveButton = editModal.querySelector('.save');
const cancelButton = editModal.querySelector('.cancel');

// Event Listeners
form.addEventListener("submit", handleFormSubmit);
filters.forEach(btn => btn.addEventListener("click", handleFilterClick));
taskList.addEventListener("click", handleTaskClick);
taskList.addEventListener("dragstart", handleDragStart);
taskList.addEventListener("dragover", handleDragOver);
taskList.addEventListener("drop", handleDrop);
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
themeToggle.addEventListener("change", toggleTheme);

// Funciones principales
function handleFormSubmit(e) {
  e.preventDefault();
  const text = taskText.value.trim();
  const date = taskDate.value;
  const priority = taskPriority.value;

  if (!text) return;

  if (!isValidDate(date)) {
    alert('¡Fecha inválida! La fecha debe ser futura.');
    return;
  }

  saveState();
  const newTask = {
    id: Date.now(),
    text,
    date,
    priority,
    completed: false
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();
  form.reset();
}

function handleFilterClick(e) {
  currentFilter = e.target.dataset.filter;
  filters.forEach(btn => btn.classList.toggle("active", btn === e.target));
  renderTasks();
}

function handleTaskClick(e) {
  const row = e.target.closest("tr");
  if (!row) return;
  const id = Number(row.dataset.id);
  const task = tasks.find(t => t.id === id);

  if (e.target.matches(".delete")) {
    handleDeleteTask(row, id);
  } else if (e.target.matches("input[type='checkbox']")) {
    handleToggleComplete(row, id);
  } else if (e.target.matches(".edit")) {
    startEditing(row, task);
  }
}

// Funciones de edición
function startEditing(row, task) {
  editingTask = task;
  editingRow = row;
  
  // Mostrar el modal
  editModal.classList.add('active');
  
  // Cargar los valores actuales
  editTaskText.value = task.text;
  editTaskDate.value = task.date;
  editTaskPriority.value = task.priority;
  
  // Enfocar el input de texto
  editTaskText.focus();
  
  // Validación en tiempo real
  const validateInputs = () => {
    const isValid = editTaskText.value.trim() !== '' && isValidDate(editTaskDate.value);
    saveButton.disabled = !isValid;
  };
  
  editTaskText.addEventListener("input", validateInputs);
  editTaskDate.addEventListener("change", validateInputs);
  
  // Eventos del modal
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      cancelEditing();
    }
  });
  
  editModal.querySelector('.close-modal').addEventListener('click', cancelEditing);
  
  saveButton.addEventListener('click', () => saveEditedTask(editingRow, editingTask));
  cancelButton.addEventListener('click', cancelEditing);
}

function saveEditedTask(row, task) {
  const newText = editTaskText.value.trim();
  const newDate = editTaskDate.value;
  const newPriority = editTaskPriority.value;

  if (newText === '' || !isValidDate(newDate)) {
    alert('¡Texto vacío o fecha inválida! La fecha debe ser futura.');
    return;
  }

  saveState();
  task.text = newText;
  task.date = newDate;
  task.priority = newPriority;
  saveTasks();
  renderTasks();
  
  // Cerrar el modal
  editModal.classList.remove('active');
}

function cancelEditing() {
  if (editingTask) {
    renderTasks();
    editingTask = null;
    editingRow = null;
    editModal.classList.remove('active');
  }
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Verificar si es una fecha válida
  if (!(date instanceof Date) || isNaN(date)) return false;
  
  // Verificar si la fecha es futura (desde mañana)
  return date >= tomorrow;
}

// Funciones de gestión de tareas
function handleDeleteTask(row, id) {
  saveState();
  row.classList.add("fade-out");
  row.addEventListener("animationend", () => {
    tasks = tasks.filter(task => task.id !== id);
    saveTasks();
    renderTasks();
  });
}

function handleToggleComplete(row, id) {
  saveState();
  const task = tasks.find(t => t.id === id);
  task.completed = !task.completed;
  saveTasks();
  renderTasks();
}

// Funciones de tema
function toggleTheme() {
  const isDark = themeToggle.checked;
  document.body.classList.toggle("dark", isDark);
  localStorage.setItem('darkMode', isDark);
}

// Funciones de drag & drop
function handleDragStart(e) {
  const row = e.target.closest("tr");
  if (row) draggedTaskId = Number(row.dataset.id);
}

function handleDragOver(e) {
  e.preventDefault();
}

function handleDrop(e) {
  const row = e.target.closest("tr");
  if (!row) return;

  const targetId = Number(row.dataset.id);
  const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);
  const targetIndex = tasks.findIndex(t => t.id === targetId);

  if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;

  saveState();
  const [draggedTask] = tasks.splice(draggedIndex, 1);
  tasks.splice(targetIndex, 0, draggedTask);
  saveTasks();
  renderTasks();
}

// Funciones de persistencia
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function saveState() {
  undoStack.push(JSON.stringify(tasks));
  redoStack.length = 0;
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length > 0) {
    redoStack.push(JSON.stringify(tasks));
    tasks = JSON.parse(undoStack.pop());
    saveTasks();
    renderTasks();
    updateUndoRedoButtons();
  }
}

function redo() {
  if (redoStack.length > 0) {
    undoStack.push(JSON.stringify(tasks));
    tasks = JSON.parse(redoStack.pop());
    saveTasks();
    renderTasks();
    updateUndoRedoButtons();
  }
}

function updateUndoRedoButtons() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

// Funciones de renderizado
function renderTasks() {
  taskList.innerHTML = "";
  let filtered = tasks;

  if (currentFilter === "completadas") {
    filtered = tasks.filter(t => t.completed);
  } else if (currentFilter === "pendientes") {
    filtered = tasks.filter(t => !t.completed);
  }

  filtered.forEach(task => {
    const row = document.createElement("tr");
    row.className = "task-row";
    row.dataset.id = task.id;
    row.draggable = true;
    row.innerHTML = `
      <td>
        <input type="checkbox" ${task.completed ? "checked" : ""}>
      </td>
      <td class="task-text">${task.text}</td>
      <td class="task-priority">${getPriorityIcon(task.priority)}</td>
      <td>${new Date(task.date).toLocaleDateString()}</td>
      <td class="actions">
        <button class="edit">✏️ Editar</button>
        <button class="delete">🗑️ Eliminar</button>
      </td>
    `;
    taskList.appendChild(row);
  });

  updateTaskCounter();
}

function getPriorityIcon(priority) {
  const icons = {
    alta: '🔥',
    media: '🔔',
    baja: '⏰'
  };
  return icons[priority];
}

function updateTaskCounter() {
  const remaining = tasks.filter(t => !t.completed).length;
  document.querySelector(".task-counter").textContent = `Tareas restantes: ${remaining}`;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    themeToggle.checked = true;
    document.body.classList.add('dark');
  }
});

updateUndoRedoButtons();
renderTasks();
