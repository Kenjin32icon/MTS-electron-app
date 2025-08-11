// FileName: /script.js

// Utility function to get current page name from data-page attribute
const getCurrentPage = () => {
    const activeLink = document.querySelector('.nav-links .active');
    return activeLink ? activeLink.dataset.page.replace('.html', '') : 'index';
};

// Modified updateNavigationVisibility function
const updateNavigationVisibility = async () => {
    const currentUser = await window.electronAPI.getCurrentUser();
    const authButton = document.getElementById('authButton');
    
    // Ensure authButton is always properly initialized
    if (authButton) {
        authButton.style.display = '';
        authButton.disabled = false;
        authButton.classList.remove('hidden');
    }
    
    const clientPortalLink = document.getElementById('clientPortalLink');
    const adminPanelLink = document.getElementById('adminPanelLink');
    const navLinks = document.querySelectorAll('.nav-links a');
    const reportsButton = document.querySelector('.nav-actions .reports-button');

    // Reset all links to default visible state (for unauthenticated browsing)
    // All elements are always visible, regardless of user role or authentication status.
    navLinks.forEach(link => link.style.display = '');
    if (reportsButton) reportsButton.style.display = '';
    if (clientPortalLink) clientPortalLink.style.display = '';
    if (adminPanelLink) adminPanelLink.style.display = '';

    if (currentUser) {
        // User is logged in
        authButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
        authButton.dataset.action = 'logout';

        // Handle first login modal for default admin
        if (currentUser.first_login && currentUser.email === 'genmaintadmin@email.com') {
            document.getElementById('firstLoginModal').style.display = 'block';
            document.getElementById('newAdminName').value = currentUser.name;
            document.getElementById('newAdminEmail').value = currentUser.email;
        }

    } else {
        // Not logged in - show sign in button
        authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        authButton.dataset.action = 'login';
        
        // Keep navigation elements visible for unauthenticated browsing
        navLinks.forEach(link => link.style.display = '');
        if (reportsButton) reportsButton.style.display = '';
        if (clientPortalLink) clientPortalLink.style.display = '';
        if (adminPanelLink) adminPanelLink.style.display = '';
    }
};

// Modified loadDataForPage function
const loadDataForPage = async (endpoint, displayFunction, statsEndpoint = null, statsDisplayFunction = null) => {
    const currentUser = await window.electronAPI.getCurrentUser();

    if (currentUser) {
        // Load real data for authenticated users
        try {
            const data = await window.electronAPI.api.get(endpoint);
            displayFunction(data);

            if (statsEndpoint) {
                const statsData = await window.electronAPI.api.get(statsEndpoint);
                statsDisplayFunction(statsData);
            }
        } catch (error) {
            console.error(`Error fetching data: ${error}`);
            // Display sample data as fallback
            loadSampleData(endpoint, displayFunction, statsEndpoint, statsDisplayFunction);
        }
    } else {
        // Load sample data for unauthenticated users
        loadSampleData(endpoint, displayFunction, statsEndpoint, statsDisplayFunction);
    }
};

// New function to load sample data
const loadSampleData = async (endpoint, displayFunction, statsEndpoint, statsDisplayFunction) => {
    const sampleResult = await window.electronAPI.getSampleData();

    if (sampleResult.success) {
        const sample = sampleResult.data;
        let data = [];
        let statsData = {};

        switch (endpoint) {
            case 'generators': data = sample.generators; break;
            case 'services': data = sample.services; break;
            case 'parts': data = sample.parts; break;
            case 'users': data = sample.users; break;
            case 'technicians':
                data = sample.users.filter(u => u.role === 'technician');
                break;
            case 'userActions': data = []; break; // Sample data doesn't include actions, keep empty
            default: data = []; break;
        }

        displayFunction(data);

        if (statsDisplayFunction) {
            // Calculate sample stats
            statsDisplayFunction(calculateSampleStats(sample, statsEndpoint));
        }
    } else {
        console.error('Failed to load sample data:', sampleResult.message);
        alert('Failed to load sample data. Please try again later.');
        displayFunction([]);
        if (statsDisplayFunction) statsDisplayFunction({});
        return;
    }
};

// Placeholder for calculating sample stats (implement as needed for each page)
const calculateSampleStats = (sampleData, statsEndpoint) => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-indexed

    switch (statsEndpoint) {
        case 'dashboardStats':
            const totalServicesYTD = sampleData.services.filter(s => new Date(s.service_date).getFullYear() === currentYear).length;
            const totalCostYTD = sampleData.services.filter(s => new Date(s.service_date).getFullYear() === currentYear).reduce((sum, s) => sum + (s.service_cost || 0), 0);
            const overdueServices = sampleData.services.filter(s => s.status === 'pending' && new Date(s.service_date) < new Date()).length;
            // Simplified trends for sample data
            return {
                totalServicesYTD: totalServicesYTD,
                totalServicesTrend: 'N/A',
                totalCostYTD: totalCostYTD.toFixed(2),
                totalCostTrend: 'N/A',
                avgResponseTime: 'N/A',
                avgResponseTimeTrend: 'N/A',
                overdueServices: overdueServices,
                overdueServicesTrend: 'N/A'
            };
        case 'registryStats':
            const totalGenerators = sampleData.generators.length;
            const activeGenerators = sampleData.generators.filter(g => g.status === 'Active').length;
            const generatorsDueForService = sampleData.generators.filter(g => new Date(g.next_service) <= new Date()).length;
            const generatorsUnderWarranty = sampleData.generators.filter(g => new Date(g.warranty_end) >= new Date()).length;
            return {
                totalGenerators: totalGenerators, totalGeneratorsTrend: 'N/A',
                activeGenerators: activeGenerators, activeGeneratorsTrend: 'N/A',
                generatorsDueForService: generatorsDueForService, generatorsDueForServiceTrend: 'N/A',
                generatorsUnderWarranty: generatorsUnderWarranty, generatorsUnderWarrantyTrend: 'N/A'
            };
        case 'scheduleStats':
            const upcomingServices = sampleData.services.filter(s => new Date(s.service_date) >= new Date() && (s.status === 'pending' || s.status === 'scheduled')).length;
            const pendingServicesSchedule = sampleData.services.filter(s => s.status === 'pending').length;
            const overdueServicesSchedule = sampleData.services.filter(s => s.status === 'pending' && new Date(s.service_date) < new Date()).length;
            const servicesCompletedThisMonth = sampleData.services.filter(s => s.status === 'completed' && new Date(s.service_date).getMonth() + 1 === currentMonth && new Date(s.service_date).getFullYear() === currentYear).length;
            return {
                upcomingServices: upcomingServices, upcomingServicesTrend: 'N/A',
                pendingServicesSchedule: pendingServicesSchedule, pendingServicesScheduleTrend: 'N/A',
                overdueServicesSchedule: overdueServicesSchedule, overdueServicesScheduleTrend: 'N/A',
                servicesCompletedThisMonth: servicesCompletedThisMonth, servicesCompletedThisMonthTrend: 'N/A'
            };
        case 'serviceRecordsStats':
            const completedServices = sampleData.services.filter(s => s.status === 'completed').length;
            const pendingServices = sampleData.services.filter(s => s.status === 'pending' || s.status === 'scheduled').length;
            const overdueRecords = sampleData.services.filter(s => s.status === 'pending' && new Date(s.service_date) < new Date()).length;
            const activeTechnicians = sampleData.users.filter(u => u.role === 'technician' && u.status === 'active').length;
            return {
                completedServices: completedServices, completedServicesTrend: 'N/A',
                pendingServices: pendingServices, pendingServicesTrend: 'N/A',
                overdueRecords: overdueRecords, overdueRecordsTrend: 'N/A',
                activeTechnicians: activeTechnicians, activeTechniciansTrend: 'N/A'
            };
        case 'partsInventoryStats':
            const totalUniqueParts = sampleData.parts.length;
            const lowStockItems = sampleData.parts.filter(p => p.quantity_in_stock <= p.min_stock_level).length;
            const totalInventoryValue = sampleData.parts.reduce((sum, p) => sum + (p.quantity_in_stock * p.cost_per_unit), 0);
            const partsUsedLastMonth = sampleData.parts.reduce((sum, p) => sum + (p.used_last_month || 0), 0);
            return {
                totalUniqueParts: totalUniqueParts, totalUniquePartsTrend: 'N/A',
                lowStockItems: lowStockItems, lowStockItemsTrend: 'N/A',
                totalInventoryValue: totalInventoryValue.toFixed(2), totalInventoryValueTrend: 'N/A',
                partsUsedLastMonth: partsUsedLastMonth, partsUsedLastMonthTrend: 'N/A'
            };
        case 'teamManagementStats':
            const activeTechs = sampleData.users.filter(u => u.role === 'technician' && u.status === 'active').length;
            const certificationsDue = sampleData.users.filter(u => u.role === 'technician' && u.certifications && u.certifications.includes('Expired')).length;
            const overdueAssignments = sampleData.services.filter(s => s.technician_id && s.status === 'pending' && new Date(s.service_date) < new Date()).length;
            const servicesThisMonth = sampleData.services.filter(s => new Date(s.service_date).getMonth() + 1 === currentMonth && new Date(s.service_date).getFullYear() === currentYear);
            const uniqueTechsThisMonth = new Set(servicesThisMonth.map(s => s.technician_id)).size;
            const avgServicesPerTech = uniqueTechsThisMonth > 0 ? servicesThisMonth.length / uniqueTechsThisMonth : 0;
            return {
                activeTechnicians: activeTechs, activeTechniciansTrend: 'N/A',
                certificationsDue: certificationsDue, certificationsDueTrend: 'N/A',
                overdueAssignments: overdueAssignments, overdueAssignmentsTrend: 'N/A',
                avgServicesPerTech: avgServicesPerTech.toFixed(1), avgServicesPerTechTrend: 'N/A'
            };
        case 'adminPanelStats':
            const totalUsers = sampleData.users.length;
            const adminUsers = sampleData.users.filter(u => u.role === 'admin').length;
            const technicianUsers = sampleData.users.filter(u => u.role === 'technician').length;
            const clientUsers = sampleData.users.filter(u => u.role === 'client').length;
            return {
                totalUsers: totalUsers, totalUsersTrend: 'N/A',
                adminUsers: adminUsers, adminUsersTrend: 'N/A',
                technicianUsers: technicianUsers, technicianUsersTrend: 'N/A',
                clientUsers: clientUsers, clientUsersTrend: 'N/A'
            };
        case 'chartData': // For dashboard service trend chart
            const serviceCountsCurrentYear = new Array(12).fill(0);
            const serviceCountsPreviousYear = new Array(12).fill(0);
            sampleData.services.forEach(s => {
                const serviceDate = new Date(s.service_date);
                if (serviceDate.getFullYear() === currentYear) {
                    serviceCountsCurrentYear[serviceDate.getMonth()]++;
                } else if (serviceDate.getFullYear() === currentYear - 1) {
                    serviceCountsPreviousYear[serviceDate.getMonth()]++;
                }
            });
            const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return {
                labels: labels,
                datasets: [
                    { label: currentYear.toString(), data: serviceCountsCurrentYear, backgroundColor: 'rgba(52, 152, 219, 0.8)', borderColor: 'rgba(41, 128, 185, 1)', borderWidth: 1 },
                    { label: (currentYear - 1).toString(), data: serviceCountsPreviousYear, backgroundColor: 'rgba(149, 165, 166, 0.8)', borderColor: 'rgba(127, 140, 141, 1)', borderWidth: 1 }
                ]
            };
        case 'serviceCostByTypeChartData':
            const serviceCostByType = {};
            sampleData.services.filter(s => s.status === 'completed').forEach(s => {
                serviceCostByType[s.service_type] = (serviceCostByType[s.service_type] || 0) + (s.service_cost || 0);
            });
            return {
                labels: Object.keys(serviceCostByType),
                datasets: [{
                    label: 'Total Cost (Ksh)',
                    data: Object.values(serviceCostByType),
                    backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'],
                    borderColor: ['#2980b9', '#27ae60', '#e67e22', '#c0392b', '#8e44ad', '#16a085'],
                    borderWidth: 1
                }]
            };
        case 'generatorStatusChartData':
            const generatorStatusCounts = {};
            sampleData.generators.forEach(g => {
                generatorStatusCounts[g.status] = (generatorStatusCounts[g.status] || 0) + 1;
            });
            return {
                labels: Object.keys(generatorStatusCounts),
                datasets: [{
                    label: 'Number of Generators',
                    data: Object.values(generatorStatusCounts),
                    backgroundColor: ['#2ecc71', '#e74c3c', '#f39c12', '#95a5a6'],
                    borderColor: ['#27ae60', '#c0392b', '#e67e22', '#7f8c8d'],
                    borderWidth: 1
                }]
            };
        case 'partsStockChartData':
            const partsStockLevels = sampleData.parts.sort((a, b) => a.quantity_in_stock - b.quantity_in_stock);
            return {
                labels: partsStockLevels.map(row => row.name),
                datasets: [
                    { label: 'Quantity In Stock', data: partsStockLevels.map(row => row.quantity_in_stock), backgroundColor: '#3498db', borderColor: '#2980b9', borderWidth: 1 },
                    { label: 'Minimum Stock Level', data: partsStockLevels.map(row => row.min_stock_level), backgroundColor: '#e74c3c', borderColor: '#c0392b', borderWidth: 1 }
                ]
            };
        default:
            return {};
    }
};


