class ContactBookPlus {
    constructor() {
        this.contacts = JSON.parse(localStorage.getItem('contacts')) || [];
        this.currentEditId = null;
        this.currentView = 'grid';
        this.theme = localStorage.getItem('theme') || 'light';
        
        this.initializeApp();
        this.bindEvents();
        this.applyTheme();
        this.renderContacts();
        this.updateStats();
    }

    initializeApp() {
        // Set initial theme
        document.documentElement.setAttribute('data-theme', this.theme);
        
        // Update theme toggle icon
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    bindEvents() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Modal controls
        document.getElementById('addContactBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        
        // Form submission
        document.getElementById('contactForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Search and filters
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('groupFilter').addEventListener('change', (e) => this.handleFilter(e.target.value));
        document.getElementById('sortBy').addEventListener('change', (e) => this.handleSort(e.target.value));
        
        // View controls
        document.getElementById('gridView').addEventListener('click', () => this.setView('grid'));
        document.getElementById('listView').addEventListener('click', () => this.setView('list'));
        
        // Import/Export
        document.getElementById('exportBtn').addEventListener('click', () => this.exportContacts());
        document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
        document.getElementById('importFile').addEventListener('change', (e) => this.importContacts(e));
        
        // Bulk operations
        document.getElementById('bulkDeleteBtn').addEventListener('click', () => this.openBulkDeleteModal());
        document.getElementById('closeBulkModal').addEventListener('click', () => this.closeBulkDeleteModal());
        document.getElementById('cancelBulkBtn').addEventListener('click', () => this.closeBulkDeleteModal());
        document.getElementById('confirmBulkDelete').addEventListener('click', () => this.confirmBulkDelete());
        
        // Close modal on outside click
        document.getElementById('contactModal').addEventListener('click', (e) => {
            if (e.target.id === 'contactModal') this.closeModal();
        });
        
        document.getElementById('bulkDeleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'bulkDeleteModal') this.closeBulkDeleteModal();
        });
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.theme);
        localStorage.setItem('theme', this.theme);
        
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.theme);
    }

    openModal(contact = null) {
        const modal = document.getElementById('contactModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('contactForm');
        
        if (contact) {
            title.textContent = 'Edit Contact';
            this.currentEditId = contact.id;
            this.populateForm(contact);
        } else {
            title.textContent = 'Add New Contact';
            this.currentEditId = null;
            form.reset();
        }
        
        modal.classList.add('active');
    }

    closeModal() {
        document.getElementById('contactModal').classList.remove('active');
        document.getElementById('contactForm').reset();
        this.currentEditId = null;
    }

    populateForm(contact) {
        document.getElementById('firstName').value = contact.firstName || '';
        document.getElementById('lastName').value = contact.lastName || '';
        document.getElementById('phone').value = contact.phone || '';
        document.getElementById('email').value = contact.email || '';
        document.getElementById('company').value = contact.company || '';
        document.getElementById('jobTitle').value = contact.jobTitle || '';
        document.getElementById('address').value = contact.address || '';
        document.getElementById('birthday').value = contact.birthday || '';
        document.getElementById('group').value = contact.group || '';
        document.getElementById('notes').value = contact.notes || '';
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const contact = {
            id: this.currentEditId || Date.now().toString(),
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            company: document.getElementById('company').value.trim(),
            jobTitle: document.getElementById('jobTitle').value.trim(),
            address: document.getElementById('address').value.trim(),
            birthday: document.getElementById('birthday').value,
            group: document.getElementById('group').value,
            notes: document.getElementById('notes').value.trim(),
            favorite: false,
            dateAdded: this.currentEditId ? 
                this.contacts.find(c => c.id === this.currentEditId)?.dateAdded : 
                new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        if (this.currentEditId) {
            const index = this.contacts.findIndex(c => c.id === this.currentEditId);
            if (index !== -1) {
                contact.favorite = this.contacts[index].favorite;
                this.contacts[index] = contact;
            }
        } else {
            this.contacts.push(contact);
        }

        this.saveContacts();
        this.renderContacts();
        this.updateStats();
        this.closeModal();
        this.showToast(this.currentEditId ? 'Contact updated successfully!' : 'Contact added successfully!');
    }

    deleteContact(id) {
        if (confirm('Are you sure you want to delete this contact?')) {
            this.contacts = this.contacts.filter(c => c.id !== id);
            this.saveContacts();
            this.renderContacts();
            this.updateStats();
            this.showToast('Contact deleted successfully!');
        }
    }

    toggleFavorite(id) {
        const contact = this.contacts.find(c => c.id === id);
        if (contact) {
            contact.favorite = !contact.favorite;
            this.saveContacts();
            this.renderContacts();
            this.updateStats();
        }
    }

    handleSearch(query) {
        this.renderContacts(query);
    }

    handleFilter(group) {
        this.renderContacts(document.getElementById('searchInput').value, group);
    }

    handleSort(sortBy) {
        this.renderContacts(
            document.getElementById('searchInput').value,
            document.getElementById('groupFilter').value,
            sortBy
        );
    }

    setView(view) {
        this.currentView = view;
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(view + 'View').classList.add('active');
        this.renderContacts();
    }

    renderContacts(searchQuery = '', groupFilter = '', sortBy = 'name') {
        const container = document.getElementById('contactList');
        let filteredContacts = [...this.contacts];

        // Apply search filter
        if (searchQuery) {
            filteredContacts = filteredContacts.filter(contact =>
                `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (contact.phone || '').includes(searchQuery) ||
                (contact.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (contact.company || '').toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply group filter
        if (groupFilter) {
            filteredContacts = filteredContacts.filter(contact => contact.group === groupFilter);
        }

        // Apply sorting
        filteredContacts.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return `${a.firstName || ''} ${a.lastName || ''}`.localeCompare(`${b.firstName || ''} ${b.lastName || ''}`);
                case 'date':
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
                case 'group':
                    return (a.group || '').localeCompare(b.group || '');
                default:
                    return 0;
            }
        });

        // Update container class based on view
        container.className = this.currentView === 'grid' ? 'contact-grid' : 'contact-list';

        if (filteredContacts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-address-book"></i>
                    <h3>No contacts found</h3>
                    <p>Start by adding your first contact!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredContacts.map(contact => this.createContactCard(contact)).join('');
    }

    createContactCard(contact) {
        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim();
        const listViewClass = this.currentView === 'list' ? 'list-view' : '';
        
        return `
            <div class="contact-card ${listViewClass}">
                <div class="contact-header">
                    <div>
                        <div class="contact-name">${fullName}</div>
                        ${contact.group ? `<span class="contact-group">${contact.group}</span>` : ''}
                    </div>
                    <div class="contact-actions">
                        <button class="action-btn favorite ${contact.favorite ? 'active' : ''}" 
                                onclick="app.toggleFavorite('${contact.id}')" title="Toggle Favorite">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="action-btn edit" onclick="app.openModal(${JSON.stringify(contact).replace(/"/g, '&quot;')})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="app.deleteContact('${contact.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="contact-info">
                    ${contact.phone ? `
                        <div class="contact-detail">
                            <i class="fas fa-phone"></i>
                            <span>${contact.phone}</span>
                        </div>
                    ` : ''}
                    ${contact.email ? `
                        <div class="contact-detail">
                            <i class="fas fa-envelope"></i>
                            <span>${contact.email}</span>
                        </div>
                    ` : ''}
                    ${contact.company ? `
                        <div class="contact-detail">
                            <i class="fas fa-building"></i>
                            <span>${contact.company}</span>
                        </div>
                    ` : ''}
                    ${contact.jobTitle ? `
                        <div class="contact-detail">
                            <i class="fas fa-briefcase"></i>
                            <span>${contact.jobTitle}</span>
                        </div>
                    ` : ''}
                    ${contact.birthday ? `
                        <div class="contact-detail">
                            <i class="fas fa-birthday-cake"></i>
                            <span>${new Date(contact.birthday).toLocaleDateString()}</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    updateStats() {
        document.getElementById('totalContacts').textContent = this.contacts.length;
        document.getElementById('favoriteContacts').textContent = this.contacts.filter(c => c.favorite).length;
    }

    exportContacts() {
        const dataStr = JSON.stringify(this.contacts, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `contacts-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.showToast('Contacts exported successfully!');
    }

    importContacts(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedContacts = JSON.parse(e.target.result);
                
                if (Array.isArray(importedContacts)) {
                    // Merge with existing contacts, avoiding duplicates
                    const existingIds = new Set(this.contacts.map(c => c.id));
                    const newContacts = importedContacts.filter(c => !existingIds.has(c.id));
                    
                    this.contacts.push(...newContacts);
                    this.saveContacts();
                    this.renderContacts();
                    this.updateStats();
                    this.showToast(`Imported ${newContacts.length} new contacts!`);
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                this.showToast('Error importing contacts. Please check the file format.', 'error');
            }
        };
        
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    }

    openBulkDeleteModal() {
        const modal = document.getElementById('bulkDeleteModal');
        const list = document.getElementById('bulkDeleteList');
        
        if (this.contacts.length === 0) {
            this.showToast('No contacts to delete!', 'warning');
            return;
        }
        
        list.innerHTML = this.contacts.map(contact => `
            <div class="bulk-item">
                <input type="checkbox" id="bulk-${contact.id}" value="${contact.id}">
                <label for="bulk-${contact.id}">${contact.firstName} ${contact.lastName}</label>
            </div>
        `).join('');
        
        modal.classList.add('active');
    }

    closeBulkDeleteModal() {
        document.getElementById('bulkDeleteModal').classList.remove('active');
    }

    confirmBulkDelete() {
        const checkboxes = document.querySelectorAll('#bulkDeleteList input[type="checkbox"]:checked');
        const idsToDelete = Array.from(checkboxes).map(cb => cb.value);
        
        if (idsToDelete.length === 0) {
            this.showToast('No contacts selected!', 'warning');
            return;
        }
        
        if (confirm(`Are you sure you want to delete ${idsToDelete.length} contact(s)?`)) {
            this.contacts = this.contacts.filter(c => !idsToDelete.includes(c.id));
            this.saveContacts();
            this.renderContacts();
            this.updateStats();
            this.closeBulkDeleteModal();
            this.showToast(`Deleted ${idsToDelete.length} contact(s) successfully!`);
        }
    }

    saveContacts() {
        localStorage.setItem('contacts', JSON.stringify(this.contacts));
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize the app
const app = new ContactBookPlus();

// Clear existing data and start fresh
localStorage.removeItem('contacts');
app.contacts = [];
app.renderContacts();
app.updateStats();