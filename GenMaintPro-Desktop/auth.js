// FileName: /auth.js

const initAuth = (authButton, signInUpModal, closeSignInUpModal, loginForm, signupForm, tabButtons, firstLoginModal, closeFirstLoginModal, firstLoginForm) => {

    // Utility function to switch tabs (duplicated for auth.js scope)
    const switchTab = (tabName) => {
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}Tab`);
        });
    };

    // Modified updateNavigationVisibility function (moved from script.js)
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


    // ENFORCE LOGIN: Check authentication immediately
    let currentUser; // Declare currentUser here to be accessible within initAuth scope

    // Function to update UI based on login status and permissions (moved from script.js)
    async function updateUI() {
        currentUser = await window.electronAPI.getCurrentUser();
        console.log("Current User:", currentUser);

        if (currentUser && currentUser.success === false) {
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

        // Assuming navLinks and navActionLinks are passed or globally accessible if needed
        // For now, directly query them as they are part of the main document structure
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.parentElement.style.display = ''; // Show the li element
        });

        document.querySelectorAll('.nav-actions a').forEach(link => {
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

    // Initial UI update when auth.js is loaded
    updateUI();

    // Handle page navigation (modified to use updateUI)
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

    // Enhanced tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            switchTab(button.dataset.tab);
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
                    if (firstLoginModal) document.getElementById('firstLoginModal').style.display = 'block';
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

            // Show loading state
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing Up...';
            submitBtn.disabled = true;

            try {
                // Client-side validation
                if (!name || !email || !password) {
                    throw new Error('Please fill all required fields');
                }

                const result = await window.electronAPI.register({ name, email, password, role });
                if (result.success) {
                    // Auto-login after successful signup
                    const loginResult = await window.electronAPI.login({ email, password });

                    if (loginResult.success) {
                        alert('Registration successful! You are now logged in.');
                        if (signInUpModal) signInUpModal.style.display = 'none';
                        await updateNavigationVisibility();

                        // Handle first login if needed
                        if (loginResult.user?.first_login) {
                            if (firstLoginModal) document.getElementById('firstLoginModal').style.display = 'block';
                            if (document.getElementById('newAdminName')) document.getElementById('newAdminName').value = loginResult.user.name;
                            if (document.getElementById('newAdminEmail')) document.getElementById('newAdminEmail').value = loginResult.user.email;
                        }

                        window.location.reload(); // Reload to update UI based on new login state
                    } else {
                        throw new Error('Automatic login failed. Please log in manually.');
                    }
                } else {
                    throw new Error(result.message || 'Registration failed.');
                }
            } catch (error) {
                const errorElement = document.getElementById('signupError');
                if (errorElement) {
                    errorElement.textContent = error.message;
                    errorElement.style.display = 'block';
                }
            } finally {
                // Reset button state
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
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
};

export { initAuth };