// --- Common UI Elements and Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    const authButton = document.getElementById('authButton');
    const signInUpModal = document.getElementById('signInUpModal');
    const closeSignInUpModal = document.getElementById('closeSignInUpModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const tabButtons = document.querySelectorAll('.tab-button');
    const firstLoginModal = document.getElementById('firstLoginModal');
    const closeFirstLoginModal = document.getElementById('closeFirstLoginModal');
    const firstLoginForm = document.getElementById('firstLoginForm');

    // Navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    const navActionLinks = document.querySelectorAll('.nav-actions a'); // Includes Reports, Client Portal, Admin Panel

    // ENFORCE LOGIN: Check authentication immediately
    let currentUser = await window.electronAPI.getCurrentUser();
    
    // MAIN FIX: Always show navigation elements initially
    document.querySelectorAll('.nav-container, .nav-actions').forEach(el => {
        if (el) el.style.display = '';
    });

    if (!currentUser || currentUser.success === false) {
        // Hide main content but keep navigation visible
        document.querySelectorAll('.main-content').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Show login modal
        if (signInUpModal) signInUpModal.style.display = 'block';

        // Prevent further script execution until login
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const result = await window.electronAPI.login({ email, password });
            if (result.success) {
                alert(result.message);
                // Show main content after successful login
                document.querySelectorAll('.main-content').forEach(el => {
                    if (el) el.style.display = '';
                });
                // Update navigation based on new login state
                await updateNavigationVisibility();
                // Reload to re-run script with authenticated user
                window.location.reload();
            } else {
                alert(result.message);
            }
        });
        return; // Stop further execution for unauthenticated users
    } else {
        // Show content for authenticated users
        document.querySelectorAll('.main-content').forEach(el => {
            if (el) el.style.display = '';
        });
    }

    // Function to update UI based on login status and permissions
    async function updateUI() {
        currentUser = await window.electronAPI.getCurrentUser(); // Changed from window.api.getCurrentUser()
        console.log("Current User:", currentUser);

        if (currentUser && currentUser.success === false) { // Handle error case from getCurrentUser
            currentUser = null;
        }

        // MAIN FIX: Always ensure navigation is visible
        document.querySelectorAll('.nav-container, .nav-actions').forEach(el => {
            if (el) el.style.display = '';
        });
        
        if (currentUser) {
            authButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
            authButton.dataset.action = 'logout';
        } else {
            authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            authButton.dataset.action = 'login';
            authButton.disabled = false;
            authButton.classList.remove('hidden');
            authButton.style.display = 'block';
        }

        // All links are always visible, regardless of permissions
        document.querySelectorAll('.protected-link').forEach(link => {
            link.style.display = '';
        });

        navLinks.forEach(link => {
            link.parentElement.style.display = ''; // Show the li element
        });

        navActionLinks.forEach(link => {
            link.style.display = ''; // Show the link
        });

        // Special handling for Client Portal and Admin Panel buttons
        const clientPortalLink = document.getElementById('clientPortalLink');
        const adminPanelLink = document.getElementById('adminPanelLink');

        if (clientPortalLink) {
            clientPortalLink.style.display = '';
        }

        if (adminPanelLink) {
            adminPanelLink.style.display = '';
        }

        // Check for first login of default admin
        if (currentUser && currentUser.email === 'genmaintadmin@email.com' && currentUser.first_login) {
            if (firstLoginModal) firstLoginModal.style.display = 'block';
            if (document.getElementById('newAdminName')) document.getElementById('newAdminName').value = currentUser.name;
            if (document.getElementById('newAdminEmail')) document.getElementById('newAdminEmail').value = currentUser.email;
        } else {
            if (firstLoginModal) firstLoginModal.style.display = 'none';
        }
    }

    // Initial UI update
    await updateUI();

    // Handle page navigation
    document.querySelectorAll('.nav-links a, .nav-actions .reports-button, .nav-actions .client-button').forEach(link => {
        link.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            const currentLoggedInUser = await window.electronAPI.getCurrentUser();

            if (page) {
                if (page === 'index.html' || page === 'index') {
                    window.location.href = page;
                } else if (!currentLoggedInUser) {
                    alert('Please log in to access this page.');
                    if (signInUpModal) signInUpModal.style.display = 'block';
                } else {
                    window.location.href = page;
                }
            }
        });
    });

    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const darkModeIcon = document.getElementById('darkModeIcon');
    const darkModeText = document.getElementById('darkModeText');

    const enableDarkMode = () => {
        document.body.classList.add('dark-mode');
        if (darkModeIcon) darkModeIcon.classList.replace('fa-moon', 'fa-sun');
        if (darkModeText) darkModeText.textContent = 'Dark Mode';
        localStorage.setItem('darkMode', 'enabled');
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        if (darkModeIcon) darkModeIcon.classList.replace('fa-sun', 'fa-moon');
        if (darkModeText) darkModeText.textContent = 'Light Mode';
        localStorage.setItem('darkMode', 'disabled');
    };

    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            if (document.body.classList.contains('dark-mode')) {
                disableDarkMode();
            } else {
                enableDarkMode();
            }
        });
    }

    // Sign In/Out Button Logic
    if (authButton) {
        authButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (authButton.dataset.action === 'logout') {
                const confirmLogout = confirm('Are you sure you want to log out?');
                if (confirmLogout) {
                    await window.electronAPI.logout();
                    alert('Logged out successfully!');
                    await updateNavigationVisibility();
                    window.location.reload();
                }
            } else {
                if (signInUpModal) signInUpModal.style.display = 'block';
                // MODIFIED: Automatically switch to the signup tab when the modal opens for unauthenticated users
                const signupTabButton = document.querySelector('.tab-button[data-tab="signup"]');
                if (signupTabButton) {
                    signupTabButton.click(); // Programmatically click the signup tab
                } else {
                    // Fallback to login tab if signup tab not found (shouldn't happen if HTML is correct)
                    const loginTabButton = document.querySelector('.tab-button[data-tab="login"]');
                    if (loginTabButton) loginTabButton.click();
                }
            }
        });
    }

    if (closeSignInUpModal) {
        closeSignInUpModal.addEventListener('click', () => {
            if (signInUpModal) signInUpModal.style.display = 'none';
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            const targetTab = document.getElementById(`${button.dataset.tab}Tab`);
            if (targetTab) targetTab.classList.add('active');
        });
    });

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('loginEmail');
            const passwordInput = document.getElementById('loginPassword');
            const email = emailInput ? emailInput.value : '';
            const password = passwordInput ? passwordInput.value : '';
            const result = await window.electronAPI.login({ email, password });

            if (result.success) {
                alert(result.message);
                if (signInUpModal) signInUpModal.style.display = 'none';
                await updateNavigationVisibility();
                if (result.user.email === 'genmaintadmin@email.com' && result.user.first_login) {
                    if (firstLoginModal) firstLoginModal.style.display = 'block';
                    if (document.getElementById('newAdminName')) document.getElementById('newAdminName').value = result.user.name;
                    if (document.getElementById('newAdminEmail')) document.getElementById('newAdminEmail').value = result.user.email;
                } else {
                    window.location.reload();
                }
            } else {
                alert(result.message);
            }
        });
    }

    // Ensure signup form is enabled and visible
    if (signupForm) {
        signupForm.removeAttribute('disabled');
        signupForm.style.display = '';
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('signupName');
            const emailInput = document.getElementById('signupEmail');
            const passwordInput = document.getElementById('signupPassword');
            const roleInput = document.getElementById('signupRole');

            const name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const role = roleInput ? roleInput.value : '';

            const result = await window.electronAPI.register({ name, email, password, role });
            if (result.success) {
                alert('Registration successful! Please log in.');
                const loginTabButton = document.querySelector('.tab-button[data-tab="login"]');
                if (loginTabButton) loginTabButton.click();
                if (emailInput) document.getElementById('loginEmail').value = email;
                if (passwordInput) document.getElementById('loginPassword').value = '';
            } else {
                alert(result.message || 'Registration failed.');
            }
        });
    }

    // First Login Password Change Modal Logic
    if (closeFirstLoginModal) {
        closeFirstLoginModal.addEventListener('click', () => {
            if (firstLoginModal) firstLoginModal.style.display = 'none';
        });
    }

    if (firstLoginForm) {
        firstLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newNameInput = document.getElementById('newAdminName');
            const newEmailInput = document.getElementById('newAdminEmail');
            const newPasswordInput = document.getElementById('newAdminPassword');
            const confirmPasswordInput = document.getElementById('confirmAdminPassword');

            const newName = newNameInput ? newNameInput.value : '';
            const newEmail = newEmailInput ? newEmailInput.value : '';
            const newPassword = newPasswordInput ? newPasswordInput.value : '';
            const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
            const currentLoggedInUser = await window.electronAPI.getCurrentUser();

            if (newPassword !== confirmPassword) {
                alert('New password and confirm password do not match.');
                return;
            }

            if (!currentLoggedInUser || !currentLoggedInUser.id) {
                alert('No user logged in to update.');
                return;
            }

            const result = await window.electronAPI.updatePasswordAndFirstLogin(currentLoggedInUser.id, newName, newEmail, newPassword);

            if (result.success) {
                alert(result.message);
                if (firstLoginModal) firstLoginModal.style.display = 'none';
                await updateNavigationVisibility();
                window.location.reload();
            } else {
                alert(result.message);
            }
        });
    }

    // --- Page Specific Logic (Examples for Dashboard, Admin, Client Portal) ---
    const currentPage = getCurrentPage();

    // General Modal Handling (reusable functions in script.js):
    function openModal(modalId, title, data = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const modalTitle = modal.querySelector('h3');
        const form = modal.querySelector('form');

        if (modalTitle) modalTitle.textContent = title;
        if (form) form.reset();

        if (Object.keys(data).length > 0) {
            for (const key in data) {
                const input = form ? form.querySelector(`#${modalId.replace('Modal', '').toLowerCase()}${key.charAt(0).toUpperCase() + key.slice(1)}`) : null;
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = data[key];
                    } else {
                        input.value = data[key];
                    }
                }
            }
            const idInput = form ? form.querySelector(`#${modalId.replace('Modal', 'Id')}`) : null;
            if (idInput) idInput.value = data.id;
        } else {
            const idInput = form ? form.querySelector(`#${modalId.replace('Modal', 'Id')}`) : null;
            if (idInput) idInput.value = '';
        }

        modal.style.display = 'block';
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    document.querySelectorAll('.modal .close-modal, .modal .btn-close').forEach(button => {
        button.addEventListener('click', (event) => {
            const modal = event.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });


    if (currentPage === 'index') {
        // Dashboard Page Logic
        const displayDashboardStats = (stats) => {
            const totalServicesYTD = document.getElementById('totalServicesYTD');
            const totalServicesTrend = document.getElementById('totalServicesTrend');
            const totalCostYTD = document.getElementById('totalCostYTD');
            const totalCostTrend = document.getElementById('totalCostTrend');
            const avgResponseTime = document.getElementById('avgResponseTime');
            const avgResponseTimeTrend = document.getElementById('avgResponseTimeTrend');
            const overdueServices = document.getElementById('overdueServices');
            const overdueServicesTrend = document.getElementById('overdueServicesTrend');

            if (totalServicesYTD) totalServicesYTD.textContent = stats.totalServicesYTD || 0;
            if (totalServicesTrend) totalServicesTrend.textContent = stats.totalServicesTrend || 'N/A';
            if (totalCostYTD) totalCostYTD.textContent = `Ksh ${stats.totalCostYTD ? stats.totalCostYTD.toLocaleString() : '0.00'}`;
            if (totalCostTrend) totalCostTrend.textContent = stats.totalCostTrend || 'N/A';
            if (avgResponseTime) avgResponseTime.textContent = stats.avgResponseTime || 'N/A';
            if (avgResponseTimeTrend) avgResponseTimeTrend.textContent = stats.avgResponseTimeTrend || 'N/A';
            if (overdueServices) overdueServices.textContent = stats.overdueServices || 0;
            if (overdueServicesTrend) overdueServicesTrend.textContent = stats.overdueServicesTrend || 'N/A';
        };

        let serviceTrendChartInstance = null;
        const displayServiceTrendChart = (chartData) => {
            const serviceTrendChartCanvas = document.getElementById('serviceTrendChart');
            if (!serviceTrendChartCanvas) return;
            const ctx = serviceTrendChartCanvas.getContext('2d');
            if (serviceTrendChartInstance) {
                serviceTrendChartInstance.destroy();
            }
            const currentYearLabel = document.getElementById('currentYearLabel');
            const previousYearLabel = document.getElementById('previousYearLabel');

            if (currentYearLabel) currentYearLabel.textContent = chartData.datasets[0].label;
            if (previousYearLabel) previousYearLabel.textContent = chartData.datasets[1].label;

            serviceTrendChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.labels,
                    datasets: chartData.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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
                                text: 'Month'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        };

        const loadDashboardContent = async () => {
            const dashboardStatsContainer = document.getElementById('dashboardStatsContainer');
            const chartContainer = document.querySelector('.chart-container');

            if (dashboardStatsContainer) dashboardStatsContainer.style.display = 'none';
            if (chartContainer) chartContainer.style.display = 'none';

            await loadDataForPage('dashboardStats', displayDashboardStats, 'chartData', displayServiceTrendChart);

            if (dashboardStatsContainer) dashboardStatsContainer.style.display = '';
            if (chartContainer) chartContainer.style.display = '';
        };
        loadDashboardContent();

    } else if (currentPage === 'admin') {
        // Admin Panel Logic
        const displayAdminStats = (stats) => {
            const totalUsers = document.getElementById('totalUsers');
            const totalUsersTrend = document.getElementById('totalUsersTrend');
            const adminUsers = document.getElementById('adminUsers');
            const adminUsersTrend = document.getElementById('adminUsersTrend');
            const technicianUsers = document.getElementById('technicianUsers');
            const technicianUsersTrend = document.getElementById('technicianUsersTrend');
            const clientUsers = document.getElementById('clientUsers');
            const clientUsersTrend = document.getElementById('clientUsersTrend');

            if (totalUsers) totalUsers.textContent = stats.totalUsers || 0;
            if (totalUsersTrend) totalUsersTrend.textContent = stats.totalUsersTrend || 'N/A';
            if (adminUsers) adminUsers.textContent = stats.adminUsers || 0;
            if (adminUsersTrend) adminUsersTrend.textContent = stats.adminUsersTrend || 'N/A';
            if (technicianUsers) technicianUsers.textContent = stats.technicianUsers || 0;
            if (technicianUsersTrend) technicianUsersTrend.textContent = stats.technicianUsersTrend || 'N/A';
            if (clientUsers) clientUsers.textContent = stats.clientUsers || 0;
            if (clientUsersTrend) clientUsersTrend.textContent = stats.clientUsersTrend || 'N/A';
        };

        let userRoleChartInstance = null;
        const displayUserRoleChart = (users) => {
            const userRoleChartCanvas = document.getElementById('userRoleChart');
            if (!userRoleChartCanvas) return;
            const ctx = userRoleChartCanvas.getContext('2d');
            if (userRoleChartInstance) {
                userRoleChartInstance.destroy();
            }

            const roleCounts = users.reduce((acc, user) => {
                acc[user.role] = (acc[user.role] || 0) + 1;
                return acc;
            }, {});

            const labels = Object.keys(roleCounts);
            const data = Object.values(roleCounts);

            userRoleChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: ['#3498db', '#2ecc71', '#f39c12'],
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        };

        const displayUsersTable = (users) => {
            const tableBody = document.querySelector('#usersTable tbody');
            const userLoadingIndicator = document.getElementById('user-loading-indicator');
            const usersTable = document.getElementById('usersTable');

            if (!tableBody || !userLoadingIndicator || !usersTable) return;

            tableBody.innerHTML = '';
            userLoadingIndicator.style.display = 'none';
            usersTable.style.display = 'table';

            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No user data available.</td></tr>';
                return;
            }

            users.forEach(user => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = user.name;
                row.insertCell().textContent = user.email;
                row.insertCell().textContent = user.role;
                row.insertCell().textContent = user.status;
                row.insertCell().textContent = JSON.stringify(user.permissions || {});
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn edit-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const displayUserActionLogsTable = (logs) => {
            const tableBody = document.querySelector('#userActionsTable tbody');
            const actionLoadingIndicator = document.getElementById('action-loading-indicator');
            const userActionsTable = document.getElementById('userActionsTable');

            if (!tableBody || !actionLoadingIndicator || !userActionsTable) return;

            tableBody.innerHTML = '';
            actionLoadingIndicator.style.display = 'none';
            userActionsTable.style.display = 'table';

            if (logs.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="4">No action logs available.</td></tr>';
                return;
            }

            logs.forEach(log => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = new Date(log.timestamp).toLocaleString();
                row.insertCell().textContent = log.user_name || 'N/A';
                row.insertCell().textContent = log.action_type;
                row.insertCell().textContent = log.action_details;
            });
        };

        const loadAdminContent = async () => {
            const userLoadingIndicator = document.getElementById('user-loading-indicator');
            const usersTable = document.getElementById('usersTable');
            const actionLoadingIndicator = document.getElementById('action-loading-indicator');
            const userActionsTable = document.getElementById('userActionsTable');

            if (userLoadingIndicator) userLoadingIndicator.style.display = 'block';
            if (usersTable) usersTable.style.display = 'none';
            if (actionLoadingIndicator) actionLoadingIndicator.style.display = 'block';
            if (userActionsTable) userActionsTable.style.display = 'none';

            await loadDataForPage('adminPanelStats', displayAdminStats);
            await loadDataForPage('users', displayUsersTable, null, displayUserRoleChart);
            await loadDataForPage('userActions', displayUserActionLogsTable);
        };
        loadAdminContent();

        const resetDatabaseBtn = document.getElementById('resetDatabaseBtn');
        const loadSampleDataBtn = document.getElementById('loadSampleDataBtn');
        const addUserBtn = document.getElementById('addUserBtn');

        if (resetDatabaseBtn) {
            resetDatabaseBtn.addEventListener('click', () => {
                const resetDbConfirmModal = document.getElementById('resetDbConfirmModal');
                if (resetDbConfirmModal) resetDbConfirmModal.style.display = 'block';
            });
        }
        if (loadSampleDataBtn) {
            loadSampleDataBtn.addEventListener('click', () => {
                const loadSampleDataConfirmModal = document.getElementById('loadSampleDataConfirmModal');
                if (loadSampleDataConfirmModal) loadSampleDataConfirmModal.style.display = 'block';
            });
        }
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => {
                const userModalTitle = document.getElementById('userModalTitle');
                const userForm = document.getElementById('userForm');
                const userIdInput = document.getElementById('userId');
                const userPasswordInput = document.getElementById('userPassword');
                const userModal = document.getElementById('userModal');

                if (userModalTitle) userModalTitle.textContent = 'Add New User';
                if (userForm) userForm.reset();
                if (userIdInput) userIdInput.value = '';
                if (userPasswordInput) userPasswordInput.required = true;
                if (userModal) userModal.style.display = 'block';
            });
        }

        const userForm = document.getElementById('userForm');
        if (userForm) {
            userForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const userId = document.getElementById('userId').value;
                const userData = {
                    name: document.getElementById('userName').value,
                    email: document.getElementById('userEmail').value,
                    role: document.getElementById('userRole').value,
                    status: document.getElementById('userStatus').value,
                    permissions: {
                        permDashboard: document.getElementById('permDashboard').checked,
                        permReports: document.getElementById('permReports').checked,
                        permAdmin: document.getElementById('permAdmin').checked,
                        permClientPortal: document.getElementById('permClientPortal').checked,
                        permRegistryModify: document.getElementById('permRegistryModify').checked,
                        permPartsModify: document.getElementById('permPartsModify').checked,
                        permScheduleModify: document.getElementById('permScheduleModify').checked,
                        permRecordsModify: document.getElementById('permRecordsModify').checked,
                        permTeamModify: document.getElementById('permTeamModify').checked,
                        permImportData: document.getElementById('permImportData').checked,
                        permExportData: document.getElementById('permExportData').checked,
                    }
                };
                const passwordInput = document.getElementById('userPassword');
                const password = passwordInput ? passwordInput.value : '';
                if (password) {
                    userData.password = password;
                }

                let result;
                if (userId) {
                    result = await window.electronAPI.api.put('users', userId, userData);
                } else {
                    result = await window.electronAPI.api.post('users', userData);
                }

                if (result) {
                    alert('User saved successfully!');
                    const userModal = document.getElementById('userModal');
                    if (userModal) userModal.style.display = 'none';
                    loadAdminContent();
                } else {
                    alert('Failed to save user.');
                }
            });
        }

        const usersTable = document.getElementById('usersTable');
        if (usersTable) {
            usersTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const userId = e.target.dataset.id;
                    const user = await window.electronAPI.api.get('users', userId);
                    if (user) {
                        const userModalTitle = document.getElementById('userModalTitle');
                        const userIdInput = document.getElementById('userId');
                        const userNameInput = document.getElementById('userName');
                        const userEmailInput = document.getElementById('userEmail');
                        const userPasswordInput = document.getElementById('userPassword');
                        const userRoleInput = document.getElementById('userRole');
                        const userStatusInput = document.getElementById('userStatus');
                        const permDashboardInput = document.getElementById('permDashboard');
                        const permReportsInput = document.getElementById('permReports');
                        const permAdminInput = document.getElementById('permAdmin');
                        const permClientPortalInput = document.getElementById('permClientPortal');
                        const permRegistryModifyInput = document.getElementById('permRegistryModify');
                        const permPartsModifyInput = document.getElementById('permPartsModify');
                        const permScheduleModifyInput = document.getElementById('permScheduleModify');
                        const permRecordsModifyInput = document.getElementById('permRecordsModify');
                        const permTeamModifyInput = document.getElementById('permTeamModify');
                        const permImportDataInput = document.getElementById('permImportData');
                        const permExportDataInput = document.getElementById('permExportData');
                        const userModal = document.getElementById('userModal');

                        if (userModalTitle) userModalTitle.textContent = 'Edit User';
                        if (userIdInput) userIdInput.value = user.id;
                        if (userNameInput) userNameInput.value = user.name;
                        if (userEmailInput) userEmailInput.value = user.email;
                        if (userPasswordInput) {
                            userPasswordInput.value = '';
                            userPasswordInput.required = false;
                        }
                        if (userRoleInput) userRoleInput.value = user.role;
                        if (userStatusInput) userStatusInput.value = user.status;

                        if (permDashboardInput) permDashboardInput.checked = user.permissions?.permDashboard || false;
                        if (permReportsInput) permReportsInput.checked = user.permissions?.permReports || false;
                        if (permAdminInput) permAdminInput.checked = user.permissions?.permAdmin || false;
                        if (permClientPortalInput) permClientPortalInput.checked = user.permissions?.permClientPortal || false;
                        if (permRegistryModifyInput) permRegistryModifyInput.checked = user.permissions?.permRegistryModify || false;
                        if (permPartsModifyInput) permPartsModifyInput.checked = user.permissions?.permPartsModify || false;
                        if (permScheduleModifyInput) permScheduleModifyInput.checked = user.permissions?.permScheduleModify || false;
                        if (permRecordsModifyInput) permRecordsModifyInput.checked = user.permissions?.permRecordsModify || false;
                        if (permTeamModifyInput) permTeamModifyInput.checked = user.permissions?.permTeamModify || false;
                        if (permImportDataInput) permImportDataInput.checked = user.permissions?.permImportData || false;
                        if (permExportDataInput) permExportDataInput.checked = user.permissions?.permExportData || false;

                        if (userModal) userModal.style.display = 'block';
                    } else {
                        alert('User not found.');
                    }
                } else if (e.target.classList.contains('delete-btn')) {
                    const userId = e.target.dataset.id;
                    if (confirm(`Are you sure you want to delete user ${userId}?`)) {
                        const result = await window.electronAPI.api.delete('users', userId);
                        if (result) {
                            alert('User deleted successfully!');
                            loadAdminContent();
                        } else {
                            alert('Failed to delete user.');
                        }
                    }
                }
            });
        }

        const resetDbForm = document.getElementById('resetDbForm');
        if (resetDbForm) {
            resetDbForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('resetAdminEmail');
                const passwordInput = document.getElementById('resetAdminPassword');
                const email = emailInput ? emailInput.value : '';
                const password = passwordInput ? passwordInput.value : '';
                try {
                    const result = await window.electronAPI.admin.resetData({ email, password });
                    if (result.success) {
                        alert(result.message);
                        const resetDbConfirmModal = document.getElementById('resetDbConfirmModal');
                        if (resetDbConfirmModal) resetDbConfirmModal.style.display = 'none';
                        window.location.reload();
                    } else {
                        alert(result.message);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            });
        }

        const loadSampleDataForm = document.getElementById('loadSampleDataForm');
        if (loadSampleDataForm) {
            loadSampleDataForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('loadAdminEmail');
                const passwordInput = document.getElementById('loadAdminPassword');
                const email = emailInput ? emailInput.value : '';
                const password = passwordInput ? passwordInput.value : '';
                try {
                    const result = await window.electronAPI.admin.loadSampleData({ email, password });
                    if (result.success) {
                        alert(result.message);
                        const loadSampleDataConfirmModal = document.getElementById('loadSampleDataConfirmModal');
                        if (loadSampleDataConfirmModal) loadSampleDataConfirmModal.style.display = 'none';
                        loadAdminContent();
                    } else {
                        alert(result.message);
                    }
                } catch (error) {
                    alert(`Error: ${error.message}`);
                }
            });
        }

    } else if (currentPage === 'clientportal') {
        // Client Portal Logic
        const displayClientGenerators = (generators) => {
            const tableBody = document.querySelector('#clientGeneratorsTable tbody');
            const loadingIndicator = document.getElementById('loading-indicator');
            const clientGeneratorsTable = document.getElementById('clientGeneratorsTable');

            if (!tableBody || !loadingIndicator || !clientGeneratorsTable) return;

            tableBody.innerHTML = '';
            loadingIndicator.style.display = 'none';
            clientGeneratorsTable.style.display = 'table';

            if (generators.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No generator data available for your account.</td></tr>';
                return;
            }

            generators.forEach(gen => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = gen.model;
                row.insertCell().textContent = gen.serial_number;
                row.insertCell().textContent = gen.location;
                row.insertCell().textContent = gen.last_service || 'N/A';
                row.insertCell().textContent = gen.next_service || 'N/A';
                row.insertCell().textContent = gen.status;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `<button class="action-btn view-services-btn" data-id="${gen.id}"><i class="fas fa-eye"></i> View Services</button>`;
            });
        };

        const loadClientPortalContent = async () => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const clientGeneratorsTable = document.getElementById('clientGeneratorsTable');
            const clientNameDisplay = document.getElementById('clientNameDisplay');

            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (clientGeneratorsTable) clientGeneratorsTable.style.display = 'none';

            const currentUser = await window.electronAPI.getCurrentUser();
            if (clientNameDisplay) {
                if (currentUser && currentUser.name) {
                    clientNameDisplay.textContent = currentUser.name;
                } else {
                    clientNameDisplay.textContent = 'Guest';
                }
            }

            await loadDataForPage('generators', displayClientGenerators);
        };
        loadClientPortalContent();

        const clientGeneratorsTable = document.getElementById('clientGeneratorsTable');
        if (clientGeneratorsTable) {
            clientGeneratorsTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('view-services-btn')) {
                    const generatorId = e.target.dataset.id;
                    alert(`Viewing services for generator ID: ${generatorId}. (Feature to be implemented)`);
                }
            });
        }

    } else if (currentPage === 'parts') {
        // Parts Inventory Logic
        const displayPartsStats = (stats) => {
            const totalUniqueParts = document.getElementById('totalUniqueParts');
            const totalUniquePartsTrend = document.getElementById('totalUniquePartsTrend');
            const lowStockItems = document.getElementById('lowStockItems');
            const lowStockItemsTrend = document.getElementById('lowStockItemsTrend');
            const totalInventoryValue = document.getElementById('totalInventoryValue');
            const totalInventoryValueTrend = document.getElementById('totalInventoryValueTrend');
            const partsUsedLastMonth = document.getElementById('partsUsedLastMonth');
            const partsUsedLastMonthTrend = document.getElementById('partsUsedLastMonthTrend');

            if (totalUniqueParts) totalUniqueParts.textContent = stats.totalUniqueParts || 0;
            if (totalUniquePartsTrend) totalUniquePartsTrend.textContent = stats.totalUniquePartsTrend || 'N/A';
            if (lowStockItems) lowStockItems.textContent = stats.lowStockItems || 0;
            if (lowStockItemsTrend) lowStockItemsTrend.textContent = stats.lowStockItemsTrend || 'N/A';
            if (totalInventoryValue) totalInventoryValue.textContent = `Ksh ${stats.totalInventoryValue ? stats.totalInventoryValue.toLocaleString() : '0.00'}`;
            if (totalInventoryValueTrend) totalInventoryValueTrend.textContent = stats.totalInventoryValueTrend || 'N/A';
            if (partsUsedLastMonth) partsUsedLastMonth.textContent = stats.partsUsedLastMonth || 0;
            if (partsUsedLastMonthTrend) partsUsedLastMonthTrend.textContent = stats.partsUsedLastMonthTrend || 'N/A';
        };

        const displayPartsTable = (parts) => {
            const tableBody = document.querySelector('#partsTable tbody');
            const loadingIndicator = document.getElementById('loading-indicator');
            const partsTable = document.getElementById('partsTable');

            if (!tableBody || !loadingIndicator || !partsTable) return;

            tableBody.innerHTML = '';
            loadingIndicator.style.display = 'none';
            partsTable.style.display = 'table';

            if (parts.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No parts data available.</td></tr>';
                return;
            }

            parts.forEach(part => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = part.name;
                row.insertCell().textContent = part.part_number;
                row.insertCell().textContent = part.quantity_in_stock;
                row.insertCell().textContent = `Ksh ${part.cost_per_unit.toLocaleString()}`;
                row.insertCell().textContent = part.category || 'N/A';
                row.insertCell().textContent = part.status;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn edit-btn" data-id="${part.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${part.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const loadPartsContent = async () => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const partsTable = document.getElementById('partsTable');

            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (partsTable) partsTable.style.display = 'none';

            await loadDataForPage('parts', displayPartsTable, 'partsInventoryStats', displayPartsStats);
        };
        loadPartsContent();

        const addPartBtn = document.getElementById('addPartBtn');
        if (addPartBtn) {
            addPartBtn.addEventListener('click', () => {
                openModal('partModal', 'Add New Part');
            });
        }

        const partForm = document.getElementById('partForm');
        if (partForm) {
            partForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const partId = document.getElementById('partId').value;
                const partData = {
                    name: document.getElementById('partName').value,
                    part_number: document.getElementById('partNumber').value,
                    quantity_in_stock: parseInt(document.getElementById('quantityInStock').value),
                    cost_per_unit: parseFloat(document.getElementById('costPerUnit').value),
                    category: document.getElementById('partCategory').value,
                    min_stock_level: parseInt(document.getElementById('minStockLevel').value),
                    preferred_supplier: document.getElementById('preferredSupplier').value,
                    last_ordered: document.getElementById('lastOrdered').value,
                    used_last_month: parseInt(document.getElementById('usedLastMonth').value),
                    compatible_generators: document.getElementById('compatibleGenerators').value,
                    location: document.getElementById('partLocation').value,
                    reorder_point: parseInt(document.getElementById('reorderPoint').value),
                    lead_time: parseInt(document.getElementById('leadTime').value),
                    notes: document.getElementById('partNotes').value,
                    status: document.getElementById('partStatus').value,
                };

                let result;
                if (partId) {
                    result = await window.electronAPI.api.put('parts', partId, partData);
                } else {
                    result = await window.electronAPI.api.post('parts', partData);
                }

                if (result) {
                    alert('Part saved successfully!');
                    const partModal = document.getElementById('partModal');
                    if (partModal) partModal.style.display = 'none';
                    loadPartsContent();
                } else {
                    alert('Failed to save part.');
                }
            });
        }

        const partsTable = document.getElementById('partsTable');
        if (partsTable) {
            partsTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('edit-btn')) {
                    const partId = e.target.dataset.id;
                    const part = await window.electronAPI.api.get('parts', partId);
                    if (part) {
                        const partModalTitle = document.getElementById('partModalTitle');
                        const partIdInput = document.getElementById('partId');
                        const partNameInput = document.getElementById('partName');
                        const partNumberInput = document.getElementById('partNumber');
                        const quantityInStockInput = document.getElementById('quantityInStock');
                        const costPerUnitInput = document.getElementById('costPerUnit');
                        const partCategoryInput = document.getElementById('partCategory');
                        const minStockLevelInput = document.getElementById('minStockLevel');
                        const preferredSupplierInput = document.getElementById('preferredSupplier');
                        const lastOrderedInput = document.getElementById('lastOrdered');
                        const usedLastMonthInput = document.getElementById('usedLastMonth');
                        const compatibleGeneratorsInput = document.getElementById('compatibleGenerators');
                        const partLocationInput = document.getElementById('partLocation');
                        const reorderPointInput = document.getElementById('reorderPoint');
                        const leadTimeInput = document.getElementById('leadTime');
                        const partNotesInput = document.getElementById('partNotes');
                        const partStatusInput = document.getElementById('partStatus');
                        const partModal = document.getElementById('partModal');

                        if (partModalTitle) partModalTitle.textContent = 'Edit Part';
                        if (partIdInput) partIdInput.value = part.id;
                        if (partNameInput) partNameInput.value = part.name;
                        if (partNumberInput) partNumberInput.value = part.part_number;
                        if (quantityInStockInput) quantityInStockInput.value = part.quantity_in_stock;
                        if (costPerUnitInput) costPerUnitInput.value = part.cost_per_unit;
                        if (partCategoryInput) partCategoryInput.value = part.category;
                        if (minStockLevelInput) minStockLevelInput.value = part.min_stock_level;
                        if (preferredSupplierInput) preferredSupplierInput.value = part.preferred_supplier;
                        if (lastOrderedInput) lastOrderedInput.value = part.last_ordered;
                        if (usedLastMonthInput) usedLastMonthInput.value = part.used_last_month;
                        if (compatibleGeneratorsInput) compatibleGeneratorsInput.value = part.compatible_generators;
                        if (partLocationInput) partLocationInput.value = part.location;
                        if (reorderPointInput) reorderPointInput.value = part.reorder_point;
                        if (leadTimeInput) leadTimeInput.value = part.lead_time;
                        if (partNotesInput) partNotesInput.value = part.notes;
                        if (partStatusInput) partStatusInput.value = part.status;
                        if (partModal) partModal.style.display = 'block';
                    } else {
                        alert('Part not found.');
                    }
                } else if (e.target.classList.contains('delete-btn')) {
                    const partId = e.target.dataset.id;
                    if (confirm(`Are you sure you want to delete part ${partId}?`)) {
                        const result = await window.electronAPI.api.delete('parts', partId);
                        if (result) {
                            alert('Part deleted successfully!');
                            loadPartsContent();
                        } else {
                            alert('Failed to delete part.');
                        }
                    }
                }
            });
        }

    } else if (currentPage === 'records') {
        // Service Records Logic
        const displayServiceRecordsStats = (stats) => {
            const completedServices = document.getElementById('completedServices');
            const completedServicesTrend = document.getElementById('completedServicesTrend');
            const pendingServices = document.getElementById('pendingServices');
            const pendingServicesTrend = document.getElementById('pendingServicesTrend');
            const overdueRecords = document.getElementById('overdueRecords');
            const overdueRecordsTrend = document.getElementById('overdueRecordsTrend');
            const activeTechnicians = document.getElementById('activeTechnicians');
            const activeTechniciansTrend = document.getElementById('activeTechniciansTrend');

            if (completedServices) completedServices.textContent = stats.completedServices || 0;
            if (completedServicesTrend) completedServicesTrend.textContent = stats.completedServicesTrend || 'N/A';
            if (pendingServices) pendingServices.textContent = stats.pendingServices || 0;
            if (pendingServicesTrend) pendingServicesTrend.textContent = stats.pendingServicesTrend || 'N/A';
            if (overdueRecords) overdueRecords.textContent = stats.overdueRecords || 0;
            if (overdueRecordsTrend) overdueRecordsTrend.textContent = stats.overdueRecordsTrend || 'N/A';
            if (activeTechnicians) activeTechnicians.textContent = stats.activeTechnicians || 0;
            if (activeTechniciansTrend) activeTechniciansTrend.textContent = stats.activeTechniciansTrend || 'N/A';
        };

        const displayServiceRecordsTable = (services) => {
            const tableBody = document.querySelector('#serviceRecordsTable tbody');
            const loadingIndicator = document.getElementById('loading-indicator');
            const serviceRecordsTable = document.getElementById('serviceRecordsTable');

            if (!tableBody || !loadingIndicator || !serviceRecordsTable) return;

            tableBody.innerHTML = '';
            loadingIndicator.style.display = 'none';
            serviceRecordsTable.style.display = 'table';

            if (services.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No service records available.</td></tr>';
                return;
            }

            services.forEach(service => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = service.service_date;
                row.insertCell().textContent = service.generator_model || 'N/A';
                row.insertCell().textContent = service.service_type;
                row.insertCell().textContent = service.technician_name || 'N/A';
                row.insertCell().textContent = service.status;
                row.insertCell().textContent = `Ksh ${service.service_cost ? service.service_cost.toLocaleString() : '0.00'}`;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn view-btn" data-id="${service.id}"><i class="fas fa-eye"></i> View</button>
                    <button class="action-btn edit-btn" data-id="${service.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${service.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const loadServiceRecordsContent = async () => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const serviceRecordsTable = document.getElementById('serviceRecordsTable');

            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (serviceRecordsTable) serviceRecordsTable.style.display = 'none';

            await loadDataForPage('services', displayServiceRecordsTable, 'serviceRecordsStats', displayServiceRecordsStats);
        };
        loadServiceRecordsContent();

        const addServiceBtn = document.getElementById('addServiceBtn');
        if (addServiceBtn) {
            addServiceBtn.addEventListener('click', () => {
                alert('Add New Service functionality to be implemented.');
            });
        }

        const serviceRecordsTable = document.getElementById('serviceRecordsTable');
        if (serviceRecordsTable) {
            serviceRecordsTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('view-btn')) {
                    const serviceId = e.target.dataset.id;
                    const service = await window.electronAPI.api.get('services', serviceId);
                    if (service) {
                        const serviceDetailsModal = document.getElementById('serviceDetailsModal');
                        if (serviceDetailsModal) {
                            serviceDetailsModal.querySelector('[data-key="id"]').textContent = service.id;
                            serviceDetailsModal.querySelector('[data-key="service_date"]').textContent = service.service_date;
                            serviceDetailsModal.querySelector('[data-key="duration"]').textContent = service.duration ? `${service.duration} hours` : 'N/A';
                            serviceDetailsModal.querySelector('[data-key="service_type"]').textContent = service.service_type;
                            serviceDetailsModal.querySelector('[data-key="generator_model"]').textContent = service.generator_model;
                            serviceDetailsModal.querySelector('[data-key="generator_serial"]').textContent = service.generator_serial;
                            serviceDetailsModal.querySelector('[data-key="generator_location"]').textContent = service.generator_location;
                            serviceDetailsModal.querySelector('[data-key="total_hours_run"]').textContent = service.total_hours_run || 'N/A';
                            serviceDetailsModal.querySelector('[data-key="technician_name"]').textContent = service.technician_name;
                            serviceDetailsModal.querySelector('[data-key="technician_email"]').textContent = service.technician_email || 'N/A';
                            serviceDetailsModal.querySelector('[data-key="technician_team"]').textContent = service.technician_team || 'N/A';
                            serviceDetailsModal.querySelector('[data-key="technician_certifications"]').textContent = service.technician_certifications || 'N/A';
                            serviceDetailsModal.querySelector('[data-key="status"]').textContent = service.status;
                            serviceDetailsModal.querySelector('[data-key="generator_next_service"]').textContent = service.generator_next_service || 'N/A';
                            serviceDetailsModal.querySelector('[data-key="service_cost"]').textContent = `Ksh ${service.service_cost ? service.service_cost.toLocaleString() : '0.00'}`;
                            serviceDetailsModal.querySelector('[data-key="work_order"]').textContent = service.work_order || 'N/A';
                            serviceDetailsModal.querySelector('[data-key="notes"]').textContent = service.notes || 'No notes.';

                            const partsUsedList = serviceDetailsModal.querySelector('[data-key="parts_used"]');
                            if (partsUsedList) {
                                partsUsedList.innerHTML = '';
                                if (service.parts_used) {
                                    try {
                                        const parts = JSON.parse(service.parts_used);
                                        if (Array.isArray(parts) && parts.length > 0) {
                                            parts.forEach(p => {
                                                const listItem = document.createElement('li');
                                                listItem.textContent = `Part ID: ${p.part_id}, Quantity: ${p.quantity}`;
                                                partsUsedList.appendChild(listItem);
                                            });
                                        } else {
                                            partsUsedList.innerHTML = '<li>No parts used.</li>';
                                        }
                                    } catch (e) {
                                        partsUsedList.innerHTML = '<li>Error parsing parts data.</li>';
                                        console.error('Error parsing parts_used:', e);
                                    }
                                } else {
                                    partsUsedList.innerHTML = '<li>No parts used.</li>';
                                }
                            }
                            serviceDetailsModal.style.display = 'block';
                        }
                    } else {
                        alert('Service record not found.');
                    }
                } else if (e.target.classList.contains('edit-btn')) {
                    const serviceId = e.target.dataset.id;
                    alert(`Editing service record ID: ${serviceId}. (Functionality to be implemented)`);
                } else if (e.target.classList.contains('delete-btn')) {
                    const serviceId = e.target.dataset.id;
                    if (confirm(`Are you sure you want to delete service record ${serviceId}?`)) {
                        const result = await window.electronAPI.api.delete('services', serviceId);
                        if (result) {
                            alert('Service record deleted successfully!');
                            loadServiceRecordsContent();
                        } else {
                            alert('Failed to delete service record.');
                        }
                    }
                }
            });
        }

        document.querySelectorAll('.modal .close-modal, .modal .btn-close').forEach(button => {
            button.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

    } else if (currentPage === 'registry') {
        // Registry Page Logic
        const displayRegistryStats = (stats) => {
            const totalGenerators = document.getElementById('totalGenerators');
            const totalGeneratorsTrend = document.getElementById('totalGeneratorsTrend');
            const activeGenerators = document.getElementById('activeGenerators');
            const activeGeneratorsTrend = document.getElementById('activeGeneratorsTrend');
            const generatorsDueForService = document.getElementById('generatorsDueForService');
            const generatorsDueForServiceTrend = document.getElementById('generatorsDueForServiceTrend');
            const generatorsUnderWarranty = document.getElementById('generatorsUnderWarranty');
            const generatorsUnderWarrantyTrend = document.getElementById('generatorsUnderWarrantyTrend');

            if (totalGenerators) totalGenerators.textContent = stats.totalGenerators || 0;
            if (totalGeneratorsTrend) totalGeneratorsTrend.textContent = stats.totalGeneratorsTrend || 'N/A';
            if (activeGenerators) activeGenerators.textContent = stats.activeGenerators || 0;
            if (activeGeneratorsTrend) activeGeneratorsTrend.textContent = stats.activeGeneratorsTrend || 'N/A';
            if (generatorsDueForService) generatorsDueForService.textContent = stats.generatorsDueForService || 0;
            if (generatorsDueForServiceTrend) generatorsDueForServiceTrend.textContent = stats.generatorsDueForServiceTrend || 'N/A';
            if (generatorsUnderWarranty) generatorsUnderWarranty.textContent = stats.generatorsUnderWarranty || 0;
            if (generatorsUnderWarrantyTrend) generatorsUnderWarrantyTrend.textContent = stats.generatorsUnderWarrantyTrend || 'N/A';
        };

        const displayGeneratorsTable = (generators) => {
            const tableBody = document.querySelector('#generatorsTable tbody');
            const loadingIndicator = document.getElementById('loading-indicator');
            const generatorsTable = document.getElementById('generatorsTable');

            if (!tableBody || !loadingIndicator || !generatorsTable) return;

            tableBody.innerHTML = '';
            loadingIndicator.style.display = 'none';
            generatorsTable.style.display = 'table';

            if (generators.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8">No generator data available.</td></tr>';
                return;
            }

            generators.forEach(gen => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = gen.model;
                row.insertCell().textContent = gen.serial_number;
                row.insertCell().textContent = gen.location;
                row.insertCell().textContent = gen.client_name || 'N/A';
                row.insertCell().textContent = gen.assigned_tech_name || 'N/A';
                row.insertCell().textContent = gen.last_service || 'N/A';
                row.insertCell().textContent = gen.next_service || 'N/A';
                row.insertCell().textContent = gen.status;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn view-btn" data-id="${gen.id}"><i class="fas fa-eye"></i> View</button>
                    <button class="action-btn edit-btn" data-id="${gen.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${gen.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const loadRegistryContent = async () => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const generatorsTable = document.getElementById('generatorsTable');

            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (generatorsTable) generatorsTable.style.display = 'none';

            await loadDataForPage('generators', displayGeneratorsTable, 'registryStats', displayRegistryStats);
        };
        loadRegistryContent();

        const addGeneratorBtn = document.getElementById('addGeneratorBtn');
        if (addGeneratorBtn) {
            addGeneratorBtn.addEventListener('click', async () => {
                openModal('generatorModal', 'Add New Generator');
                const clients = await window.electronAPI.api.get('users');
                const clientSelect = document.getElementById('generatorClientId');
                if (clientSelect) {
                    clientSelect.innerHTML = '<option value="">Select Client</option>';
                    clients.filter(u => u.role === 'client').forEach(client => {
                        const option = document.createElement('option');
                        option.value = client.id;
                        option.textContent = client.name;
                        clientSelect.appendChild(option);
                    });
                }

                const technicians = await window.electronAPI.api.get('technicians');
                const techSelect = document.getElementById('generatorAssignedTech');
                if (techSelect) {
                    techSelect.innerHTML = '<option value="">Select Technician</option>';
                    technicians.forEach(tech => {
                        const option = document.createElement('option');
                        option.value = tech.id;
                        option.textContent = tech.name;
                        techSelect.appendChild(option);
                    });
                }
            });
        }

        const generatorForm = document.getElementById('generatorForm');
        if (generatorForm) {
            generatorForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const generatorId = document.getElementById('generatorId').value;
                const generatorData = {
                    model: document.getElementById('generatorModel').value,
                    type: document.getElementById('generatorType').value,
                    serial_number: document.getElementById('generatorSerial').value,
                    location: document.getElementById('generatorLocation').value,
                    purchase_date: document.getElementById('generatorPurchaseDate').value,
                    warranty_end: document.getElementById('generatorWarrantyEnd').value,
                    supplier: document.getElementById('generatorSupplier').value,
                    cost: parseFloat(document.getElementById('generatorCost').value),
                    total_hours_run: parseFloat(document.getElementById('generatorTotalHoursRun').value),
                    last_service: document.getElementById('generatorLastService').value,
                    next_service: document.getElementById('generatorNextService').value,
                    status: document.getElementById('generatorStatus').value,
                    client_id: document.getElementById('generatorClientId').value || null,
                    assigned_tech_id: document.getElementById('generatorAssignedTech').value || null,
                    notes: document.getElementById('generatorNotes').value
                };

                try {
                    let result;
                    if (generatorId) {
                        result = await window.electronAPI.api.put('generators', generatorId, generatorData);
                        alert('Generator updated successfully!');
                    } else {
                        result = await window.electronAPI.api.post('generators', generatorData);
                        alert('Generator added successfully!');
                    }
                    closeModal('generatorModal');
                    loadRegistryContent();
                } catch (error) {
                    console.error('Error saving generator:', error);
                    alert('Failed to save generator: ' + error.message);
                }
            });
        }

        const generatorsTable = document.getElementById('generatorsTable');
        if (generatorsTable) {
            generatorsTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('view-btn')) {
                    const generatorId = e.target.dataset.id;
                    const generator = await window.electronAPI.api.get('generators', generatorId);
                    if (generator) {
                        alert(`Viewing details for generator: ${generator.model} (${generator.serial_number})`);
                    } else {
                        alert('Generator not found.');
                    }
                } else if (e.target.classList.contains('edit-btn')) {
                    const generatorId = e.target.dataset.id;
                    const generator = await window.electronAPI.api.get('generators', generatorId);
                    if (generator) {
                        openModal('generatorModal', 'Edit Generator', {
                            id: generator.id,
                            generatorModel: generator.model,
                            generatorType: generator.type,
                            generatorSerial: generator.serial_number,
                            generatorLocation: generator.location,
                            generatorPurchaseDate: generator.purchase_date,
                            generatorWarrantyEnd: generator.warranty_end,
                            generatorSupplier: generator.supplier,
                            generatorCost: generator.cost,
                            generatorTotalHoursRun: generator.total_hours_run,
                            generatorLastService: generator.last_service,
                            generatorNextService: generator.next_service,
                            generatorStatus: generator.status,
                            generatorClientId: generator.client_id,
                            generatorAssignedTech: generator.assigned_tech_id,
                            generatorNotes: generator.notes
                        });

                        const clients = await window.electronAPI.api.get('users');
                        const clientSelect = document.getElementById('generatorClientId');
                        if (clientSelect) {
                            clientSelect.innerHTML = '<option value="">Select Client</option>';
                            clients.filter(u => u.role === 'client').forEach(client => {
                                const option = document.createElement('option');
                                option.value = client.id;
                                option.textContent = client.name;
                                clientSelect.appendChild(option);
                            });
                            clientSelect.value = generator.client_id || '';
                        }

                        const technicians = await window.electronAPI.api.get('technicians');
                        const techSelect = document.getElementById('generatorAssignedTech');
                        if (techSelect) {
                            techSelect.innerHTML = '<option value="">Select Technician</option>';
                            technicians.forEach(tech => {
                                const option = document.createElement('option');
                                option.value = tech.id;
                                option.textContent = tech.name;
                                techSelect.appendChild(option);
                            });
                            techSelect.value = generator.assigned_tech_id || '';
                        }

                    } else {
                        alert('Generator not found.');
                    }
                } else if (e.target.classList.contains('delete-btn')) {
                    const generatorId = e.target.dataset.id;
                    if (confirm(`Are you sure you want to delete generator ${generatorId}?`)) {
                        const result = await window.electronAPI.api.delete('generators', generatorId);
                        if (result) {
                            alert('Generator deleted successfully!');
                            loadRegistryContent();
                        } else {
                            alert('Failed to delete generator.');
                        }
                    }
                }
            });
        }

    } else if (currentPage === 'schedule') {
        // Schedule Page Logic
        const displayScheduleStats = (stats) => {
            const upcomingServices = document.getElementById('upcomingServices');
            const upcomingServicesTrend = document.getElementById('upcomingServicesTrend');
            const pendingServicesSchedule = document.getElementById('pendingServicesSchedule');
            const pendingServicesScheduleTrend = document.getElementById('pendingServicesScheduleTrend');
            const overdueServicesSchedule = document.getElementById('overdueServicesSchedule');
            const overdueServicesScheduleTrend = document.getElementById('overdueServicesScheduleTrend');
            const servicesCompletedThisMonth = document.getElementById('servicesCompletedThisMonth');
            const servicesCompletedThisMonthTrend = document.getElementById('servicesCompletedThisMonthTrend');

            if (upcomingServices) upcomingServices.textContent = stats.upcomingServices || 0;
            if (upcomingServicesTrend) upcomingServicesTrend.textContent = stats.upcomingServicesTrend || 'N/A';
            if (pendingServicesSchedule) pendingServicesSchedule.textContent = stats.pendingServicesSchedule || 0;
            if (pendingServicesScheduleTrend) pendingServicesScheduleTrend.textContent = stats.pendingServicesScheduleTrend || 'N/A';
            if (overdueServicesSchedule) overdueServicesSchedule.textContent = stats.overdueServicesSchedule || 0;
            if (overdueServicesScheduleTrend) overdueServicesScheduleTrend.textContent = stats.overdueServicesScheduleTrend || 'N/A';
            if (servicesCompletedThisMonth) servicesCompletedThisMonth.textContent = stats.servicesCompletedThisMonth || 0;
            if (servicesCompletedThisMonthTrend) servicesCompletedThisMonthTrend.textContent = stats.servicesCompletedThisMonthTrend || 'N/A';
        };

        const displayScheduledServicesTable = (services) => {
            const tableBody = document.querySelector('#scheduleTable tbody');
            const loadingIndicator = document.getElementById('loading-indicator');
            const scheduleTable = document.getElementById('scheduleTable');

            if (!tableBody || !loadingIndicator || !scheduleTable) return;

            tableBody.innerHTML = '';
            loadingIndicator.style.display = 'none';
            scheduleTable.style.display = 'table';

            if (services.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No scheduled services available.</td></tr>';
                return;
            }

            services.forEach(service => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = service.service_date;
                row.insertCell().textContent = service.generator_model || 'N/A';
                row.insertCell().textContent = service.service_type;
                row.insertCell().textContent = service.technician_name || 'N/A';
                row.insertCell().textContent = service.status;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn view-btn" data-id="${service.id}"><i class="fas fa-eye"></i> View</button>
                    <button class="action-btn edit-btn" data-id="${service.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${service.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const loadScheduleContent = async () => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const scheduleTable = document.getElementById('scheduleTable');

            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (scheduleTable) scheduleTable.style.display = 'none';

            await loadDataForPage('services', displayScheduledServicesTable, 'scheduleStats', displayScheduleStats);
        };
        loadScheduleContent();

        const addScheduledServiceBtn = document.getElementById('addScheduledServiceBtn');
        if (addScheduledServiceBtn) {
            addScheduledServiceBtn.addEventListener('click', async () => {
                openModal('serviceModal', 'Add New Service');
                const generators = await window.electronAPI.api.get('generators');
                const genSelect = document.getElementById('serviceGeneratorId');
                if (genSelect) {
                    genSelect.innerHTML = '<option value="">Select Generator</option>';
                    generators.forEach(gen => {
                        const option = document.createElement('option');
                        option.value = gen.id;
                        option.textContent = `${gen.model} (${gen.serial_number})`;
                        genSelect.appendChild(option);
                    });
                }

                const technicians = await window.electronAPI.api.get('technicians');
                const techSelect = document.getElementById('serviceTechnicianId');
                if (techSelect) {
                    techSelect.innerHTML = '<option value="">Select Technician</option>';
                    technicians.forEach(tech => {
                        const option = document.createElement('option');
                        option.value = tech.id;
                        option.textContent = tech.name;
                        techSelect.appendChild(option);
                    });
                }

                const partsUsedContainer = document.getElementById('partsUsedContainer');
                if (partsUsedContainer) {
                    partsUsedContainer.innerHTML = '<button type="button" id="addPartUsedBtn" class="reports-button" style="margin-top: 10px;"><i class="fas fa-plus"></i> Add Part</button>';
                    const addPartUsedBtn = document.getElementById('addPartUsedBtn');
                    if (addPartUsedBtn) addPartUsedBtn.addEventListener('click', addPartUsedField);
                }
            });
        }

        function addPartUsedField() {
            const container = document.getElementById('partsUsedContainer');
            if (!container) return;
            const div = document.createElement('div');
            div.classList.add('part-used-item');
            div.innerHTML = `
                <select class="part-select" required></select>
                <input type="number" class="quantity-input" placeholder="Quantity" min="1" value="1" required>
                <button type="button" class="remove-part-btn">X</button>
            `;
            container.insertBefore(div, container.lastElementChild);

            const partSelect = div.querySelector('.part-select');
            if (partSelect) populatePartSelect(partSelect);

            const removePartBtn = div.querySelector('.remove-part-btn');
            if (removePartBtn) {
                removePartBtn.addEventListener('click', () => {
                    div.remove();
                });
            }
        }

        async function populatePartSelect(selectElement) {
            const parts = await window.electronAPI.api.get('parts');
            selectElement.innerHTML = '<option value="">Select Part</option>';
            parts.forEach(part => {
                const option = document.createElement('option');
                option.value = part.id;
                option.textContent = `${part.name} (${part.part_number})`;
                selectElement.appendChild(option);
            });
        }

        const serviceForm = document.getElementById('serviceForm');
        if (serviceForm) {
            serviceForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const serviceId = document.getElementById('serviceId').value;
                const partsUsed = [];
                document.querySelectorAll('#partsUsedContainer .part-used-item').forEach(item => {
                    const partSelect = item.querySelector('.part-select');
                    const quantityInput = item.querySelector('.quantity-input');
                    const partId = partSelect ? partSelect.value : '';
                    const quantity = quantityInput ? parseInt(quantityInput.value) : 0;
                    if (partId && quantity) {
                        partsUsed.push({ part_id: partId, quantity: quantity });
                    }
                });

                const serviceData = {
                    generator_id: document.getElementById('serviceGeneratorId').value,
                    service_date: document.getElementById('serviceDate').value,
                    service_type: document.getElementById('serviceType').value,
                    technician_id: document.getElementById('serviceTechnicianId').value,
                    status: document.getElementById('serviceStatus').value,
                    duration: parseFloat(document.getElementById('serviceDuration').value),
                    service_cost: parseFloat(document.getElementById('serviceCost').value),
                    work_order: document.getElementById('serviceWorkOrder').value,
                    notes: document.getElementById('serviceNotes').value,
                    parts_used: JSON.stringify(partsUsed)
                };

                try {
                    let result;
                    if (serviceId) {
                        result = await window.electronAPI.api.put('services', serviceId, serviceData);
                        alert('Service updated successfully!');
                    } else {
                        result = await window.electronAPI.api.post('services', serviceData);
                        alert('Service added successfully!');
                    }
                    closeModal('serviceModal');
                    loadScheduleContent();
                } catch (error) {
                    console.error('Error saving service:', error);
                    alert('Failed to save service: ' + error.message);
                }
            });
        }

        const scheduleTable = document.getElementById('scheduleTable');
        if (scheduleTable) {
            scheduleTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('view-btn')) {
                    const serviceId = e.target.dataset.id;
                    const service = await window.electronAPI.api.get('services', serviceId);
                    if (service) {
                        alert(`Viewing details for scheduled service: ${service.service_type} on ${service.service_date}`);
                    } else {
                        alert('Scheduled service not found.');
                    }
                } else if (e.target.classList.contains('edit-btn')) {
                    const serviceId = e.target.dataset.id;
                    const service = await window.electronAPI.api.get('services', serviceId);
                    if (service) {
                        openModal('serviceModal', 'Edit Service', {
                            id: service.id,
                            serviceGeneratorId: service.generator_id,
                            serviceDate: service.service_date,
                            serviceType: service.service_type,
                            serviceTechnicianId: service.technician_id,
                            serviceStatus: service.status,
                            serviceDuration: service.duration,
                            serviceCost: service.service_cost,
                            serviceWorkOrder: service.work_order,
                            serviceNotes: service.notes
                        });

                        const generators = await window.electronAPI.api.get('generators');
                        const genSelect = document.getElementById('serviceGeneratorId');
                        if (genSelect) {
                            genSelect.innerHTML = '<option value="">Select Generator</option>';
                            generators.forEach(gen => {
                                const option = document.createElement('option');
                                option.value = gen.id;
                                option.textContent = `${gen.model} (${gen.serial_number})`;
                                genSelect.appendChild(option);
                            });
                            genSelect.value = service.generator_id || '';
                        }

                        const technicians = await window.electronAPI.api.get('technicians');
                        const techSelect = document.getElementById('serviceTechnicianId');
                        if (techSelect) {
                            techSelect.innerHTML = '<option value="">Select Technician</option>';
                            technicians.forEach(tech => {
                                const option = document.createElement('option');
                                option.value = tech.id;
                                option.textContent = tech.name;
                                techSelect.appendChild(option);
                            });
                            techSelect.value = service.technician_id || '';
                        }

                        const partsUsedContainer = document.getElementById('partsUsedContainer');
                        if (partsUsedContainer) {
                            partsUsedContainer.innerHTML = '';
                            if (service.parts_used) {
                                try {
                                    const parts = JSON.parse(service.parts_used);
                                    if (Array.isArray(parts)) {
                                        parts.forEach(p => {
                                            addPartUsedField();
                                            const lastItem = partsUsedContainer.lastElementChild ? partsUsedContainer.lastElementChild.previousElementSibling : null;
                                            if (lastItem) {
                                                const partSelect = lastItem.querySelector('.part-select');
                                                const quantityInput = lastItem.querySelector('.quantity-input');
                                                if (partSelect) partSelect.value = p.part_id;
                                                if (quantityInput) quantityInput.value = p.quantity;
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.error('Error parsing parts_used for edit:', e);
                                }
                            }
                            partsUsedContainer.innerHTML += '<button type="button" id="addPartUsedBtn" class="reports-button" style="margin-top: 10px;"><i class="fas fa-plus"></i> Add Part</button>';
                            const addPartUsedBtn = document.getElementById('addPartUsedBtn');
                            if (addPartUsedBtn) addPartUsedBtn.addEventListener('click', addPartUsedField);
                        }

                    } else {
                        alert('Scheduled service not found.');
                    }
                } else if (e.target.classList.contains('delete-btn')) {
                    const serviceId = e.target.dataset.id;
                    if (confirm(`Are you sure you want to delete scheduled service ${serviceId}?`)) {
                        const result = await window.electronAPI.api.delete('services', serviceId);
                        if (result) {
                            alert('Scheduled service deleted successfully!');
                            loadScheduleContent();
                        } else {
                            alert('Failed to delete scheduled service.');
                        }
                    }
                }
            });
        }

    } else if (currentPage === 'team') {
        // Team Page Logic
        const displayTeamStats = (stats) => {
            const activeTechnicians = document.getElementById('activeTechnicians');
            const activeTechniciansTrend = document.getElementById('activeTechniciansTrend');
            const certificationsDue = document.getElementById('certificationsDue');
            const certificationsDueTrend = document.getElementById('certificationsDueTrend');
            const overdueAssignments = document.getElementById('overdueAssignments');
            const overdueAssignmentsTrend = document.getElementById('overdueAssignmentsTrend');
            const avgServicesPerTech = document.getElementById('avgServicesPerTech');
            const avgServicesPerTechTrend = document.getElementById('avgServicesPerTechTrend');

            if (activeTechnicians) activeTechnicians.textContent = stats.activeTechnicians || 0;
            if (activeTechniciansTrend) activeTechniciansTrend.textContent = stats.activeTechniciansTrend || 'N/A';
            if (certificationsDue) certificationsDue.textContent = stats.certificationsDue || 0;
            if (certificationsDueTrend) certificationsDueTrend.textContent = stats.certificationsDueTrend || 'N/A';
            if (overdueAssignments) overdueAssignments.textContent = stats.overdueAssignments || 0;
            if (overdueAssignmentsTrend) overdueAssignmentsTrend.textContent = stats.overdueAssignmentsTrend || 'N/A';
            if (avgServicesPerTech) avgServicesPerTech.textContent = stats.avgServicesPerTech || 'N/A';
            if (avgServicesPerTechTrend) avgServicesPerTechTrend.textContent = stats.avgServicesPerTechTrend || 'N/A';
        };

        const displayTechniciansTable = (technicians) => {
            const tableBody = document.querySelector('#techniciansTable tbody');
            const loadingIndicator = document.getElementById('loading-indicator');
            const techniciansTable = document.getElementById('techniciansTable');

            if (!tableBody || !loadingIndicator || !techniciansTable) return;

            tableBody.innerHTML = '';
            loadingIndicator.style.display = 'none';
            techniciansTable.style.display = 'table';

            if (technicians.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7">No technician data available.</td></tr>';
                return;
            }

            technicians.forEach(tech => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = tech.name;
                row.insertCell().textContent = tech.email;
                row.insertCell().textContent = tech.phone || 'N/A';
                row.insertCell().textContent = tech.team || 'N/A';
                row.insertCell().textContent = tech.certifications || 'N/A';
                row.insertCell().textContent = tech.status;
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn view-btn" data-id="${tech.id}"><i class="fas fa-eye"></i> View</button>
                    <button class="action-btn edit-btn" data-id="${tech.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${tech.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const loadTeamContent = async () => {
            const loadingIndicator = document.getElementById('loading-indicator');
            const techniciansTable = document.getElementById('techniciansTable');

            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (techniciansTable) techniciansTable.style.display = 'none';

            await loadDataForPage('technicians', displayTechniciansTable, 'teamManagementStats', displayTeamStats);
        };
        loadTeamContent();

        const addTechnicianBtn = document.getElementById('addTechnicianBtn');
        if (addTechnicianBtn) {
            addTechnicianBtn.addEventListener('click', () => {
                openModal('technicianModal', 'Add New Technician');
                const technicianIdInput = document.getElementById('technicianId');
                const techPasswordInput = document.getElementById('techPassword');
                if (technicianIdInput) technicianIdInput.value = '';
                if (techPasswordInput) techPasswordInput.required = true;
            });
        }

        const technicianForm = document.getElementById('technicianForm');
        if (technicianForm) {
            technicianForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const technicianId = document.getElementById('technicianId').value;
                const technicianData = {
                    name: document.getElementById('techName').value,
                    email: document.getElementById('techEmail').value,
                    phone: document.getElementById('techPhone').value,
                    employee_id: document.getElementById('techEmployeeId').value,
                    hire_date: document.getElementById('techHireDate').value,
                    team: document.getElementById('techTeam').value,
                    certifications: document.getElementById('techCertifications').value,
                    specialties: document.getElementById('techSpecialties').value,
                    notes: document.getElementById('techNotes').value,
                    status: document.getElementById('techStatus').value,
                    role: 'technician'
                };
                const techPasswordInput = document.getElementById('techPassword');
                const password = techPasswordInput ? techPasswordInput.value : '';
                if (password) {
                    technicianData.password = password;
                }

                try {
                    let result;
                    if (technicianId) {
                        result = await window.electronAPI.api.put('technicians', technicianId, technicianData);
                        alert('Technician updated successfully!');
                    } else {
                        result = await window.electronAPI.api.post('technicians', technicianData);
                        alert('Technician added successfully!');
                    }
                    closeModal('technicianModal');
                    loadTeamContent();
                } catch (error) {
                    console.error('Error saving technician:', error);
                    alert('Failed to save technician: ' + error.message);
                }
            });
        }

        const techniciansTable = document.getElementById('techniciansTable');
        if (techniciansTable) {
            techniciansTable.addEventListener('click', async (e) => {
                if (e.target.classList.contains('view-btn')) {
                    const techId = e.target.dataset.id;
                    const technician = await window.electronAPI.api.get('technicians', techId);
                    if (technician) {
                        alert(`Viewing details for technician: ${technician.name} (${technician.email})`);
                    } else {
                        alert('Technician not found.');
                    }
                } else if (e.target.classList.contains('edit-btn')) {
                    const techId = e.target.dataset.id;
                    const technician = await window.electronAPI.api.get('technicians', techId);
                    if (technician) {
                        openModal('technicianModal', 'Edit Technician', {
                            id: technician.id,
                            techName: technician.name,
                            techEmail: technician.email,
                            techPhone: technician.phone,
                            techEmployeeId: technician.employee_id,
                            techHireDate: technician.hire_date,
                            techTeam: technician.team,
                            techCertifications: technician.certifications,
                            techSpecialties: technician.specialties,
                            techNotes: technician.notes,
                            techStatus: technician.status
                        });
                        const techPasswordInput = document.getElementById('techPassword');
                        if (techPasswordInput) techPasswordInput.required = false;
                    } else {
                        alert('Technician not found.');
                    }
                } else if (e.target.classList.contains('delete-btn')) {
                    const techId = e.target.dataset.id;
                    if (confirm(`Are you sure you want to delete technician ${techId}?`)) {
                        const result = await window.electronAPI.api.delete('technicians', techId);
                        if (result) {
                            alert('Technician deleted successfully!');
                            loadTeamContent();
                        } else {
                            alert('Failed to delete technician.');
                        }
                    }
                }
            });
        }

    } else if (currentPage === 'reports') {
        // Reports Page Logic
        const displayReportsStats = (stats) => {
            const totalRevenue = document.getElementById('totalRevenue');
            const totalRevenueTrend = document.getElementById('totalRevenueTrend');
            const mostUsedPart = document.getElementById('mostUsedPart');
            const topPerformingTechnician = document.getElementById('topPerformingTechnician');
            const serviceCompletionRate = document.getElementById('serviceCompletionRate');
            const serviceCompletionRateTrend = document.getElementById('serviceCompletionRateTrend');

            if (totalRevenue) totalRevenue.textContent = `Ksh ${stats.totalRevenue ? stats.totalRevenue.toLocaleString() : '0.00'}`;
            if (totalRevenueTrend) totalRevenueTrend.textContent = stats.totalRevenueTrend || 'N/A';
            if (mostUsedPart) mostUsedPart.textContent = stats.mostUsedPart || 'N/A';
            if (topPerformingTechnician) topPerformingTechnician.textContent = stats.topPerformingTechnician || 'N/A';
            if (serviceCompletionRate) serviceCompletionRate.textContent = stats.serviceCompletionRate ? `${stats.serviceCompletionRate}%` : 'N/A';
            if (serviceCompletionRateTrend) serviceCompletionRateTrend.textContent = stats.serviceCompletionRateTrend || 'N/A';
        };

        let serviceCostChartInstance = null;
        const displayServiceCostChart = (chartData) => {
            const serviceCostByTypeChartCanvas = document.getElementById('serviceCostByTypeChart');
            if (!serviceCostByTypeChartCanvas) return;
            const ctx = serviceCostByTypeChartCanvas.getContext('2d');
            if (serviceCostChartInstance) {
                serviceCostChartInstance.destroy();
            }
            serviceCostChartInstance = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += `Ksh ${context.parsed.toLocaleString()}`;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        };

        let generatorStatusChartInstance = null;
        const displayGeneratorStatusChart = (chartData) => {
            const generatorStatusChartCanvas = document.getElementById('generatorStatusChart');
            if (!generatorStatusChartCanvas) return;
            const ctx = generatorStatusChartCanvas.getContext('2d');
            if (generatorStatusChartInstance) {
                generatorStatusChartInstance.destroy();
            }
            generatorStatusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += context.parsed;
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });
        };

        let partsStockChartInstance = null;
        const displayPartsStockChart = (chartData) => {
            const partsStockChartCanvas = document.getElementById('partsStockChart');
            if (!partsStockChartCanvas) return;
            const ctx = partsStockChartCanvas.getContext('2d');
            if (partsStockChartInstance) {
                partsStockChartInstance.destroy();
            }
            partsStockChartInstance = new Chart(ctx, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Quantity'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Part Name'
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top'
                        }
                    }
                }
            });
        };

        const loadReportsContent = async () => {
            await loadDataForPage('reportsStats', displayReportsStats);
            await loadDataForPage('serviceCostByTypeChartData', displayServiceCostChart);
            await loadDataForPage('generatorStatusChartData', displayGeneratorStatusChart);
            await loadDataForPage('partsStockChartData', displayPartsStockChart);
        };
        loadReportsContent();
    }

    async function renderServiceTrendChartAndTable() {
        let chartData;
        try {
            chartData = await window.electronAPI.api.get('chartData');
        } catch {
            const sample = await window.electronAPI.getSampleData();
            chartData = calculateSampleStats(sample.data, 'chartData');
        }

        const serviceTrendChartCanvas = document.getElementById('serviceTrendChart');
        if (!serviceTrendChartCanvas) return;
        const ctx = serviceTrendChartCanvas.getContext('2d');
        if (Chart.getChart(ctx)) {
            Chart.getChart(ctx).destroy();
        }
        new Chart(ctx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: true },
                    tooltip: { enabled: true }
                },
                scales: {
                    x: { title: { display: true, text: 'Month' } },
                    y: { title: { display: true, text: 'Number of Services' }, beginAtZero: true }
                }
            }
        });

        const months = chartData.labels;
        const current = chartData.datasets[0].data;
        const previous = chartData.datasets[1].data;
        let tableHTML = `<table class="trend-table"><thead><tr><th>Month</th><th>${chartData.datasets[0].label}</th><th>${chartData.datasets[1].label}</th></tr></thead><tbody>`;
        for (let i = 0; i < months.length; i++) {
            tableHTML += `<tr><td>${months[i]}</td><td>${current[i]}</td><td>${previous[i]}</td></tr>`;
        }
        tableHTML += '</tbody></table>';
        const serviceTrendTableContainer = document.getElementById('serviceTrendTableContainer');
        if (serviceTrendTableContainer) serviceTrendTableContainer.innerHTML = tableHTML;
    }

    if (currentPage === 'index') {
        renderServiceTrendChartAndTable();
    }

    window.electronAPI.subscribeToData(getCurrentPage());
    window.electronAPI.onDataUpdate((channel) => {
        if (channel === getCurrentPage() || channel === '*') {
            console.log(`Data updated for ${channel}, reloading content.`);
            if (getCurrentPage() === 'index') {
                loadDashboardContent();
                renderServiceTrendChartAndTable();
            }
            else if (getCurrentPage() === 'admin') loadAdminContent();
            else if (getCurrentPage() === 'clientportal') loadClientPortalContent();
            else if (getCurrentPage() === 'parts') loadPartsContent();
            else if (getCurrentPage() === 'records') loadServiceRecordsContent();
            else if (getCurrentPage() === 'registry') loadRegistryContent();
            else if (getCurrentPage() === 'schedule') loadScheduleContent();
            else if (getCurrentPage() === 'team') loadTeamContent();
            else if (getCurrentPage() === 'reports') loadReportsContent();
        }
    });
});
