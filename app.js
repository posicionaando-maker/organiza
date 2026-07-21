// Organiza - App de Lista de Tareas
// app.js - Limpieza y actualización forzada
async function forceUpdate() {
    console.log('🔄 Forzando actualización de la app...');
    
    // 1. Limpiar cachés antiguas
    if ('caches' in window) {
        try {
            const keys = await caches.keys();
            const oldCaches = keys.filter(key => key !== 'organiza-v2');
            await Promise.all(oldCaches.map(key => caches.delete(key)));
            console.log('✅ Cachés antiguas eliminadas:', oldCaches);
        } catch (e) {
            console.warn('No se pudieron limpiar cachés:', e);
        }
    }
    
    // 2. Forzar actualización del Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.update();
                console.log('✅ SW actualizado:', registration);
            }
        } catch (e) {
            console.warn('No se pudo actualizar SW:', e);
        }
    }
    
    // 3. Recargar la página si hay cambios
    setTimeout(() => {
        if (performance.navigation.type !== 1) { // No recargar si ya es recarga
            console.log('🔄 Recargando página para aplicar cambios...');
            window.location.reload();
        }
    }, 1000);
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', forceUpdate);

// El resto de tu código de la app...


// Estado de la aplicación
const state = {
    tasks: [],
    filter: 'all', // 'all', 'pending', 'completed'
    editingId: null
};

// DOM Elements
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');
const taskCounter = document.getElementById('task-counter');
const filterBtns = document.querySelectorAll('.filter-btn');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const toggleAllBtn = document.getElementById('toggle-all-btn');

// Cargar tareas desde localStorage
function loadTasks() {
    try {
        const stored = localStorage.getItem('organiza_tasks');
        if (stored) {
            state.tasks = JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error al cargar tareas:', error);
        state.tasks = [];
    }
}

// Guardar tareas en localStorage
function saveTasks() {
    try {
        localStorage.setItem('organiza_tasks', JSON.stringify(state.tasks));
    } catch (error) {
        console.error('Error al guardar tareas:', error);
    }
}

// Generar ID único
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Añadir nueva tarea
function addTask(text) {
    if (!text.trim()) {
        alert('Por favor, escribe una tarea.');
        return false;
    }

    const task = {
        id: generateId(),
        text: text.trim(),
        completed: false,
        createdAt: new Date().toISOString()
    };

    state.tasks.unshift(task);
    saveTasks();
    renderTasks();
    taskInput.value = '';
    taskInput.focus();
    return true;
}

// Eliminar tarea
function deleteTask(id) {
    if (confirm('¿Seguro que quieres eliminar esta tarea?')) {
        state.tasks = state.tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
    }
}

// Marcar/Desmarcar tarea
function toggleTask(id) {
    const task = state.tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
    }
}

// Obtener tareas filtradas
function getFilteredTasks() {
    switch (state.filter) {
        case 'pending':
            return state.tasks.filter(task => !task.completed);
        case 'completed':
            return state.tasks.filter(task => task.completed);
        default:
            return state.tasks;
    }
}

// Contar tareas pendientes
function countPendingTasks() {
    return state.tasks.filter(task => !task.completed).length;
}

// Renderizar tareas
function renderTasks() {
    const filteredTasks = getFilteredTasks();
    const pendingCount = countPendingTasks();

    // Actualizar contador
    taskCounter.textContent = `${pendingCount} tarea${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`;

    if (filteredTasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-message">
                <span>📭</span>
                <p>${state.filter === 'all' ? 'No hay tareas. ¡Añade una!' :
                    state.filter === 'pending' ? '¡Todas las tareas están completadas! 🎉' :
                    'No hay tareas completadas aún.'}
                </p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <span class="task-date">${formatDate(task.createdAt)}</span>
            <button class="task-delete-btn" aria-label="Eliminar tarea">✕</button>
        </div>
    `).join('');

    // Event listeners para cada tarea
    document.querySelectorAll('.task-item').forEach(item => {
        const id = item.dataset.id;
        const checkbox = item.querySelector('.task-checkbox');
        const deleteBtn = item.querySelector('.task-delete-btn');

        checkbox.addEventListener('change', () => toggleTask(id));
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(id);
        });

        // Hacer doble click para editar (opcional)
        item.addEventListener('dblclick', () => editTask(id));
    });

    // Actualizar filtros activos
    filterBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === state.filter);
    });
}

// Editar tarea (doble click)
function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt('Editar tarea:', task.text);
    if (newText !== null && newText.trim() !== '') {
        task.text = newText.trim();
        saveTasks();
        renderTasks();
    }
}

// Formatear fecha
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}

// Escapar HTML para evitar XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Limpiar tareas completadas
function clearCompleted() {
    const completed = state.tasks.filter(task => task.completed);
    if (completed.length === 0) {
        alert('No hay tareas completadas para limpiar.');
        return;
    }

    if (confirm(`¿Eliminar ${completed.length} tarea${completed.length > 1 ? 's' : ''} completada${completed.length > 1 ? 's' : ''}?`)) {
        state.tasks = state.tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }
}

// Marcar/Desmarcar todas
function toggleAll() {
    const pending = state.tasks.filter(task => !task.completed);
    const allCompleted = pending.length === 0;

    state.tasks.forEach(task => {
        task.completed = !allCompleted;
    });

    saveTasks();
    renderTasks();
}

// Event Listeners
addBtn.addEventListener('click', () => {
    addTask(taskInput.value);
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask(taskInput.value);
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.filter = btn.dataset.filter;
        renderTasks();
    });
});

clearCompletedBtn.addEventListener('click', clearCompleted);
toggleAllBtn.addEventListener('click', toggleAll);

// Inicializar app
loadTasks();
renderTasks();

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('Service Worker registrado con éxito:', registration);
            })
            .catch(error => {
                console.error('Error al registrar Service Worker:', error);
            });
    });
}

// PWA Install Prompt (opcional)
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar un botón de instalación personalizado
    const installBtn = document.createElement('button');
    installBtn.textContent = '📲 Instalar App';
    installBtn.className = 'action-btn';
    installBtn.style.background = 'linear-gradient(135deg, #1976D2, #42A5F5)';
    installBtn.style.color = 'white';
    installBtn.style.border = 'none';
    
    const actionsDiv = document.getElementById('actions');
    actionsDiv.prepend(installBtn);
    
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const result = await deferredPrompt.userChoice;
            if (result.outcome === 'accepted') {
                console.log('Usuario instaló la app');
            }
            deferredPrompt = null;
            installBtn.remove();
        }
    });
});
