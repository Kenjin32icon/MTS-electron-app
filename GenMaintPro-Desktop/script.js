// script.js (Combined and Cleaned)
document.addEventListener('DOMContentLoaded', async () => {
    // Ensure the electronAPI is available
    if (typeof window.electronAPI === 'undefined' || typeof window.electronAPI.api === 'undefined') {
        console.error('Electron API not available. Running in a non-Electron environment or preload script failed.');
        // Fallback or error handling for non-Electron environment if necessary
        return;
    }

    // Now, 'api' refers to window.electronAPI.api
    const api = window.electronAPI.api;

    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const darkModeText = document.getElementById('darkModeText');

    // Function to update UI elements based on dark mode state
    const updateDarkModeUI = (isDark) => {
        if (darkModeIcon) darkModeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        if (darkModeText) darkModeText.textContent = isDark ? 'Light Mode' : 'Dark Mode';
    };

    // Check for saved preference and apply
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    updateDarkModeUI(isDarkMode);

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-mode');
            localStorage.setItem('darkMode', isDark);
            updateDarkModeUI(isDark);
        });
    }

    // Initialize Chart.js (only if the element exists on the page)
    const ctx = document.getElementById('serviceTrendChart');
    if (ctx) {
        // Fetch chart data using the Electron API
        try {
            const chartData = await api.get('chartData'); // Assuming an endpoint '/chartData'
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: [{
                        label: chartData.datasetLabel,
                        data: chartData.data,
                        backgroundColor: 'rgba(52, 152, 219, 1)',
                        borderColor: 'rgba(41, 128, 185, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Services'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Months'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(tooltipItem) {
                                    return tooltipItem.dataset.label + ': ' + tooltipItem.raw;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching chart data:', error);
        }
    }

    // Dropdown functionality
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdownMenu = document.querySelector('.dropdown-menu');

    if (dropdownToggle && dropdownMenu) {
        dropdownToggle.addEventListener('click', () => {
            dropdownMenu.classList.toggle('show');
        });

        window.addEventListener('click', (event) => {
            if (!event.target.matches('.dropdown-toggle') && !event.target.closest('.dropdown-menu')) {
                if (dropdownMenu.classList.contains('show')) {
                    dropdownMenu.classList.remove('show');
                }
            }
        });
    }

    // Mobile Menu functionality
    const menuButton = document.querySelector('.menu-button');
    const navContainer = document.querySelector('.nav-container'); // This is #main-nav

    if (menuButton && navContainer) {
        menuButton.addEventListener('click', () => {
            const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
            menuButton.setAttribute('aria-expanded', !isExpanded);
            navContainer.classList.toggle('active');
            // Also toggle the header-container visibility for mobile
            document.querySelector('.header-container').classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!menuButton.contains(event.target) && !navContainer.contains(event.target) && !document.querySelector('.header-container').contains(event.target)) {
                if (navContainer.classList.contains('active')) {
                    navContainer.classList.remove('active');
                    document.querySelector('.header-container').classList.remove('active');
                    menuButton.setAttribute('aria-expanded', 'false');
                }
            }
        });
    }

    // Active Page Highlighting
    const currentPage = location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        } else {
            link.classList.remove('active');
            link.removeAttribute('aria-current');
        }
    });

    // Modal functionality (for service details, part details, generator details, and technician details)
    const serviceDetailsModal = document.getElementById('serviceDetailsModal');
    const partDetailsModal = document.getElementById('partDetailsModal');
    const generatorDetailsModal = document.getElementById('generatorDetailsModal');
    const technicianDetailsModal = document.getElementById('technicianDetailsModal'); // New modal for team.html
    const addGeneratorModal = document.getElementById('addGeneratorModal'); // New modal for adding generator
    const addPartModal = document.getElementById('addPartModal'); // New modal for adding part
    const addTechnicianModal = document.getElementById('addTechnicianModal'); // NEW: Modal for adding technician

    // Generic modal open/close logic
    const setupModal = (modalElement) => {
        if (!modalElement) return;

        const closeButtons = modalElement.querySelectorAll('.close-modal, .btn-close');

        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modalElement.style.display = 'none';
                // Reset form sections when modal closes
                if (modalElement.id === 'addGeneratorModal') {
                    showGeneratorFormSection('basic');
                    document.getElementById('addGeneratorForm').reset(); // Clear form fields
                }
                if (modalElement.id === 'addPartModal') {
                    showPartFormSection('basic-part');
                    document.getElementById('addPartForm').reset(); // Clear form fields
                }
                // NEW: Reset form sections for addTechnicianModal
                if (modalElement.id === 'addTechnicianModal') {
                    showTechnicianFormSection('personal');
                    document.getElementById('addTechnicianForm').reset(); // Clear form fields
                }
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === modalElement) {
                modalElement.style.display = 'none';
                // Reset form sections when modal closes
                if (modalElement.id === 'addGeneratorModal') {
                    showGeneratorFormSection('basic');
                    document.getElementById('addGeneratorForm').reset(); // Clear form fields
                }
                if (modalElement.id === 'addPartModal') {
                    showPartFormSection('basic-part');
                    document.getElementById('addPartForm').reset(); // Clear form fields
                }
                // NEW: Reset form sections for addTechnicianModal
                if (modalElement.id === 'addTechnicianModal') {
                    showTechnicianFormSection('personal');
                    document.getElementById('addTechnicianForm').reset(); // Clear form fields
                }
            }
        });
    };

    setupModal(serviceDetailsModal);
    setupModal(partDetailsModal);
    setupModal(generatorDetailsModal);
    setupModal(technicianDetailsModal); // Setup new modal
    setupModal(addGeneratorModal); // Setup new add generator modal
    setupModal(addPartModal); // Setup new add part modal
    setupModal(addTechnicianModal); // NEW: Setup new add technician modal

    // Attach event listeners for 'view-details' buttons
    const viewDetailsBtns = document.querySelectorAll('.view-details');
    viewDetailsBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const dataId = btn.dataset.id; // Assuming data-id attribute holds the ID
            // Determine which modal to open based on the button's context
            if (btn.closest('#clientGeneratorsTable') || btn.closest('#recordsTable') || btn.closest('#scheduleGrid')) { // Added scheduleGrid for calendar events
                if (serviceDetailsModal) {
                    try {
                        const service = await api.get(`services/${dataId}`); // Fetch service details
                        // Populate service details modal here based on fetched data
                        // Example: document.getElementById('serviceModalTitle').textContent = service.name;
                        serviceDetailsModal.style.display = 'flex';
                    } catch (error) {
                        console.error('Error fetching service details:', error);
                    }
                }
            } else if (btn.closest('#partsTable')) {
                if (partDetailsModal) {
                    try {
                        const part = await api.get(`parts/${dataId}`); // Fetch part details
                        // Populate part details modal here based on fetched data
                        partDetailsModal.style.display = 'flex';
                    } catch (error) {
                        console.error('Error fetching part details:', error);
                    }
                }
            } else if (btn.closest('#registryTable')) {
                if (generatorDetailsModal) {
                    try {
                        const generator = await api.get(`generators/${dataId}`); // Fetch generator details
                        // Populate generator details modal here based on fetched data
                        generatorDetailsModal.style.display = 'flex';
                    } catch (error) {
                        console.error('Error fetching generator details:', error);
                    }
                }
            } else if (btn.closest('#teamTable')) { // Added for team.html
                if (technicianDetailsModal) {
                    try {
                        const technician = await api.get(`technicians/${dataId}`); // Fetch technician details
                        // Populate technician details modal here based on fetched data
                        technicianDetailsModal.style.display = 'flex';
                    } catch (error) {
                        console.error('Error fetching technician details:', error);
                    }
                }
            }
        });
    });

    // Event listener for "Add New Generator" button
    const addNewGeneratorBtn = document.getElementById('addNewGeneratorBtn');
    if (addNewGeneratorBtn) {
        addNewGeneratorBtn.addEventListener('click', () => {
            if (addGeneratorModal) {
                addGeneratorModal.style.display = 'flex';
                showGeneratorFormSection('basic'); // Ensure first section is shown on open
            }
        });
    }

    // Event listener for "Add New Part" button
    const addNewPartBtn = document.getElementById('addNewPartBtn');
    if (addNewPartBtn) {
        addNewPartBtn.addEventListener('click', () => {
            if (addPartModal) {
                addPartModal.style.display = 'flex';
                showPartFormSection('basic-part'); // Ensure first section is shown on open
            }
        });
    }

    // NEW: Event listener for "Add New Technician" button
    const addNewTechnicianBtn = document.getElementById('addNewTechnicianBtn');
    if (addNewTechnicianBtn) {
        addNewTechnicianBtn.addEventListener('click', () => {
            if (addTechnicianModal) {
                addTechnicianModal.style.display = 'flex';
                showTechnicianFormSection('personal'); // Ensure first section is shown on open
            }
        });
    }

    // New Generator Form Section Navigation Logic
    const genFormSections = document.querySelectorAll('#addGeneratorModal .form-section');
    const genNavTabs = document.querySelectorAll('#addGeneratorModal .nav-tab');
    const prevGenSectionBtn = document.getElementById('prevGenSectionBtn');
    const nextGenSectionBtn = document.getElementById('nextGenSectionBtn');
    const submitNewGenFormBtn = document.getElementById('submitNewGenFormBtn');

    let currentGenSectionIndex = 0;

    const showGeneratorFormSection = (sectionId) => {
        genFormSections.forEach(section => {
            section.classList.remove('active');
        });
        genNavTabs.forEach(tab => {
            tab.classList.remove('active');
        });

        const targetSection = document.getElementById(`section-${sectionId}`);
        if (targetSection) {
            targetSection.classList.add('active');
            const targetTabIndex = Array.from(genFormSections).indexOf(targetSection);
            if (genNavTabs[targetTabIndex]) {
                genNavTabs[targetTabIndex].classList.add('active');
            }
            currentGenSectionIndex = targetTabIndex;
            updateGeneratorNavButtons();
        }
    };

    const updateGeneratorNavButtons = () => {
        if (prevGenSectionBtn) prevGenSectionBtn.style.display = currentGenSectionIndex === 0 ? 'none' : 'inline-flex';
        if (nextGenSectionBtn) nextGenSectionBtn.style.display = currentGenSectionIndex === genFormSections.length - 1 ? 'none' : 'inline-flex';
        if (submitNewGenFormBtn) submitNewGenFormBtn.style.display = currentGenSectionIndex === genFormSections.length - 1 ? 'inline-flex' : 'none';
    };

    genNavTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = tab.dataset.section;
            showGeneratorFormSection(sectionId);
        });
    });

    if (prevGenSectionBtn) {
        prevGenSectionBtn.addEventListener('click', () => {
            if (currentGenSectionIndex > 0) {
                currentGenSectionIndex--;
                showGeneratorFormSection(genFormSections[currentGenSectionIndex].id.replace('section-', ''));
            }
        });
    }

    if (nextGenSectionBtn) {
        nextGenSectionBtn.addEventListener('click', () => {
            // Optional: Add validation here before moving to next section
            if (currentGenSectionIndex < genFormSections.length - 1) {
                currentGenSectionIndex++;
                showGeneratorFormSection(genFormSections[currentGenSectionIndex].id.replace('section-', ''));
            }
        });
    }

    // Initial state for buttons when generator modal opens
    updateGeneratorNavButtons();

    // Handle generator form submission (this would typically involve AJAX)
    const addGeneratorForm = document.getElementById('addGeneratorForm');
    if (addGeneratorForm) {
        addGeneratorForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addGeneratorForm);
            const generatorData = Object.fromEntries(formData.entries());
            try {
                const newGenerator = await api.post('generators', generatorData); // Use Electron API
                alert('New Generator Added! (Form submission simulated)');
                console.log('New generator added:', newGenerator);
                addGeneratorModal.style.display = 'none';
                addGeneratorForm.reset(); // Clear form fields after submission
                showGeneratorFormSection('basic'); // Reset to first section
                // Optionally, refresh the generators table
                if (document.getElementById('registryTable')) {
                    const generators = await api.get('generators');
                    renderGeneratorsTable(generators);
                }
            } catch (error) {
                console.error('Error adding generator:', error);
                alert('Failed to add new generator.');
            }
        });
    }

    // New Part Form Section Navigation Logic
    const partFormSections = document.querySelectorAll('#addPartModal .form-section');
    const partNavTabs = document.querySelectorAll('#addPartModal .nav-tab');
    const prevPartSectionBtn = document.getElementById('prevPartSectionBtn');
    const nextPartSectionBtn = document.getElementById('nextPartSectionBtn');
    const submitNewPartFormBtn = document.getElementById('submitNewPartFormBtn');

    let currentPartSectionIndex = 0;

    const showPartFormSection = (sectionId) => {
        partFormSections.forEach(section => {
            section.classList.remove('active');
        });
        partNavTabs.forEach(tab => {
            tab.classList.remove('active');
        });

        const targetSection = document.getElementById(`section-${sectionId}`);
        if (targetSection) {
            targetSection.classList.add('active');
            const targetTabIndex = Array.from(partFormSections).indexOf(targetSection);
            if (partNavTabs[targetTabIndex]) {
                partNavTabs[targetTabIndex].classList.add('active');
            }
            currentPartSectionIndex = targetTabIndex;
            updatePartNavButtons();
        }
    };

    const updatePartNavButtons = () => {
        if (prevPartSectionBtn) prevPartSectionBtn.style.display = currentPartSectionIndex === 0 ? 'none' : 'inline-flex';
        if (nextPartSectionBtn) nextPartSectionBtn.style.display = currentPartSectionIndex === partFormSections.length - 1 ? 'none' : 'inline-flex';
        if (submitNewPartFormBtn) submitNewPartFormBtn.style.display = currentPartSectionIndex === partFormSections.length - 1 ? 'inline-flex' : 'none';
    };

    partNavTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = tab.dataset.section;
            showPartFormSection(sectionId);
        });
    });

    if (prevPartSectionBtn) {
        prevPartSectionBtn.addEventListener('click', () => {
            if (currentPartSectionIndex > 0) {
                currentPartSectionIndex--;
                showPartFormSection(partFormSections[currentPartSectionIndex].id.replace('section-', ''));
            }
        });
    }

    if (nextPartSectionBtn) {
        nextPartSectionBtn.addEventListener('click', () => {
            // Optional: Add validation here before moving to next section
            if (currentPartSectionIndex < partFormSections.length - 1) {
                currentPartSectionIndex++;
                showPartFormSection(partFormSections[currentPartSectionIndex].id.replace('section-', ''));
            }
        });
    }

    // Initial state for buttons when part modal opens
    updatePartNavButtons();

    // Handle part form submission (this would typically involve AJAX)
    const addPartForm = document.getElementById('addPartForm');
    if (addPartForm) {
        addPartForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addPartForm);
            const partData = Object.fromEntries(formData.entries());
            try {
                const newPart = await api.post('parts', partData); // Use Electron API
                alert('New Part Added! (Form submission simulated)');
                console.log('New part added:', newPart);
                addPartModal.style.display = 'none';
                addPartForm.reset(); // Clear form fields after submission
                showPartFormSection('basic-part'); // Reset to first section
                // Optionally, refresh the parts table
                if (document.getElementById('partsTable')) {
                    const parts = await api.get('parts');
                    renderPartsTable(parts);
                }
            } catch (error) {
                console.error('Error adding part:', error);
                alert('Failed to add new part.');
            }
        });
    }

    // NEW: New Technician Form Section Navigation Logic
    const techFormSections = document.querySelectorAll('#addTechnicianModal .form-section');
    const techNavTabs = document.querySelectorAll('#addTechnicianModal .nav-tab');
    const prevTechSectionBtn = document.getElementById('prevTechSectionBtn');
    const nextTechSectionBtn = document.getElementById('nextTechSectionBtn');
    const submitNewTechFormBtn = document.getElementById('submitNewTechFormBtn');

    let currentTechSectionIndex = 0;

    const showTechnicianFormSection = (sectionId) => {
        techFormSections.forEach(section => {
            section.classList.remove('active');
        });
        techNavTabs.forEach(tab => {
            tab.classList.remove('active');
        });

        const targetSection = document.getElementById(`section-${sectionId}`);
        if (targetSection) {
            targetSection.classList.add('active');
            const targetTabIndex = Array.from(techFormSections).indexOf(targetSection);
            if (techNavTabs[targetTabIndex]) {
                techNavTabs[targetTabIndex].classList.add('active');
            }
            currentTechSectionIndex = targetTabIndex;
            updateTechnicianNavButtons();
        }
    };

    const updateTechnicianNavButtons = () => {
        if (prevTechSectionBtn) prevTechSectionBtn.style.display = currentTechSectionIndex === 0 ? 'none' : 'inline-flex';
        if (nextTechSectionBtn) nextTechSectionBtn.style.display = currentTechSectionIndex === techFormSections.length - 1 ? 'none' : 'inline-flex';
        if (submitNewTechFormBtn) submitNewTechFormBtn.style.display = currentTechSectionIndex === techFormSections.length - 1 ? 'inline-flex' : 'none';
    };

    techNavTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const sectionId = tab.dataset.section;
            showTechnicianFormSection(sectionId);
        });
    });

    if (prevTechSectionBtn) {
        prevTechSectionBtn.addEventListener('click', () => {
            if (currentTechSectionIndex > 0) {
                currentTechSectionIndex--;
                showTechnicianFormSection(techFormSections[currentTechSectionIndex].id.replace('section-', ''));
            }
        });
    }

    if (nextTechSectionBtn) {
        nextTechSectionBtn.addEventListener('click', () => {
            // Optional: Add validation here before moving to next section
            if (currentTechSectionIndex < techFormSections.length - 1) {
                currentTechSectionIndex++;
                showTechnicianFormSection(techFormSections[currentTechSectionIndex].id.replace('section-', ''));
            }
        });
    }

    // Initial state for buttons when technician modal opens
    updateTechnicianNavButtons();

    // Handle technician form submission (this would typically involve AJAX)
    const addTechnicianForm = document.getElementById('addTechnicianForm');
    if (addTechnicianForm) {
        addTechnicianForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addTechnicianForm);
            const technicianData = Object.fromEntries(formData.entries());
            try {
                const newTechnician = await api.post('technicians', technicianData); // Use Electron API
                alert('New Technician Added! (Form submission simulated)');
                console.log('New technician added:', newTechnician);
                addTechnicianModal.style.display = 'none';
                addTechnicianForm.reset(); // Clear form fields after submission
                showTechnicianFormSection('personal'); // Reset to first section
                // Optionally, refresh the team table
                if (document.getElementById('teamTable')) {
                    const technicians = await api.get('technicians');
                    renderTeamTable(technicians);
                }
            } catch (error) {
                console.error('Error adding technician:', error);
                alert('Failed to add new technician.');
            }
        });
    }

    // Helper function for table sorting
    const setupTableSorting = (tableId, getColumnIndex, sortLogic) => {
        const table = document.getElementById(tableId);
        if (table) {
            const sortableHeaders = table.querySelectorAll('.sortable');

            sortableHeaders.forEach(header => {
                header.addEventListener('click', () => {
                    const sortBy = header.dataset.sort;
                    const isAscending = !header.classList.contains('sorted-asc');

                    // Reset other headers
                    sortableHeaders.forEach(h => {
                        h.classList.remove('sorted-asc', 'sorted-desc');
                    });

                    // Set current header
                    header.classList.add(isAscending ? 'sorted-asc' : 'sorted-desc');

                    // Sort the table
                    sortLogic(table, sortBy, isAscending, getColumnIndex);
                });
            });
        }
    };

    // Helper function for table filtering
    const setupTableFiltering = (tableId, filterLogic, resetLogic) => {
        const applyFiltersBtn = document.getElementById(`apply${tableId.replace('Table', 'Filters')}`);
        const resetFiltersBtn = document.getElementById(`reset${tableId.replace('Table', 'Filters')}`);

        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => filterLogic(tableId));
        }
        if (resetFiltersBtn) {
            resetFiltersBtn.addEventListener('click', () => resetLogic(tableId));
        }
    };

    // Generic table sorting logic
    const sortTable = (table, column, ascending, getColumnIndex) => {
        const rows = Array.from(table.querySelectorAll('tbody tr'));

        rows.sort((a, b) => {
            const aVal = a.children[getColumnIndex(column)].textContent;
            const bVal = b.children[getColumnIndex(column)].textContent;

            // Date comparison
            if (column.includes('Date') || column.includes('Service') || column.includes('date') || column.includes('next')) {
                return ascending ?
                    new Date(aVal) - new Date(bVal) :
                    new Date(bVal) - new Date(aVal);
            }

            // Numeric comparison (for quantity, cost, assignedServices)
            if (column === 'quantity' || column === 'cost' || column === 'assignedServices') {
                const numA = parseFloat(aVal.replace(/[^0-9.-]+/g, ""));
                const numB = parseFloat(bVal.replace(/[^0-9.-]+/g, ""));
                return ascending ? numA - numB : numB - numA;
            }

            // Status comparison (specific order)
            if (column === 'status') {
                const statusOrder = { 'completed': 1, 'pending': 2, 'overdue': 3, 'in stock': 1, 'low stock': 2, 'out of stock': 3, 'Active': 1, 'Inactive': 2 };
                return ascending ?
                    (statusOrder[aVal.toLowerCase()] || 0) - (statusOrder[bVal.toLowerCase()] || 0) :
                    (statusOrder[bVal.toLowerCase()] || 0) - (statusOrder[aVal.toLowerCase()] || 0);
            }

            // Default text comparison
            return ascending ?
                aVal.localeCompare(bVal) :
                bVal.localeCompare(aVal);
        });

        // Re-append rows in sorted order
        const tableBody = table.querySelector('tbody');
        tableBody.innerHTML = '';
        rows.forEach(row => tableBody.appendChild(row));
    };

    // Client Generators Table
    const getClientColumnIndex = (column) => {
        const columns = ['model', 'serial', 'lastService', 'nextService', 'status'];
        return columns.indexOf(column);
    };
    const applyClientFilters = (tableId) => {
        const table = document.getElementById(tableId);
        const searchTerm = document.getElementById('clientGeneratorSearch').value.toLowerCase();
        const statusFilter = document.getElementById('clientGeneratorStatusFilter').value;
        const dateFrom = document.getElementById('clientDateFrom').value;
        const dateTo = document.getElementById('clientDateTo').value;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const model = cells[0].textContent.toLowerCase();
            const serial = cells[1].textContent.toLowerCase();
            const lastServiceDate = cells[2].textContent;
            const statusCell = cells[4].querySelector('.status-badge');
            const status = statusCell ? statusCell.textContent.toLowerCase() : '';

            const matchesSearch = model.includes(searchTerm) || serial.includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            const matchesDate = (!dateFrom || lastServiceDate >= dateFrom) && (!dateTo || lastServiceDate <= dateTo);

            row.style.display = matchesSearch && matchesStatus && matchesDate ? '' : 'none';
        });
    };
    const resetClientFilters = (tableId) => {
        document.getElementById('clientGeneratorSearch').value = '';
        document.getElementById('clientGeneratorStatusFilter').selectedIndex = 0;
        document.getElementById('clientDateFrom').value = '';
        document.getElementById('clientDateTo').value = '';
        document.getElementById(tableId).querySelectorAll('tbody tr').forEach(row => row.style.display = '');
    };
    setupTableSorting('clientGeneratorsTable', getClientColumnIndex, sortTable);
    setupTableFiltering('clientGeneratorsTable', applyClientFilters, resetClientFilters);

    // Loading indicator for clientGeneratorsTable
    const loadingIndicator = document.getElementById('loading-indicator');
    const clientGeneratorsTable = document.getElementById('clientGeneratorsTable');
    if (loadingIndicator && clientGeneratorsTable) {
        setTimeout(() => {
            loadingIndicator.style.display = 'none';
            clientGeneratorsTable.style.display = 'table';
        }, 1500);
    }

    // Parts Table
    const getPartsColumnIndex = (column) => {
        const columns = ['name', 'number', 'quantity', 'cost', 'status'];
        return columns.indexOf(column);
    };
    const applyPartsFilters = (tableId) => {
        const table = document.getElementById(tableId);
        const searchTerm = document.getElementById('partSearch').value.toLowerCase();
        const categoryFilter = document.getElementById('partCategoryFilter').value; // Not used in current filter logic, but kept for completeness
        const stockStatusFilter = document.getElementById('partStockStatusFilter').value;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const partName = cells[0].textContent.toLowerCase();
            const partNumber = cells[1].textContent.toLowerCase();
            const stockStatusCell = cells[4].querySelector('.status-badge');
            const stockStatus = stockStatusCell ? stockStatusCell.textContent.toLowerCase().replace(/\s/g, '-') : '';

            const matchesSearch = partName.includes(searchTerm) || partNumber.includes(searchTerm);
            const matchesStockStatus = !stockStatusFilter || stockStatus === stockStatusFilter;

            row.style.display = matchesSearch && matchesStockStatus ? '' : 'none';
        });
    };
    const resetPartsFilters = (tableId) => {
        document.getElementById('partSearch').value = '';
        document.getElementById('partCategoryFilter').selectedIndex = 0;
        document.getElementById('partStockStatusFilter').selectedIndex = 0;
        document.getElementById(tableId).querySelectorAll('tbody tr').forEach(row => row.style.display = '');
    };
    setupTableSorting('partsTable', getPartsColumnIndex, sortTable);
    setupTableFiltering('partsTable', applyPartsFilters, resetPartsFilters);

    // Records Table
    const getRecordsColumnIndex = (column) => {
        const columns = ['id', 'generator', 'date', 'next', 'tech', 'status'];
        return columns.indexOf(column);
    };
    const applyRecordsFilters = (tableId) => {
        const table = document.getElementById(tableId);
        const searchTerm = document.getElementById('recordSearch').value.toLowerCase();
        const statusFilter = document.getElementById('recordStatusFilter').value;
        const techFilter = document.getElementById('recordTechnicianFilter').value;
        const dateFrom = document.getElementById('recordDateFrom').value;
        const dateTo = document.getElementById('recordDateTo').value;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const serviceId = cells[0].textContent.toLowerCase();
            const generator = cells[1].textContent.toLowerCase();
            const serviceDate = cells[2].textContent;
            const technician = cells[4].textContent;
            const statusCell = cells[5].querySelector('.status-badge');
            const status = statusCell ? statusCell.textContent.toLowerCase() : '';

            const matchesSearch = serviceId.includes(searchTerm) || generator.includes(searchTerm) || technician.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || status === statusFilter;
            const matchesTech = !techFilter || technician === techFilter;
            const matchesDate = (!dateFrom || serviceDate >= dateFrom) && (!dateTo || serviceDate <= dateTo);

            row.style.display = matchesSearch && matchesStatus && matchesTech && matchesDate ? '' : 'none';
        });
    };
    const resetRecordsFilters = (tableId) => {
        document.getElementById('recordSearch').value = '';
        document.getElementById('recordStatusFilter').selectedIndex = 0;
        document.getElementById('recordTechnicianFilter').selectedIndex = 0;
        document.getElementById('recordDateFrom').value = '';
        document.getElementById('recordDateTo').value = '';
        document.getElementById(tableId).querySelectorAll('tbody tr').forEach(row => row.style.display = '');
    };
    setupTableSorting('recordsTable', getRecordsColumnIndex, sortTable);
    setupTableFiltering('recordsTable', applyRecordsFilters, resetRecordsFilters);

    // Registry Table
    const getRegistryColumnIndex = (column) => {
        const columns = ['model', 'type', 'serial', 'location', 'purchaseDate'];
        return columns.indexOf(column);
    };
    const applyRegistryFilters = (tableId) => {
        const table = document.getElementById(tableId);
        const searchTerm = document.getElementById('registrySearch').value.toLowerCase();
        const typeFilter = document.getElementById('registryTypeFilter').value;
        const locationFilter = document.getElementById('registryLocationFilter').value;
        const dateFrom = document.getElementById('registryDateFrom').value;
        const dateTo = document.getElementById('registryDateTo').value;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const model = cells[0].textContent.toLowerCase();
            const serial = cells[2].textContent.toLowerCase();
            const type = cells[1].textContent;
            const location = cells[3].textContent;
            const purchaseDate = cells[4].textContent;

            const matchesSearch = model.includes(searchTerm) || serial.includes(searchTerm);
            const matchesType = !typeFilter || type === typeFilter;
            const matchesLocation = !locationFilter || location === locationFilter;
            const matchesDate = (!dateFrom || purchaseDate >= dateFrom) && (!dateTo || purchaseDate <= dateTo);

            row.style.display = matchesSearch && matchesType && matchesLocation && matchesDate ? '' : 'none';
        });
    };
    const resetRegistryFilters = (tableId) => {
        document.getElementById('registrySearch').value = '';
        document.getElementById('registryTypeFilter').selectedIndex = 0;
        document.getElementById('registryLocationFilter').selectedIndex = 0;
        document.getElementById('registryDateFrom').value = '';
        document.getElementById('registryDateTo').value = '';
        document.getElementById(tableId).querySelectorAll('tbody tr').forEach(row => row.style.display = '');
    };
    setupTableSorting('registryTable', getRegistryColumnIndex, sortTable);
    setupTableFiltering('registryTable', applyRegistryFilters, resetRegistryFilters);

    // Team Table
    const getTeamColumnIndex = (column) => {
        const columns = ['name', 'email', 'phone', 'role', 'assignedServices', 'status'];
        return columns.indexOf(column);
    };
    const applyTeamFilters = (tableId) => {
        const table = document.getElementById(tableId);
        const searchTerm = document.getElementById('teamSearch').value.toLowerCase();
        const roleFilter = document.getElementById('teamRoleFilter').value;
        const statusFilter = document.getElementById('teamStatusFilter').value;

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const name = cells[0].textContent.toLowerCase();
            const email = cells[1].textContent.toLowerCase();
            const role = cells[3].textContent;
            const statusCell = cells[5].querySelector('.status-badge');
            const status = statusCell ? statusCell.textContent : '';

            const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
            const matchesRole = !roleFilter || role === roleFilter;
            const matchesStatus = !statusFilter || status === statusFilter;

            row.style.display = matchesSearch && matchesRole && matchesStatus ? '' : 'none';
        });
    };
    const resetTeamFilters = (tableId) => {
        document.getElementById('teamSearch').value = '';
        document.getElementById('teamRoleFilter').selectedIndex = 0;
        document.getElementById('teamStatusFilter').selectedIndex = 0;
        document.getElementById(tableId).querySelectorAll('tbody tr').forEach(row => row.style.display = '');
    };
    setupTableSorting('teamTable', getTeamColumnIndex, sortTable);
    setupTableFiltering('teamTable', applyTeamFilters, resetTeamFilters);

    // --- Data Rendering Functions (to be called after fetching data) ---

    // Render Users Table (for admin.html)
    const renderUsersTable = (users) => {
        const tbody = document.querySelector('#userManagementTable tbody');
        if (!tbody) return;
        tbody.innerHTML = ''; // Clear existing rows
        users.forEach(user => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td><span class="status-badge role-${user.role}">${user.role}</span></td>
                <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}</td>
                <td><span class="status-badge status-${user.status}">${user.status}</span></td>
                <td>
                    <button class="action-button view-details edit-user-btn" data-id="${user.id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-button delete-button delete-user-btn" data-id="${user.id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            `;
        });
        // Attach event listeners for edit/delete buttons
        tbody.querySelectorAll('.edit-user-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const userId = button.dataset.id;
                // Fetch user details and populate edit modal
                try {
                    const userToEdit = await api.get(`users/${userId}`);
                    if (userToEdit) {
                        document.getElementById('modalUserName').textContent = userToEdit.name;
                        document.getElementById('modalUserEmail').textContent = userToEdit.email;
                        document.getElementById('modalUserId').textContent = userToEdit.id;
                        document.getElementById('editUserRole').value = userToEdit.role;
                        document.getElementById('userAccessStatus').value = userToEdit.status;
                        document.getElementById('editUserRoleModal').style.display = 'flex';
                    }
                } catch (error) {
                    console.error('Error fetching user for edit:', error);
                }
            });
        });
        tbody.querySelectorAll('.delete-user-btn').forEach(button => {
            button.addEventListener('click', async () => {
                const userId = button.dataset.id;
                if (confirm('Are you sure you want to delete this user?')) {
                    try {
                        await api.delete('users', userId);
                        alert('User deleted successfully!');
                        const updatedUsers = await api.get('users');
                        renderUsersTable(updatedUsers);
                    } catch (error) {
                        console.error('Error deleting user:', error);
                        alert('Failed to delete user.');
                    }
                }
            });
        });
    };

    // Render Generators Table (for registry.html and clientportal.html)
    const renderGeneratorsTable = (generators) => {
        const tbody = document.querySelector('#registryTable tbody') || document.querySelector('#clientGeneratorsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        generators.forEach(gen => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${gen.model}</td>
                <td>${gen.type}</td>
                <td>${gen.serial}</td>
                <td>${gen.location}</td>
                <td>${gen.purchaseDate}</td>
                <td><span class="status-badge status-${gen.status}">${gen.status}</span></td>
                <td>
                    <button class="action-button view-details" data-id="${gen.id}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </td>
            `;
        });
    };

    // Render Records Table (for records.html and reports.html)
    const renderRecordsTable = (records) => {
        const tbody = document.querySelector('#recordsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        records.forEach(rec => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${rec.id}</td>
                <td>${rec.generator}</td>
                <td>${rec.date}</td>
                <td>${rec.nextServiceDate}</td>
                <td>${rec.technician}</td>
                <td><span class="status-badge status-${rec.status}">${rec.status}</span></td>
                <td>
                    <button class="action-button view-details" data-id="${rec.id}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </td>
            `;
        });
    };

    // Render Parts Table (for parts.html)
    const renderPartsTable = (parts) => {
        const tbody = document.querySelector('#partsTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        parts.forEach(part => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${part.name}</td>
                <td>${part.partNumber}</td>
                <td>${part.quantity}</td>
                <td>$${part.cost.toFixed(2)}</td>
                <td><span class="status-badge status-${part.status}">${part.status}</span></td>
                <td>
                    <button class="action-button view-details" data-id="${part.id}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </td>
            `;
        });
    };

    // Render Team Table (for team.html)
    const renderTeamTable = (technicians) => {
        const tbody = document.querySelector('#teamTable tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        technicians.forEach(tech => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${tech.name}</td>
                <td>${tech.email}</td>
                <td>${tech.phone}</td>
                <td>${tech.role}</td>
                <td>${tech.assignedServices}</td>
                <td><span class="status-badge status-${tech.status}">${tech.status}</span></td>
                <td>
                    <button class="action-button view-details" data-id="${tech.id}">
                        <i class="fas fa-info-circle"></i> View Details
                    </button>
                </td>
            `;
        });
    };

    // --- Initial Data Loading for Tables ---
    // Check current page and load data accordingly
    if (document.getElementById('userManagementTable')) { // Admin page
        try {
            const users = await api.get('users');
            renderUsersTable(users);
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }
    if (document.getElementById('registryTable')) { // Registry page
        try {
            const generators = await api.get('generators');
            renderGeneratorsTable(generators);
        } catch (error) {
            console.error('Error loading generators:', error);
        }
    }
    if (document.getElementById('partsTable')) { // Parts page
        try {
            const parts = await api.get('parts');
            renderPartsTable(parts);
        } catch (error) {
            console.error('Error loading parts:', error);
        }
    }
    if (document.getElementById('recordsTable')) { // Records page
        try {
            const records = await api.get('records');
            renderRecordsTable(records);
        } catch (error) {
            console.error('Error loading records:', error);
        }
    }
    if (document.getElementById('teamTable')) { // Team page
        try {
            const technicians = await api.get('technicians');
            renderTeamTable(technicians);
        } catch (error) {
            console.error('Error loading technicians:', error);
        }
    }
    if (document.getElementById('clientGeneratorsTable')) { // Client Portal page (assuming it uses this table)
        try {
            const clientGenerators = await api.get('clientGenerators'); // Assuming a specific endpoint for client's generators
            renderGeneratorsTable(clientGenerators); // Re-using renderGeneratorsTable
        } catch (error) {
            console.error('Error loading client generators:', error);
        }
    }

    // For the calendar in schedule.html, the logic will also need to fetch services locally
    // and populate the calendar grid.
    // Example for schedule.html (simplified):
    if (document.getElementById('scheduleGrid')) {
        try {
            const scheduledServices = await api.get('scheduledServices');
            // Logic to populate calendar grid with scheduledServices
            console.log('Scheduled Services:', scheduledServices);
        } catch (error) {
            console.error('Error loading scheduled services:', error);
        }
    }
});
