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
    navLinks.forEach(link => link.style.display = '');
    reportsButton.style.display = '';
    clientPortalLink.style.display = ''; // Initially show for unauthenticated browsing
    adminPanelLink.style.display = '';   // Initially show for unauthenticated browsing

    if (currentUser) {
        // User is logged in
        authButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
        authButton.dataset.action = 'logout';

        // Hide client portal and admin panel by default, then show based on permissions
        clientPortalLink.style.display = 'none';
        adminPanelLink.style.display = 'none';

        if (currentUser.role === 'admin') {
            // Admin: All visible except Client Portal
            adminPanelLink.style.display = '';
            // Ensure all main nav links are visible for admin
            navLinks.forEach(link => link.style.display = '');
            reportsButton.style.display = '';
        } else if (currentUser.role === 'client') {
            // Client: Client Portal visible, Admin Panel hidden. Other links based on specific permissions.
            clientPortalLink.style.display = '';
            // Hide admin panel
            adminPanelLink.style.display = 'none';
            // Hide other links if client doesn't have explicit permission
            navLinks.forEach(link => {
                const page = link.dataset.page.replace('.html', '');
                if (!currentUser.permissions[`perm${page.charAt(0).toUpperCase() + page.slice(1)}`]) {
                    link.style.display = 'none';
                }
            });
            if (!currentUser.permissions.permReports) {
                reportsButton.style.display = 'none';
            }
        } else if (currentUser.role === 'technician') {
            // Technician: Client Portal and Admin Panel hidden. Other links based on specific permissions.
            clientPortalLink.style.display = 'none';
            adminPanelLink.style.display = 'none';
            // Hide other links if technician doesn't have explicit permission
            navLinks.forEach(link => {
                const page = link.dataset.page.replace('.html', '');
                if (!currentUser.permissions[`perm${page.charAt(0).toUpperCase() + page.slice(1)}`]) {
                    link.style.display = 'none';
                }
            });
            if (!currentUser.permissions.permReports) {
                reportsButton.style.display = 'none';
            }
        }

        // Handle first login modal for default admin
        if (currentUser.first_login && currentUser.email === 'genmaintadmin@email.com') {
            document.getElementById('firstLoginModal').style.display = 'block';
            document.getElementById('newAdminName').value = currentUser.name;
            document.getElementById('newAdminEmail').value = currentUser.email;
        }

    } else {
        authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        authButton.dataset.action = 'login';
        authButton.style.display = ''; // <-- Ensure visible
        authButton.disabled = false;   // <-- Ensure enabled
        authButton.classList.remove('hidden'); // <-- Remove hidden class if present

        // All navigation links and buttons remain visible for unauthenticated browsing
        // Their content will be sample data.
        navLinks.forEach(link => link.style.display = '');
        reportsButton.style.display = '';
        clientPortalLink.style.display = '';
        adminPanelLink.style.display = '';

        // Ensure the sign-in button is explicitly visible and accessible
        authButton.style.display = '';
        authButton.disabled = false;
        authButton.classList.remove('hidden'); // Remove any hidden class if present
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
    // const authButton = document.getElementById('authButton');
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

    let currentUser = null; // Frontend representation of the current user

    // Function to update UI based on login status and permissions
    async function updateUI() {
        currentUser = await window.electronAPI.getCurrentUser(); // Changed from window.api.getCurrentUser()
        console.log("Current User:", currentUser);

        if (currentUser && currentUser.success === false) { // Handle error case from getCurrentUser
            currentUser = null;
        }

        if (currentUser) {
            authButton.innerHTML = '<i class="fas fa-sign-out-alt"></i> Sign Out';
            authButton.dataset.action = 'logout';
        } else {
        authButton.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        authButton.dataset.action = 'login';
        authButton.disabled = false;
        authButton.classList.remove('hidden');
        
        // Explicitly show authButton (add this line)
        authButton.style.display = 'block'; 
        }

        // Hide all protected links by default
        document.querySelectorAll('.protected-link').forEach(link => {
        if (link.id !== 'authButton') { // Add this condition
            link.style.display = 'none';
        }
    });

        // Show links based on permissions
        navLinks.forEach(link => {
            const page = link.dataset.page;
            const permission = link.parentElement.dataset.permission; // Get permission from parent li

            if (page === 'index.html') { // Dashboard is always visible
                link.style.display = '';
            } else if (currentUser && permission && currentUser.permissions && currentUser.permissions[permission]) {
                link.parentElement.style.display = ''; // Show the li element
            } else {
                link.parentElement.style.display = 'none'; // Hide the li element
            }
        });

        navActionLinks.forEach(link => {
            const page = link.dataset.page;
            const permission = link.dataset.permission; // Get permission from the link itself

            if (currentUser && permission && currentUser.permissions && currentUser.permissions[permission]) {
                link.style.display = ''; // Show the link
            } else if (page === 'reports.html' && !currentUser) {
                // Reports link is also hidden if not logged in, as it requires permReports
                link.style.display = 'none';
            } else {
                link.style.display = 'none'; // Hide the link
            }
        });

        // Special handling for Client Portal and Admin Panel buttons
        const clientPortalLink = document.getElementById('clientPortalLink');
        const adminPanelLink = document.getElementById('adminPanelLink');

        if (currentUser && currentUser.permissions && currentUser.permissions.permClientPortal) {
            clientPortalLink.style.display = '';
        } else {
            clientPortalLink.style.display = 'none';
        }

        if (currentUser && currentUser.permissions && currentUser.permissions.permAdmin) {
            adminPanelLink.style.display = '';
        } else {
            adminPanelLink.style.display = 'none';
        }

        // Check for first login of default admin
        // NOTE: The conceptual code uses 'admin-default-uuid' which is a placeholder.
        // The existing code uses 'genmaintadmin@email.com'. Sticking to existing for consistency.
        if (currentUser && currentUser.email === 'genmaintadmin@email.com' && currentUser.first_login) {
            firstLoginModal.style.display = 'block';
            document.getElementById('newAdminName').value = currentUser.name;
            document.getElementById('newAdminEmail').value = currentUser.email;
        } else {
            firstLoginModal.style.display = 'none';
        }
    }

    // Initial UI update
    await updateUI();

    // Handle page navigation
    document.querySelectorAll('.nav-links a, .nav-actions .reports-button, .nav-actions .client-button').forEach(link => {
        link.addEventListener('click', async (e) => { // Made async to await currentUser
            e.preventDefault();
            const page = e.currentTarget.dataset.page;
            const requiredPermission = e.currentTarget.dataset.permission || e.currentTarget.parentElement.dataset.permission; // Get permission from link or parent li

            const currentLoggedInUser = await window.electronAPI.getCurrentUser(); // Get fresh user data

            if (page) {
                if (page === 'index.html' || page === 'index') { // Dashboard is always accessible
                    window.location.href = page;
                } else if (!currentLoggedInUser) {
                    alert('Please log in to access this page.');
                    signInUpModal.style.display = 'block';
                } else if (requiredPermission && (!currentLoggedInUser.permissions || !currentLoggedInUser.permissions[requiredPermission])) {
                    alert('You do not have permission to access this page.');
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
        darkModeIcon.classList.replace('fa-moon', 'fa-sun');
        darkModeText.textContent = 'Dark Mode';
        localStorage.setItem('darkMode', 'enabled');
    };

    const disableDarkMode = () => {
        document.body.classList.remove('dark-mode');
        darkModeIcon.classList.replace('fa-sun', 'fa-moon');
        darkModeText.textContent = 'Light Mode';
        localStorage.setItem('darkMode', 'disabled');
    };

    if (localStorage.getItem('darkMode') === 'enabled') {
        enableDarkMode();
    } else {
        disableDarkMode();
    }

    darkModeToggle.addEventListener('click', () => {
        if (document.body.classList.contains('dark-mode')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    });

    // Sign In/Out Button Logic
    // authButton already defined at the top
    // signInUpModal, closeSignInUpModal, loginForm, signupForm, tabButtons already defined at the top

    authButton.addEventListener('click', async (e) => {
        e.preventDefault();
        if (authButton.dataset.action === 'logout') {
            const confirmLogout = confirm('Are you sure you want to log out?');
            if (confirmLogout) {
                await window.electronAPI.logout();
                alert('Logged out successfully!');
                await updateNavigationVisibility(); // Update nav after logout
                // Reload current page to reflect unauthenticated state and sample data
                window.location.reload();
            }
        } else {
            signInUpModal.style.display = 'block';
            // Ensure login tab is active by default
            document.querySelector('.tab-button[data-tab="login"]').classList.add('active');
            document.querySelector('.tab-button[data-tab="signup"]').classList.remove('active');
            document.getElementById('loginTab').classList.add('active');
            document.getElementById('signupTab').classList.remove('active');
        }
    });

    closeSignInUpModal.addEventListener('click', () => {
        signInUpModal.style.display = 'none';
    });

    tabButtons.forEach(button => { // Re-using tabButtons from conceptual code
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${button.dataset.tab}Tab`).classList.add('active');
        });
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const result = await window.electronAPI.login({ email, password }); // Changed from window.api.login

        if (result.success) {
            alert(result.message);
            signInUpModal.style.display = 'none';
            await updateNavigationVisibility(); // Update nav after login (existing function)
            // Check if it's the default admin's first login
            if (result.user.email === 'genmaintadmin@email.com' && result.user.first_login) { // Using email for consistency
                firstLoginModal.style.display = 'block';
                document.getElementById('newAdminName').value = result.user.name;
                document.getElementById('newAdminEmail').value = result.user.email;
            } else {
                window.location.reload(); // Reload current page to reflect authenticated state and real data
            }
        } else {
            alert(result.message);
        }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('signupName').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const role = document.getElementById('signupRole').value;

        const result = await window.electronAPI.register({ name, email, password, role }); // Changed from window.api.register
        if (result.success) {
            alert('Registration successful! Please log in.');
            // Optionally switch to login tab
            document.querySelector('.tab-button[data-tab="login"]').click();
            document.getElementById('loginEmail').value = email; // Pre-fill email
            document.getElementById('loginPassword').value = ''; // Clear password field
        } else {
            alert(result.message || 'Registration failed.');
        }
    });

    // First Login Password Change Modal Logic
    // firstLoginModal, closeFirstLoginModal, firstLoginForm already defined at the top

    closeFirstLoginModal.addEventListener('click', () => {
        firstLoginModal.style.display = 'none';
    });

    firstLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newAdminName').value;
        const newEmail = document.getElementById('newAdminEmail').value;
        const newPassword = document.getElementById('newAdminPassword').value;
        const confirmPassword = document.getElementById('confirmAdminPassword').value;
        const currentLoggedInUser = await window.electronAPI.getCurrentUser(); // Get fresh user data

        if (newPassword !== confirmPassword) {
            alert('New password and confirm password do not match.');
            return;
        }

        if (!currentLoggedInUser || !currentLoggedInUser.id) {
            alert('No user logged in to update.'); // Changed from 'Error: No user session found.'
            return;
        }

        const result = await window.electronAPI.updatePasswordAndFirstLogin(currentLoggedInUser.id, newName, newEmail, newPassword); // Changed from window.api.updatePasswordAndFirstLogin

        if (result.success) {
            alert(result.message);
            firstLoginModal.style.display = 'none';
            await updateNavigationVisibility(); // Re-evaluate nav after password change (existing function)
            window.location.reload(); // Reload to ensure all permissions and UI elements are correctly applied
        } else {
            alert(result.message);
        }
    });

    // --- Page Specific Logic (Examples for Dashboard, Admin, Client Portal) ---
    // You would expand this for each HTML page (registry.html, schedule.html, etc.)

    const currentPage = getCurrentPage();

    // General Modal Handling (reusable functions in script.js):
    function openModal(modalId, title, data = {}) {
        const modal = document.getElementById(modalId);
        const modalTitle = modal.querySelector('h3');
        const form = modal.querySelector('form');

        modalTitle.textContent = title;
        form.reset(); // Clear previous form data

        // Populate form if data is provided (for editing)
        if (Object.keys(data).length > 0) {
            for (const key in data) {
                const input = form.querySelector(`#${modalId.replace('Modal', '').toLowerCase()}${key.charAt(0).toUpperCase() + key.slice(1)}`); // Dynamic ID
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = data[key];
                    } else {
                        input.value = data[key];
                    }
                }
            }
            // Set hidden ID for update operations
            const idInput = form.querySelector(`#${modalId.replace('Modal', 'Id')}`);
            if (idInput) idInput.value = data.id;
        } else {
            // Clear hidden ID for add operations
            const idInput = form.querySelector(`#${modalId.replace('Modal', 'Id')}`);
            if (idInput) idInput.value = '';
        }

        modal.style.display = 'block';
    }

    // Example reusable function to close a modal
    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Event listeners for all close buttons
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
            document.getElementById('totalServicesYTD').textContent = stats.totalServicesYTD || 0;
            document.getElementById('totalServicesTrend').textContent = stats.totalServicesTrend || 'N/A';
            document.getElementById('totalCostYTD').textContent = `Ksh ${stats.totalCostYTD ? stats.totalCostYTD.toLocaleString() : '0.00'}`;
            document.getElementById('totalCostTrend').textContent = stats.totalCostTrend || 'N/A';
            document.getElementById('avgResponseTime').textContent = stats.avgResponseTime || 'N/A';
            document.getElementById('avgResponseTimeTrend').textContent = stats.avgResponseTimeTrend || 'N/A';
            document.getElementById('overdueServices').textContent = stats.overdueServices || 0;
            document.getElementById('overdueServicesTrend').textContent = stats.overdueServicesTrend || 'N/A';
        };

        let serviceTrendChartInstance = null;
        const displayServiceTrendChart = (chartData) => {
            const ctx = document.getElementById('serviceTrendChart').getContext('2d');
            if (serviceTrendChartInstance) {
                serviceTrendChartInstance.destroy();
            }
            document.getElementById('currentYearLabel').textContent = chartData.datasets[0].label;
            document.getElementById('previousYearLabel').textContent = chartData.datasets[1].label;

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
            document.getElementById('dashboardStatsContainer').style.display = 'none';
            document.querySelector('.chart-container').style.display = 'none';
            // No loading indicator for dashboard stats, they load fast or from sample

            await loadDataForPage('dashboardStats', displayDashboardStats, 'chartData', displayServiceTrendChart);

            document.getElementById('dashboardStatsContainer').style.display = '';
            document.querySelector('.chart-container').style.display = '';
        };
        loadDashboardContent();

    } else if (currentPage === 'admin') {
        // Admin Panel Logic
        const displayAdminStats = (stats) => {
            document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
            document.getElementById('totalUsersTrend').textContent = stats.totalUsersTrend || 'N/A';
            document.getElementById('adminUsers').textContent = stats.adminUsers || 0;
            document.getElementById('adminUsersTrend').textContent = stats.adminUsersTrend || 'N/A';
            document.getElementById('technicianUsers').textContent = stats.technicianUsers || 0;
            document.getElementById('technicianUsersTrend').textContent = stats.technicianUsersTrend || 'N/A';
            document.getElementById('clientUsers').textContent = stats.clientUsers || 0;
            document.getElementById('clientUsersTrend').textContent = stats.clientUsersTrend || 'N/A';
        };

        let userRoleChartInstance = null;
        const displayUserRoleChart = (users) => {
            const ctx = document.getElementById('userRoleChart').getContext('2d');
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
                        backgroundColor: ['#3498db', '#2ecc71', '#f39c12'], // Blue, Green, Orange
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
            tableBody.innerHTML = ''; // Clear existing rows
            document.getElementById('user-loading-indicator').style.display = 'none';
            document.getElementById('usersTable').style.display = 'table';

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
                row.insertCell().textContent = JSON.stringify(user.permissions || {}); // Display permissions
                const actionsCell = row.insertCell();
                actionsCell.innerHTML = `
                    <button class="action-btn edit-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Edit</button>
                    <button class="action-btn delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i> Delete</button>
                `;
            });
        };

        const displayUserActionLogsTable = (logs) => {
            const tableBody = document.querySelector('#userActionsTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows
            document.getElementById('action-loading-indicator').style.display = 'none';
            document.getElementById('userActionsTable').style.display = 'table';

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
            document.getElementById('user-loading-indicator').style.display = 'block';
            document.getElementById('usersTable').style.display = 'none';
            document.getElementById('action-loading-indicator').style.display = 'block';
            document.getElementById('userActionsTable').style.display = 'none';

            await loadDataForPage('adminPanelStats', displayAdminStats);
            await loadDataForPage('users', displayUsersTable, null, displayUserRoleChart); // Pass users for chart
            await loadDataForPage('userActions', displayUserActionLogsTable);
        };
        loadAdminContent();

        // Admin specific button listeners
        document.getElementById('resetDatabaseBtn').addEventListener('click', () => {
            document.getElementById('resetDbConfirmModal').style.display = 'block';
        });
        document.getElementById('loadSampleDataBtn').addEventListener('click', () => {
            document.getElementById('loadSampleDataConfirmModal').style.display = 'block';
        });
        // Add/Edit User Modal
        document.getElementById('addUserBtn').addEventListener('click', () => {
            document.getElementById('userModalTitle').textContent = 'Add New User';
            document.getElementById('userForm').reset();
            document.getElementById('userId').value = '';
            document.getElementById('userPassword').required = true; // Password is required for new user
            document.getElementById('userModal').style.display = 'block';
        });

        // Handle form submission for Add/Edit User
        document.getElementById('userForm').addEventListener('submit', async (e) => {
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
            const password = document.getElementById('userPassword').value;
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
                document.getElementById('userModal').style.display = 'none';
                loadAdminContent(); // Reload data
            } else {
                alert('Failed to save user.');
            }
        });

        // Edit and Delete buttons for users table (delegated event listener)
        document.getElementById('usersTable').addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const userId = e.target.dataset.id;
                const user = await window.electronAPI.api.get('users', userId);
                if (user) {
                    document.getElementById('userModalTitle').textContent = 'Edit User';
                    document.getElementById('userId').value = user.id;
                    document.getElementById('userName').value = user.name;
                    document.getElementById('userEmail').value = user.email;
                    document.getElementById('userPassword').value = ''; // Clear password field for edit
                    document.getElementById('userPassword').required = false; // Password not required for edit
                    document.getElementById('userRole').value = user.role;
                    document.getElementById('userStatus').value = user.status;

                    // Set permissions checkboxes
                    document.getElementById('permDashboard').checked = user.permissions?.permDashboard || false;
                    document.getElementById('permReports').checked = user.permissions?.permReports || false;
                    document.getElementById('permAdmin').checked = user.permissions?.permAdmin || false;
                    document.getElementById('permClientPortal').checked = user.permissions?.permClientPortal || false;
                    document.getElementById('permRegistryModify').checked = user.permissions?.permRegistryModify || false;
                    document.getElementById('permPartsModify').checked = user.permissions?.permPartsModify || false;
                    document.getElementById('permScheduleModify').checked = user.permissions?.permScheduleModify || false;
                    document.getElementById('permRecordsModify').checked = user.permissions?.permRecordsModify || false;
                    document.getElementById('permTeamModify').checked = user.permissions?.permTeamModify || false;
                    document.getElementById('permImportData').checked = user.permissions?.permImportData || false;
                    document.getElementById('permExportData').checked = user.permissions?.permExportData || false;

                    document.getElementById('userModal').style.display = 'block';
                } else {
                    alert('User not found.');
                }
            } else if (e.target.classList.contains('delete-btn')) {
                const userId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete user ${userId}?`)) {
                    const result = await window.electronAPI.api.delete('users', userId);
                    if (result) {
                        alert('User deleted successfully!');
                        loadAdminContent(); // Reload data
                    } else {
                        alert('Failed to delete user.');
                    }
                }
            }
        });

        // Reset Database Confirmation
        document.getElementById('resetDbForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('resetAdminEmail').value;
            const password = document.getElementById('resetAdminPassword').value;
            try {
                const result = await window.electronAPI.admin.resetData({ email, password });
                if (result.success) {
                    alert(result.message);
                    document.getElementById('resetDbConfirmModal').style.display = 'none';
                    window.location.reload(); // Reload app after database reset
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });

        // Load Sample Data Confirmation
        document.getElementById('loadSampleDataForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loadAdminEmail').value;
            const password = document.getElementById('loadAdminPassword').value;
            try {
                const result = await window.electronAPI.admin.loadSampleData({ email, password });
                if (result.success) {
                    alert(result.message);
                    document.getElementById('loadSampleDataConfirmModal').style.display = 'none';
                    loadAdminContent(); // Reload admin data after loading sample data
                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        });


    } else if (currentPage === 'clientportal') {
        // Client Portal Logic
        const displayClientGenerators = (generators) => {
            const tableBody = document.querySelector('#clientGeneratorsTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('clientGeneratorsTable').style.display = 'table';

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
            document.getElementById('loading-indicator').style.display = 'block';
            document.getElementById('clientGeneratorsTable').style.display = 'none';

            const currentUser = await window.electronAPI.getCurrentUser();
            if (currentUser && currentUser.name) {
                document.getElementById('clientNameDisplay').textContent = currentUser.name;
            } else {
                document.getElementById('clientNameDisplay').textContent = 'Guest'; // For sample data view
            }

            await loadDataForPage('generators', displayClientGenerators);
        };
        loadClientPortalContent();

        // View Services button in Client Portal (delegated event listener)
        document.getElementById('clientGeneratorsTable').addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-services-btn')) {
                const generatorId = e.target.dataset.id;
                // In a real app, you'd fetch services for this generator and display them in a new modal/section
                alert(`Viewing services for generator ID: ${generatorId}. (Feature to be implemented)`);
            }
        });

    } else if (currentPage === 'parts') {
        // Parts Inventory Logic
        const displayPartsStats = (stats) => {
            document.getElementById('totalUniqueParts').textContent = stats.totalUniqueParts || 0;
            document.getElementById('totalUniquePartsTrend').textContent = stats.totalUniquePartsTrend || 'N/A';
            document.getElementById('lowStockItems').textContent = stats.lowStockItems || 0;
            document.getElementById('lowStockItemsTrend').textContent = stats.lowStockItemsTrend || 'N/A';
            document.getElementById('totalInventoryValue').textContent = `Ksh ${stats.totalInventoryValue ? stats.totalInventoryValue.toLocaleString() : '0.00'}`;
            document.getElementById('totalInventoryValueTrend').textContent = stats.totalInventoryValueTrend || 'N/A';
            document.getElementById('partsUsedLastMonth').textContent = stats.partsUsedLastMonth || 0;
            document.getElementById('partsUsedLastMonthTrend').textContent = stats.partsUsedLastMonthTrend || 'N/A';
        };

        const displayPartsTable = (parts) => {
            const tableBody = document.querySelector('#partsTable tbody');
            tableBody.innerHTML = '';
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('partsTable').style.display = 'table';

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
            document.getElementById('loading-indicator').style.display = 'block';
            document.getElementById('partsTable').style.display = 'none';

            await loadDataForPage('parts', displayPartsTable, 'partsInventoryStats', displayPartsStats);
        };
        loadPartsContent();

        // Add Part button
        document.getElementById('addPartBtn').addEventListener('click', () => {
            openModal('partModal', 'Add New Part');
        });

        // Handle form submission for Add/Edit Part
        document.getElementById('partForm').addEventListener('submit', async (e) => {
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
                document.getElementById('partModal').style.display = 'none';
                loadPartsContent(); // Reload data
            } else {
                alert('Failed to save part.');
            }
        });

        // Edit and Delete buttons for parts table (delegated event listener)
        document.getElementById('partsTable').addEventListener('click', async (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const partId = e.target.dataset.id;
                const part = await window.electronAPI.api.get('parts', partId);
                if (part) {
                    document.getElementById('partModalTitle').textContent = 'Edit Part';
                    document.getElementById('partId').value = part.id;
                    document.getElementById('partName').value = part.name;
                    document.getElementById('partNumber').value = part.part_number;
                    document.getElementById('quantityInStock').value = part.quantity_in_stock;
                    document.getElementById('costPerUnit').value = part.cost_per_unit;
                    document.getElementById('partCategory').value = part.category;
                    document.getElementById('minStockLevel').value = part.min_stock_level;
                    document.getElementById('preferredSupplier').value = part.preferred_supplier;
                    document.getElementById('lastOrdered').value = part.last_ordered;
                    document.getElementById('usedLastMonth').value = part.used_last_month;
                    document.getElementById('compatibleGenerators').value = part.compatible_generators;
                    document.getElementById('partLocation').value = part.location;
                    document.getElementById('reorderPoint').value = part.reorder_point;
                    document.getElementById('leadTime').value = part.lead_time;
                    document.getElementById('partNotes').value = part.notes;
                    document.getElementById('partStatus').value = part.status;
                    document.getElementById('partModal').style.display = 'block';
                } else {
                    alert('Part not found.');
                }
            } else if (e.target.classList.contains('delete-btn')) {
                const partId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete part ${partId}?`)) {
                    const result = await window.electronAPI.api.delete('parts', partId);
                    if (result) {
                        alert('Part deleted successfully!');
                        loadPartsContent(); // Reload data
                    } else {
                        alert('Failed to delete part.');
                    }
                }
            }
        });

    } else if (currentPage === 'records') {
        // Service Records Logic
        const displayServiceRecordsStats = (stats) => {
            document.getElementById('completedServices').textContent = stats.completedServices || 0;
            document.getElementById('completedServicesTrend').textContent = stats.completedServicesTrend || 'N/A';
            document.getElementById('pendingServices').textContent = stats.pendingServices || 0;
            document.getElementById('pendingServicesTrend').textContent = stats.pendingServicesTrend || 'N/A';
            document.getElementById('overdueRecords').textContent = stats.overdueRecords || 0;
            document.getElementById('overdueRecordsTrend').textContent = stats.overdueRecordsTrend || 'N/A';
            document.getElementById('activeTechnicians').textContent = stats.activeTechnicians || 0;
            document.getElementById('activeTechniciansTrend').textContent = stats.activeTechniciansTrend || 'N/A';
        };

        const displayServiceRecordsTable = (services) => {
            const tableBody = document.querySelector('#serviceRecordsTable tbody');
            tableBody.innerHTML = '';
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('serviceRecordsTable').style.display = 'table';

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
            document.getElementById('loading-indicator').style.display = 'block';
            document.getElementById('serviceRecordsTable').style.display = 'none';

            await loadDataForPage('services', displayServiceRecordsTable, 'serviceRecordsStats', displayServiceRecordsStats);
        };
        loadServiceRecordsContent();

        // Add Service button
        document.getElementById('addServiceBtn').addEventListener('click', () => {
            // Logic to open add service modal (similar to add user/part)
            alert('Add New Service functionality to be implemented.');
        });

        // View/Edit/Delete Service Records (delegated event listener)
        document.getElementById('serviceRecordsTable').addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-btn')) {
                const serviceId = e.target.dataset.id;
                const service = await window.electronAPI.api.get('services', serviceId);
                if (service) {
                    // Populate and show service details modal
                    document.querySelector('#serviceDetailsModal [data-key="id"]').textContent = service.id;
                    document.querySelector('#serviceDetailsModal [data-key="service_date"]').textContent = service.service_date;
                    document.querySelector('#serviceDetailsModal [data-key="duration"]').textContent = service.duration ? `${service.duration} hours` : 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="service_type"]').textContent = service.service_type;
                    document.querySelector('#serviceDetailsModal [data-key="generator_model"]').textContent = service.generator_model;
                    document.querySelector('#serviceDetailsModal [data-key="generator_serial"]').textContent = service.generator_serial;
                    document.querySelector('#serviceDetailsModal [data-key="generator_location"]').textContent = service.generator_location;
                    document.querySelector('#serviceDetailsModal [data-key="total_hours_run"]').textContent = service.total_hours_run || 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="technician_name"]').textContent = service.technician_name;
                    document.querySelector('#serviceDetailsModal [data-key="technician_email"]').textContent = service.technician_email || 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="technician_team"]').textContent = service.technician_team || 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="technician_certifications"]').textContent = service.technician_certifications || 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="status"]').textContent = service.status;
                    document.querySelector('#serviceDetailsModal [data-key="generator_next_service"]').textContent = service.generator_next_service || 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="service_cost"]').textContent = `Ksh ${service.service_cost ? service.service_cost.toLocaleString() : '0.00'}`;
                    document.querySelector('#serviceDetailsModal [data-key="work_order"]').textContent = service.work_order || 'N/A';
                    document.querySelector('#serviceDetailsModal [data-key="notes"]').textContent = service.notes || 'No notes.';

                    const partsUsedList = document.querySelector('#serviceDetailsModal [data-key="parts_used"]');
                    partsUsedList.innerHTML = '';
                    if (service.parts_used) {
                        try {
                            const parts = JSON.parse(service.parts_used);
                            if (Array.isArray(parts) && parts.length > 0) {
                                parts.forEach(p => {
                                    const listItem = document.createElement('li');
                                    listItem.textContent = `Part ID: ${p.part_id}, Quantity: ${p.quantity}`; // You might want to fetch part name here
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

                    document.getElementById('serviceDetailsModal').style.display = 'block';
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
                        loadServiceRecordsContent(); // Reload data
                    } else {
                        alert('Failed to delete service record.');
                    }
                }
            }
        });

        // Close service details modal
        document.querySelectorAll('.modal .close-modal, .modal .btn-close').forEach(button => {
            button.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

    } else if (currentPage === 'registry') {
        // Registry Page Logic
        const displayRegistryStats = (stats) => {
            document.getElementById('totalGenerators').textContent = stats.totalGenerators || 0;
            document.getElementById('totalGeneratorsTrend').textContent = stats.totalGeneratorsTrend || 'N/A';
            document.getElementById('activeGenerators').textContent = stats.activeGenerators || 0;
            document.getElementById('activeGeneratorsTrend').textContent = stats.activeGeneratorsTrend || 'N/A';
            document.getElementById('generatorsDueForService').textContent = stats.generatorsDueForService || 0;
            document.getElementById('generatorsDueForServiceTrend').textContent = stats.generatorsDueForServiceTrend || 'N/A';
            document.getElementById('generatorsUnderWarranty').textContent = stats.generatorsUnderWarranty || 0;
            document.getElementById('generatorsUnderWarrantyTrend').textContent = stats.generatorsUnderWarrantyTrend || 'N/A';
        };

        const displayGeneratorsTable = (generators) => {
            const tableBody = document.querySelector('#generatorsTable tbody');
            tableBody.innerHTML = '';
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('generatorsTable').style.display = 'table';

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
            document.getElementById('loading-indicator').style.display = 'block';
            document.getElementById('generatorsTable').style.display = 'none';

            await loadDataForPage('generators', displayGeneratorsTable, 'registryStats', displayRegistryStats);
        };
        loadRegistryContent();

        // Add Generator button
        document.getElementById('addGeneratorBtn').addEventListener('click', async () => {
            openModal('generatorModal', 'Add New Generator');
            // Populate client and technician dropdowns
            const clients = await window.electronAPI.api.get('users'); // Get all users
            const clientSelect = document.getElementById('generatorClientId');
            clientSelect.innerHTML = '<option value="">Select Client</option>';
            clients.filter(u => u.role === 'client').forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = client.name;
                clientSelect.appendChild(option);
            });

            const technicians = await window.electronAPI.api.get('technicians');
            const techSelect = document.getElementById('generatorAssignedTech');
            techSelect.innerHTML = '<option value="">Select Technician</option>';
            technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = tech.name;
                techSelect.appendChild(option);
            });
        });

        // Handle form submission for Add/Edit Generator
        document.getElementById('generatorForm').addEventListener('submit', async (event) => {
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
                loadRegistryContent(); // Refresh generator table
            } catch (error) {
                console.error('Error saving generator:', error);
                alert('Failed to save generator: ' + error.message);
            }
        });

        // View/Edit/Delete Generator (delegated event listener)
        document.getElementById('generatorsTable').addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-btn')) {
                const generatorId = e.target.dataset.id;
                const generator = await window.electronAPI.api.get('generators', generatorId);
                if (generator) {
                    // Populate and show generator details modal
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

                    // Repopulate client and technician dropdowns for edit
                    const clients = await window.electronAPI.api.get('users');
                    const clientSelect = document.getElementById('generatorClientId');
                    clientSelect.innerHTML = '<option value="">Select Client</option>';
                    clients.filter(u => u.role === 'client').forEach(client => {
                        const option = document.createElement('option');
                        option.value = client.id;
                        option.textContent = client.name;
                        clientSelect.appendChild(option);
                    });
                    clientSelect.value = generator.client_id || '';

                    const technicians = await window.electronAPI.api.get('technicians');
                    const techSelect = document.getElementById('generatorAssignedTech');
                    techSelect.innerHTML = '<option value="">Select Technician</option>';
                    technicians.forEach(tech => {
                        const option = document.createElement('option');
                        option.value = tech.id;
                        option.textContent = tech.name;
                        techSelect.appendChild(option);
                    });
                    techSelect.value = generator.assigned_tech_id || '';

                } else {
                    alert('Generator not found.');
                }
            } else if (e.target.classList.contains('delete-btn')) {
                const generatorId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete generator ${generatorId}?`)) {
                    const result = await window.electronAPI.api.delete('generators', generatorId);
                    if (result) {
                        alert('Generator deleted successfully!');
                        loadRegistryContent(); // Reload data
                    } else {
                        alert('Failed to delete generator.');
                    }
                }
            }
        });

    } else if (currentPage === 'schedule') {
        // Schedule Page Logic
        const displayScheduleStats = (stats) => {
            document.getElementById('upcomingServices').textContent = stats.upcomingServices || 0;
            document.getElementById('upcomingServicesTrend').textContent = stats.upcomingServicesTrend || 'N/A';
            document.getElementById('pendingServicesSchedule').textContent = stats.pendingServicesSchedule || 0;
            document.getElementById('pendingServicesScheduleTrend').textContent = stats.pendingServicesScheduleTrend || 'N/A';
            document.getElementById('overdueServicesSchedule').textContent = stats.overdueServicesSchedule || 0;
            document.getElementById('overdueServicesScheduleTrend').textContent = stats.overdueServicesScheduleTrend || 'N/A';
            document.getElementById('servicesCompletedThisMonth').textContent = stats.servicesCompletedThisMonth || 0;
            document.getElementById('servicesCompletedThisMonthTrend').textContent = stats.servicesCompletedThisMonthTrend || 'N/A';
        };

        const displayScheduledServicesTable = (services) => {
            const tableBody = document.querySelector('#scheduleTable tbody'); // Corrected ID
            tableBody.innerHTML = '';
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('scheduleTable').style.display = 'table'; // Corrected ID

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
            document.getElementById('loading-indicator').style.display = 'block';
            document.getElementById('scheduleTable').style.display = 'none'; // Corrected ID

            await loadDataForPage('services', displayScheduledServicesTable, 'scheduleStats', displayScheduleStats); // Reusing 'services' endpoint for schedule
        };
        loadScheduleContent();

        // Add Service button
        document.getElementById('addScheduledServiceBtn').addEventListener('click', async () => {
            openModal('serviceModal', 'Add New Service');
            // Populate generator and technician dropdowns
            const generators = await window.electronAPI.api.get('generators');
            const genSelect = document.getElementById('serviceGeneratorId');
            genSelect.innerHTML = '<option value="">Select Generator</option>';
            generators.forEach(gen => {
                const option = document.createElement('option');
                option.value = gen.id;
                option.textContent = `${gen.model} (${gen.serial_number})`;
                genSelect.appendChild(option);
            });

            const technicians = await window.electronAPI.api.get('technicians');
            const techSelect = document.getElementById('serviceTechnicianId');
            techSelect.innerHTML = '<option value="">Select Technician</option>';
            technicians.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.id;
                option.textContent = tech.name;
                techSelect.appendChild(option);
            });

            // Clear parts used section and add initial button
            document.getElementById('partsUsedContainer').innerHTML = '<button type="button" id="addPartUsedBtn" class="reports-button" style="margin-top: 10px;"><i class="fas fa-plus"></i> Add Part</button>';
            document.getElementById('addPartUsedBtn').addEventListener('click', addPartUsedField);
        });

        function addPartUsedField() {
            const container = document.getElementById('partsUsedContainer');
            const div = document.createElement('div');
            div.classList.add('part-used-item');
            div.innerHTML = `
                <select class="part-select" required></select>
                <input type="number" class="quantity-input" placeholder="Quantity" min="1" value="1" required>
                <button type="button" class="remove-part-btn">X</button>
            `;
            container.insertBefore(div, container.lastElementChild); // Insert before the "Add Part" button

            const partSelect = div.querySelector('.part-select');
            populatePartSelect(partSelect);

            div.querySelector('.remove-part-btn').addEventListener('click', () => {
                div.remove();
            });
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

        // Handle form submission for Add/Edit Service
        document.getElementById('serviceForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const serviceId = document.getElementById('serviceId').value;
            const partsUsed = [];
            document.querySelectorAll('#partsUsedContainer .part-used-item').forEach(item => {
                const partId = item.querySelector('.part-select').value;
                const quantity = parseInt(item.querySelector('.quantity-input').value);
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
                parts_used: JSON.stringify(partsUsed) // Store as JSON string
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
                loadScheduleContent(); // Refresh schedule table
            } catch (error) {
                console.error('Error saving service:', error);
                alert('Failed to save service: ' + error.message);
            }
        });

        // View/Edit/Delete Scheduled Service (delegated event listener)
        document.getElementById('scheduleTable').addEventListener('click', async (e) => { // Corrected ID
            if (e.target.classList.contains('view-btn')) {
                const serviceId = e.target.dataset.id;
                const service = await window.electronAPI.api.get('services', serviceId); // Reusing service endpoint
                if (service) {
                    // Populate and show service details modal (if available on schedule page)
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

                    // Repopulate generator and technician dropdowns for edit
                    const generators = await window.electronAPI.api.get('generators');
                    const genSelect = document.getElementById('serviceGeneratorId');
                    genSelect.innerHTML = '<option value="">Select Generator</option>';
                    generators.forEach(gen => {
                        const option = document.createElement('option');
                        option.value = gen.id;
                        option.textContent = `${gen.model} (${gen.serial_number})`;
                        genSelect.appendChild(option);
                    });
                    genSelect.value = service.generator_id || '';

                    const technicians = await window.electronAPI.api.get('technicians');
                    const techSelect = document.getElementById('serviceTechnicianId');
                    techSelect.innerHTML = '<option value="">Select Technician</option>';
                    technicians.forEach(tech => {
                        const option = document.createElement('option');
                        option.value = tech.id;
                        option.textContent = tech.name;
                        techSelect.appendChild(option);
                    });
                    techSelect.value = service.technician_id || '';

                    // Populate parts used for edit
                    const partsUsedContainer = document.getElementById('partsUsedContainer');
                    partsUsedContainer.innerHTML = ''; // Clear existing
                    if (service.parts_used) {
                        try {
                            const parts = JSON.parse(service.parts_used);
                            if (Array.isArray(parts)) {
                                parts.forEach(p => {
                                    addPartUsedField(); // Add a new field
                                    const lastItem = partsUsedContainer.lastElementChild.previousElementSibling; // Get the newly added item
                                    if (lastItem) {
                                        lastItem.querySelector('.part-select').value = p.part_id;
                                        lastItem.querySelector('.quantity-input').value = p.quantity;
                                    }
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing parts_used for edit:', e);
                        }
                    }
                    // Always add the "Add Part" button back
                    partsUsedContainer.innerHTML += '<button type="button" id="addPartUsedBtn" class="reports-button" style="margin-top: 10px;"><i class="fas fa-plus"></i> Add Part</button>';
                    document.getElementById('addPartUsedBtn').addEventListener('click', addPartUsedField);

                } else {
                    alert('Scheduled service not found.');
                }
            } else if (e.target.classList.contains('delete-btn')) {
                const serviceId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete scheduled service ${serviceId}?`)) {
                    const result = await window.electronAPI.api.delete('services', serviceId);
                    if (result) {
                        alert('Scheduled service deleted successfully!');
                        loadScheduleContent(); // Reload data
                    } else {
                        alert('Failed to delete scheduled service.');
                    }
                }
            }
        });

    } else if (currentPage === 'team') {
        // Team Page Logic
        const displayTeamStats = (stats) => {
            document.getElementById('activeTechnicians').textContent = stats.activeTechnicians || 0;
            document.getElementById('activeTechniciansTrend').textContent = stats.activeTechniciansTrend || 'N/A';
            document.getElementById('certificationsDue').textContent = stats.certificationsDue || 0;
            document.getElementById('certificationsDueTrend').textContent = stats.certificationsDueTrend || 'N/A';
            document.getElementById('overdueAssignments').textContent = stats.overdueAssignments || 0;
            document.getElementById('overdueAssignmentsTrend').textContent = stats.overdueAssignmentsTrend || 'N/A';
            document.getElementById('avgServicesPerTech').textContent = stats.avgServicesPerTech || 'N/A';
            document.getElementById('avgServicesPerTechTrend').textContent = stats.avgServicesPerTechTrend || 'N/A';
        };

        const displayTechniciansTable = (technicians) => {
            const tableBody = document.querySelector('#techniciansTable tbody');
            tableBody.innerHTML = '';
            document.getElementById('loading-indicator').style.display = 'none';
            document.getElementById('techniciansTable').style.display = 'table';

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
            document.getElementById('loading-indicator').style.display = 'block';
            document.getElementById('techniciansTable').style.display = 'none';

            await loadDataForPage('technicians', displayTechniciansTable, 'teamManagementStats', displayTeamStats);
        };
        loadTeamContent();

        // Add Technician button
        document.getElementById('addTechnicianBtn').addEventListener('click', () => {
            openModal('technicianModal', 'Add New Technician');
            document.getElementById('technicianId').value = ''; // Clear ID for new
            document.getElementById('techPassword').required = true; // Password required for new
        });

        // Handle form submission for Add/Edit Technician
        document.getElementById('technicianForm').addEventListener('submit', async (event) => {
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
                role: 'technician' // Fixed role for technician form
            };
            const password = document.getElementById('techPassword').value;
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
                loadTeamContent(); // Refresh technician table
            } catch (error) {
                console.error('Error saving technician:', error);
                alert('Failed to save technician: ' + error.message);
            }
        });

        // View/Edit/Delete Technician (delegated event listener)
        document.getElementById('techniciansTable').addEventListener('click', async (e) => {
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
                    document.getElementById('techPassword').required = false; // Password not required for edit
                } else {
                    alert('Technician not found.');
                }
            } else if (e.target.classList.contains('delete-btn')) {
                const techId = e.target.dataset.id;
                if (confirm(`Are you sure you want to delete technician ${techId}?`)) {
                    const result = await window.electronAPI.api.delete('technicians', techId);
                    if (result) {
                        alert('Technician deleted successfully!');
                        loadTeamContent(); // Reload data
                    } else {
                        alert('Failed to delete technician.');
                    }
                }
            }
        });

    } else if (currentPage === 'reports') {
        // Reports Page Logic
        const displayReportsStats = (stats) => {
            document.getElementById('totalRevenue').textContent = `Ksh ${stats.totalRevenue ? stats.totalRevenue.toLocaleString() : '0.00'}`;
            document.getElementById('totalRevenueTrend').textContent = stats.totalRevenueTrend || 'N/A';
            document.getElementById('mostUsedPart').textContent = stats.mostUsedPart || 'N/A';
            document.getElementById('topPerformingTechnician').textContent = stats.topPerformingTechnician || 'N/A';
            document.getElementById('serviceCompletionRate').textContent = stats.serviceCompletionRate ? `${stats.serviceCompletionRate}%` : 'N/A';
            document.getElementById('serviceCompletionRateTrend').textContent = stats.serviceCompletionRateTrend || 'N/A';
        };

        let serviceCostChartInstance = null;
        const displayServiceCostChart = (chartData) => {
            const ctx = document.getElementById('serviceCostByTypeChart').getContext('2d');
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
            const ctx = document.getElementById('generatorStatusChart').getContext('2d');
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
            const ctx = document.getElementById('partsStockChart').getContext('2d');
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
            // Reports stats
            await loadDataForPage('reportsStats', displayReportsStats);

            // Charts
            await loadDataForPage('serviceCostByTypeChartData', displayServiceCostChart);
            await loadDataForPage('generatorStatusChartData', displayGeneratorStatusChart);
            await loadDataForPage('partsStockChartData', displayPartsStockChart);
        };
        loadReportsContent();
    }

    // Tab navigation for login/signup
    // Already handled by tabButtons.forEach loop above

    // Fetch and render Service Trend Chart and Table (Dashboard specific, moved from conceptual code)
    async function renderServiceTrendChartAndTable() {
        // Fetch chart data (use sample data if not logged in)
        let chartData;
        try {
            chartData = await window.electronAPI.api.get('chartData'); // Corrected from window.api.invoke
        } catch {
            // Fallback: fetch sample data from main process
            const sample = await window.electronAPI.getSampleData(); // Corrected from window.api.invoke
            chartData = calculateSampleStats(sample.data, 'chartData'); // Use calculateSampleStats for sample chart data
        }

        // Render Chart.js line chart
        const ctx = document.getElementById('serviceTrendChart').getContext('2d');
        // Destroy existing chart instance if it exists
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

        // Render table below chart
        const months = chartData.labels;
        const current = chartData.datasets[0].data;
        const previous = chartData.datasets[1].data;
        let tableHTML = `<table class="trend-table"><thead><tr><th>Month</th><th>${chartData.datasets[0].label}</th><th>${chartData.datasets[1].label}</th></tr></thead><tbody>`;
        for (let i = 0; i < months.length; i++) {
            tableHTML += `<tr><td>${months[i]}</td><td>${current[i]}</td><td>${previous[i]}</td></tr>`;
        }
        tableHTML += '</tbody></table>';
        document.getElementById('serviceTrendTableContainer').innerHTML = tableHTML;
    }

    // Only call renderServiceTrendChartAndTable if on the dashboard page
    if (currentPage === 'index') {
        renderServiceTrendChartAndTable();
    }


    // Subscribe to data updates for reactivity (optional, but good practice)
    window.electronAPI.subscribeToData(getCurrentPage());
    window.electronAPI.onDataUpdate((channel) => { // Changed from window.api.onDataUpdated
        if (channel === getCurrentPage() || channel === '*') {
            console.log(`Data updated for ${channel}, reloading content.`);
            // Reload content for the current page
            if (getCurrentPage() === 'index') {
                loadDashboardContent();
                renderServiceTrendChartAndTable(); // Re-render chart and table
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

    // // // --- Enable menu button to toggle nav container ---
    // const menuButton = document.querySelector('.menu-button');
    // const navContainer = document.querySelector('.nav-container');

    // if (menuButton && navContainer) {
    //     // FIX: Ensure nav container is visible on page load
    //     navContainer.style.display = '';

    //     menuButton.addEventListener('click', () => {
    //         const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    //         menuButton.setAttribute('aria-expanded', !expanded);
    //         navContainer.style.display = expanded ? 'none' : '';
    //     });
    // }
});
