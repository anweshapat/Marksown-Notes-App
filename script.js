/* ==========================================
   MARKDOWN NOTES APP - JAVASCRIPT
   ========================================== */

// ==========================================
// DATA MANAGEMENT
// ==========================================

// Initialize data structure in localStorage
const STORAGE_KEY = 'markdownNotes';
const DARK_MODE_KEY = 'darkModeEnabled';

/**
 * Initialize localStorage with empty notes if not exists
 */
function initializeStorage() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
}

/**
 * Get all notes from localStorage
 * @returns {Array} Array of note objects
 */
function getAllNotes() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Error parsing notes from storage:', error);
        return [];
    }
}

/**
 * Save all notes to localStorage
 * @param {Array} notes - Array of note objects
 */
function saveAllNotes(notes) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
        console.error('Error saving notes to storage:', error);
    }
}

/**
 * Create a new note object
 * @param {string} title - Note title
 * @returns {Object} New note object
 */
function createNoteObject(title) {
    return {
        id: Date.now().toString(), // Simple unique ID using timestamp
        title: title || 'Untitled Note',
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Add a new note
 * @param {string} title - Note title
 * @returns {Object} The created note
 */
function addNote(title) {
    const notes = getAllNotes();
    const newNote = createNoteObject(title);
    notes.unshift(newNote); // Add to beginning of array
    saveAllNotes(notes);
    return newNote;
}

/**
 * Update a note
 * @param {string} id - Note ID
 * @param {string} content - Note content
 */
function updateNote(id, content) {
    const notes = getAllNotes();
    const note = notes.find(n => n.id === id);
    if (note) {
        note.content = content;
        note.updatedAt = new Date().toISOString();
        saveAllNotes(notes);
    }
}

/**
 * Delete a note
 * @param {string} id - Note ID
 */
function deleteNote(id) {
    const notes = getAllNotes().filter(n => n.id !== id);
    saveAllNotes(notes);
}

/**
 * Get a note by ID
 * @param {string} id - Note ID
 * @returns {Object|null} The note or null if not found
 */
function getNoteById(id) {
    const notes = getAllNotes();
    return notes.find(n => n.id === id) || null;
}

/**
 * Search notes by title or content
 * @param {string} query - Search query
 * @returns {Array} Matching notes
 */
function searchNotes(query) {
    const notes = getAllNotes();
    const lowerQuery = query.toLowerCase();
    return notes.filter(n => 
        n.title.toLowerCase().includes(lowerQuery) ||
        n.content.toLowerCase().includes(lowerQuery)
    );
}

// ==========================================
// UI ELEMENTS REFERENCES
// ==========================================

const markdownInput = document.getElementById('markdown-input');
const previewOutput = document.getElementById('preview-output');
const notesList = document.getElementById('notesList');
const newNoteBtn = document.getElementById('newNoteBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const exportNoteBtn = document.getElementById('exportNoteBtn');
const darkModeToggle = document.getElementById('darkModeToggle');
const searchInput = document.getElementById('searchInput');
const timestamp = document.getElementById('timestamp');

// Modal elements
const newNoteModal = document.getElementById('newNoteModal');
const noteTitleInput = document.getElementById('noteTitleInput');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const confirmModalBtn = document.getElementById('confirmModalBtn');

const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// ==========================================
// CURRENT STATE
// ==========================================

let currentNoteId = null;
let autoSaveTimeout = null;

// ==========================================
// MARKDOWN PREVIEW
// ==========================================

/**
 * Configure marked.js options for better styling
 */
marked.setOptions({
    breaks: true,
    gfm: true, // GitHub Flavored Markdown
});

/**
 * Update the preview pane with rendered markdown
 * @param {string} markdown - Raw markdown text
 */
function updatePreview(markdown) {
    if (!markdown.trim()) {
        previewOutput.innerHTML = '<p class="placeholder-text">Start typing to see the preview...</p>';
        return;
    }

    try {
        const html = marked.parse(markdown);
        previewOutput.innerHTML = html;
    } catch (error) {
        console.error('Error parsing markdown:', error);
        previewOutput.innerHTML = '<p class="error">Error rendering markdown</p>';
    }
}

/**
 * Format timestamp for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const noteDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    // Format time
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Determine date string
    if (noteDate.getTime() === today.getTime()) {
        return `Today at ${timeStr}`;
    } else if (noteDate.getTime() === yesterday.getTime()) {
        return `Yesterday at ${timeStr}`;
    } else {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${month}/${day}/${date.getFullYear()} ${timeStr}`;
    }
}

/**
 * Update the timestamp display
 * @param {string} dateString - ISO date string
 */
function updateTimestamp(dateString) {
    if (dateString) {
        timestamp.textContent = `Last edited: ${formatDate(dateString)}`;
    } else {
        timestamp.textContent = '';
    }
}

// ==========================================
// NOTES LIST RENDERING
// ==========================================

/**
 * Render the notes list
 * @param {Array} notes - Notes to display
 */
function renderNotesList(notes = getAllNotes()) {
    // Clear current list
    notesList.innerHTML = '';

    // Show empty state if no notes
    if (notes.length === 0) {
        notesList.innerHTML = '<p class="empty-state">No notes yet. Create one to get started!</p>';
        return;
    }

    // Create note items
    notes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = `note-item ${note.id === currentNoteId ? 'active' : ''}`;
        noteItem.innerHTML = `
            <span class="note-title">${escapeHtml(note.title)}</span>
            <span class="note-date">${formatDate(note.updatedAt)}</span>
        `;

        // Click handler to load note
        noteItem.addEventListener('click', () => loadNote(note.id));

        notesList.appendChild(noteItem);
    });
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// NOTE OPERATIONS
// ==========================================

/**
 * Load a note by ID
 * @param {string} id - Note ID
 */
function loadNote(id) {
    const note = getNoteById(id);
    if (!note) {
        console.error('Note not found:', id);
        return;
    }

    // Update current note
    currentNoteId = id;

    // Update UI
    markdownInput.value = note.content;
    updatePreview(note.content);
    updateTimestamp(note.updatedAt);
    renderNotesList();

    // Show action buttons
    deleteNoteBtn.style.display = 'inline-flex';
    exportNoteBtn.style.display = 'inline-flex';

    // Focus the editor
    markdownInput.focus();
}

/**
 * Create a new note via modal
 */
function createNewNote() {
    newNoteModal.classList.add('active');
    noteTitleInput.value = '';
    noteTitleInput.focus();
}

/**
 * Confirm and create new note
 */
function confirmNewNote() {
    const title = noteTitleInput.value.trim() || 'Untitled Note';
    const newNote = addNote(title);

    // Close modal
    newNoteModal.classList.remove('active');

    // Load the new note
    loadNote(newNote.id);

    // Update list
    renderNotesList();
}

/**
 * Delete the current note
 */
function deleteCurrentNote() {
    if (!currentNoteId) return;

    deleteConfirmModal.classList.add('active');
}

/**
 * Confirm and delete note
 */
function confirmDeleteNote() {
    if (!currentNoteId) return;

    deleteNote(currentNoteId);
    currentNoteId = null;

    // Clear editor
    markdownInput.value = '';
    previewOutput.innerHTML = '<p class="placeholder-text">Start typing to see the preview...</p>';
    timestamp.textContent = '';

    // Hide action buttons
    deleteNoteBtn.style.display = 'none';
    exportNoteBtn.style.display = 'none';

    // Update list
    renderNotesList();

    // Close modal
    deleteConfirmModal.classList.remove('active');
}

/**
 * Export current note as .txt file
 */
function exportNote() {
    if (!currentNoteId) return;

    const note = getNoteById(currentNoteId);
    if (!note) return;

    // Create blob with markdown content
    const blob = new Blob([note.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${note.title.replace(/[^\w\s-]/g, '')}.txt`;
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ==========================================
// SEARCH & FILTER
// ==========================================

/**
 * Handle search input
 * @param {string} query - Search query
 */
function handleSearch(query) {
    if (!query.trim()) {
        // Show all notes if search is empty
        renderNotesList(getAllNotes());
    } else {
        // Show filtered notes
        const results = searchNotes(query);
        renderNotesList(results);
    }
}

// ==========================================
// DARK MODE
// ==========================================

/**
 * Check if dark mode is enabled
 * @returns {boolean} Dark mode status
 */
function isDarkModeEnabled() {
    return localStorage.getItem(DARK_MODE_KEY) === 'true';
}

/**
 * Toggle dark mode
 */
function toggleDarkMode() {
    const isDarkMode = isDarkModeEnabled();
    const newState = !isDarkMode;

    // Save preference
    localStorage.setItem(DARK_MODE_KEY, newState);

    // Apply to document
    if (newState) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

/**
 * Initialize dark mode from saved preference
 */
function initializeDarkMode() {
    if (isDarkModeEnabled()) {
        document.body.classList.add('dark-mode');
    }
}

// ==========================================
// AUTO-SAVE FUNCTIONALITY
// ==========================================

/**
 * Auto-save the current note with debounce
 */
function autoSaveNote() {
    // Clear existing timeout
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }

    // Set new timeout for auto-save
    autoSaveTimeout = setTimeout(() => {
        if (currentNoteId) {
            updateNote(currentNoteId, markdownInput.value);
            updateTimestamp(getNoteById(currentNoteId)?.updatedAt);
            renderNotesList();
        }
    }, 1000); // Save after 1 second of inactivity
}

// ==========================================
// EVENT LISTENERS
// ==========================================

/**
 * Real-time preview and auto-save on input
 */
markdownInput.addEventListener('input', (e) => {
    const markdown = e.target.value;
    updatePreview(markdown);
    autoSaveNote();
});

/**
 * New note button
 */
newNoteBtn.addEventListener('click', createNewNote);

/**
 * Delete note button
 */
deleteNoteBtn.addEventListener('click', deleteCurrentNote);

/**
 * Export note button
 */
exportNoteBtn.addEventListener('click', exportNote);

/**
 * Dark mode toggle button
 */
darkModeToggle.addEventListener('click', toggleDarkMode);

/**
 * Search input
 */
searchInput.addEventListener('input', (e) => {
    handleSearch(e.target.value);
});

// Modal: New Note
closeModalBtn.addEventListener('click', () => {
    newNoteModal.classList.remove('active');
});

cancelModalBtn.addEventListener('click', () => {
    newNoteModal.classList.remove('active');
});

confirmModalBtn.addEventListener('click', confirmNewNote);

noteTitleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmNewNote();
    }
});

// Modal: Delete Confirmation
closeDeleteModalBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('active');
});

cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('active');
});

confirmDeleteBtn.addEventListener('click', confirmDeleteNote);

/**
 * Close modals on background click
 */
newNoteModal.addEventListener('click', (e) => {
    if (e.target === newNoteModal) {
        newNoteModal.classList.remove('active');
    }
});

deleteConfirmModal.addEventListener('click', (e) => {
    if (e.target === deleteConfirmModal) {
        deleteConfirmModal.classList.remove('active');
    }
});

/**
 * Save note on page unload
 */
window.addEventListener('beforeunload', () => {
    if (currentNoteId && markdownInput.value) {
        updateNote(currentNoteId, markdownInput.value);
    }
});

// ==========================================
// INITIALIZATION
// ==========================================

/**
 * Initialize the application
 */
function initializeApp() {
    // Initialize storage
    initializeStorage();

    // Initialize dark mode
    initializeDarkMode();

    // Render notes list
    renderNotesList();

    // If there are notes, load the most recent one
    const notes = getAllNotes();
    if (notes.length > 0) {
        loadNote(notes[0].id);
    } else {
        // Show empty editor
        markdownInput.value = '';
        previewOutput.innerHTML = '<p class="placeholder-text">Start typing to see the preview...</p>';
        deleteNoteBtn.style.display = 'none';
        exportNoteBtn.style.display = 'none';
    }
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

// Also run immediately in case DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
