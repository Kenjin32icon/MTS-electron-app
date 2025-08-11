database.js: analyze the following js code and ensure that the  code The `users` table schema in `database.js` needs to be extended to include fields like `phone`, `address`, `employee_id`, `hire_date`, `team`, `certifications`, `specialties` to support technician details.* and output the complete combined code 
Analyze the following document and edit the following code using the following specifications and output the complete combined code suitable for an electron app.; This is the most labor-intensive part. All `fetch` or `api.get/post/put/delete` calls that previously went to the Node.js backend must now use the `window.electronAPI.api` object exposed by the preload script.

**Example for `signin.js`:**

*   **Original `signin.js` (simplified):**
    ```javascript
    // Original signin.js
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isRegister = document.getElementById('signup-toggle').classList.contains('active');

        let url = isRegister ? '/api/register' : '/api/login';
        let method = 'POST';
        let body = { email, password };
        if (isRegister) {
            body.name = document.getElementById('name').value;
        }

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            const data = await response.json();
            if (response.ok) {
                // Handle success, e.g., store token, redirect
                console.log('Auth successful:', data);
                localStorage.setItem('user', JSON.stringify(data.user)); // Store user info
                window.location.href = 'index.html'; // Redirect
            } else {
                // Handle error
                console.error('Auth failed:', data.error);
                document.getElementById('auth-feedback').textContent = data.error;
                document.getElementById('auth-feedback').classList.remove('hidden');
            }
        } catch (error) {
            console.error('Network error:', error);
            document.getElementById('auth-feedback').textContent = 'Network error. Please try again.';
            document.getElementById('auth-feedback').classList.remove('hidden');
        }
    });
    ```

*   **Modified `signin.js` for Electron:**
    ```javascript
    // Modified signin.js
    document.addEventListener('DOMContentLoaded', () => {
        const loginToggle = document.getElementById('login-toggle');
        const signupToggle = document.getElementById('signup-toggle');
        const nameField = document.getElementById('name-field');
        const passwordConfirmField = document.getElementById('password-confirm-field');
        const formTitle = document.getElementById('form-title');
        const formSubtitle = document.getElementById('form-subtitle');
        const authFeedback = document.getElementById('auth-feedback');
        const authSuccess = document.getElementById('auth-success');
        const successMessage = document.getElementById('success-message');
        const submitBtn = document.getElementById('submit-btn');
        const loadingSpinner = document.getElementById('loading-spinner');

        let isLoginMode = true;

        function toggleFormMode(toLogin) {
            isLoginMode = toLogin;
            loginToggle.classList.toggle('active', toLogin);
            signupToggle.classList.toggle('active', !toLogin);
            nameField.classList.toggle('hidden', toLogin);
            passwordConfirmField.classList.toggle('hidden', toLogin);
            formTitle.textContent = toLogin ? 'Welcome Back' : 'Create Account';
            formSubtitle.textContent = toLogin ? 'Please sign in to your account' : 'Join GenMaint Pro today';
            submitBtn.textContent = toLogin ? 'Sign In' : 'Sign Up';
            authFeedback.classList.add('hidden');
            authSuccess.classList.add('hidden');
        }

        loginToggle.addEventListener('click', () => toggleFormMode(true));
        signupToggle.addEventListener('click', () => toggleFormMode(false));

        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            authFeedback.classList.add('hidden');
            authSuccess.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
            submitBtn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const passwordConfirm = document.getElementById('password-confirm').value;
            const name = document.getElementById('name').value;

            if (!isLoginMode && password !== passwordConfirm) {
                authFeedback.textContent = 'Passwords do not match.';
                authFeedback.classList.remove('hidden');
                loadingSpinner.classList.add('hidden');
                submitBtn.disabled = false;
                return;
            }

            try {
                let result;
                if (isLoginMode) {
                    result = await window.electronAPI.login({ email, password });
                } else {
                    result = await window.electronAPI.register({ name, email, password });
                }

                if (result.success) {
                    successMessage.textContent = isLoginMode ? 'Login successful! Redirecting...' : 'Registration successful! You can now sign in.';
                    authSuccess.classList.remove('hidden');
                    // For an offline app, we might store user info in localStorage
                    localStorage.setItem('currentUser', JSON.stringify(result.user));
                    if (isLoginMode) {
                        setTimeout(() => {
                            window.location.href = 'index.html'; // Redirect to dashboard
                        }, 1500);
                    } else {
                        // After successful registration, switch to login mode
                        toggleFormMode(true);
                        document.getElementById('email').value = email; // Pre-fill email
                        document.getElementById('password').value = '';
                        document.getElementById('password-confirm').value = '';
                        document.getElementById('name').value = '';
                    }
                } else {
                    authFeedback.textContent = result.message || 'An unknown error occurred.';
                    authFeedback.classList.remove('hidden');
                }
            } catch (error) {
                console.error('Authentication error:', error);
                authFeedback.textContent = 'An unexpected error occurred. Please try again.';
                authFeedback.classList.remove('hidden');
            } finally {
                loadingSpinner.classList.add('hidden');
                submitBtn.disabled = false;
            }
        });
    });
    ```
 

 //////////////////////////////////////////
 Analyze the following document and edit the following code using the following specifications and output the complete combined code suitable for an electron app. ; **Example for `script.js` (API calls):**

*   **Original `script.js` (simplified `api` object):**
    ```javascript
    // Original script.js (simplified api object)
    const api = {
        get: async (endpoint) => {
            const response = await fetch(`/api/${endpoint}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        },
        post: async (endpoint, data) => { /* ... */ },
        // ... other methods
    };

    // Example usage in script.js
    document.addEventListener('DOMContentLoaded', async () => {
        // ...
        const users = await api.get('users'); // This call needs to change
        renderUsersTable(users);
        // ...
    });
    ```

*   **Modified `script.js` for Electron:**
    ```javascript
    // Modified script.js
    // Remove the old 'api' object definition if it exists.
    // The global 'api' object will now be provided by preload.js via window.electronAPI.api

    document.addEventListener('DOMContentLoaded', async () => {
        // Ensure the electronAPI is available
        if (typeof window.electronAPI === 'undefined' || typeof window.electronAPI.api === 'undefined') {
            console.error('Electron API not available. Running in a non-Electron environment or preload script failed.');
            // Fallback or error handling for non-Electron environment if necessary
            return;
        }

        // Now, 'api' refers to window.electronAPI.api
        const api = window.electronAPI.api;

        // Example usage (remains largely the same, but now calls Electron main process)
        // In admin.html's script block:
        // document.addEventListener('DOMContentLoaded', async () => {
        //   const users = await api.get('users'); // This will now call window.electronAPI.api.get('users')
        //   renderUsersTable(users);
        // });

        // Example for adding a new user (from admin.html)
        // document.getElementById('addNewUserForm').addEventListener('submit', async (e) => {
        //     e.preventDefault();
        //     const formData = new FormData(e.target);
        //     const userData = Object.fromEntries(formData.entries());
        //     try {
        //         const newUser = await api.post('users', userData);
        //         console.log('New user added:', newUser);
        //         // Refresh table or close modal
        //     } catch (error) {
        //         console.error('Error adding user:', error);
        //         // Show error message
        //     }
        // });

        // You will need to go through ALL `script.js` and `signin.js` files
        // and replace direct `fetch` calls or the `api` object usage with `window.electronAPI.api`.
        // For `script.js`, you can simply add `const api = window.electronAPI.api;` at the top
        // and the rest of the calls should work if they were already using `api.get()`, etc.

        // Initialize dark mode toggle (assuming this is in script.js)
        const darkModeToggle = document.getElementById('darkModeToggle');
        const darkModeIcon = document.getElementById('darkModeIcon');
        const darkModeText = document.getElementById('darkModeText');

        if (darkModeToggle) {
            // Load saved preference or default to light mode
            const isDarkMode = localStorage.getItem('darkMode') === 'true';
            if (isDarkMode) {
                document.body.classList.add('dark-mode');
                darkModeIcon.classList.replace('fa-moon', 'fa-sun');
                darkModeText.textContent = 'Dark Mode';
            } else {
                darkModeIcon.classList.replace('fa-sun', 'fa-moon');
                darkModeText.textContent = 'Light Mode';
            }

            darkModeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                const currentMode = document.body.classList.contains('dark-mode');
                localStorage.setItem('darkMode', currentMode);

                if (currentMode) {
                    darkModeIcon.classList.replace('fa-moon', 'fa-sun');
                    darkModeText.textContent = 'Dark Mode';
                } else {
                    darkModeIcon.classList.replace('fa-sun', 'fa-moon');
                    darkModeText.textContent = 'Light Mode';
                }
            });
        }

        // Mobile menu toggle (assuming this is in script.js)
        const menuButton = document.querySelector('.menu-button');
        const headerContainer = document.querySelector('.header-container');
        const navContainer = document.querySelector('.nav-container'); // Assuming this is the element that needs to be toggled

        if (menuButton && headerContainer && navContainer) {
            menuButton.addEventListener('click', () => {
                const isExpanded = menuButton.getAttribute('aria-expanded') === 'true';
                menuButton.setAttribute('aria-expanded', !isExpanded);
                menuButton.classList.toggle('active');
                headerContainer.classList.toggle('active');
                navContainer.classList.toggle('active'); // Toggle the nav-container as well
            });
        }

        // Generic modal handling (assuming this is in script.js)
        document.querySelectorAll('.modal').forEach(modal => {
            const closeButtons = modal.querySelectorAll('.close-modal, .btn-close');
            closeButtons.forEach(button => {
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            });
        });

        // Example of opening a modal (you'll have specific buttons for each modal)
        // For example, in admin.html:
        // const addNewUserBtn = document.getElementById('addNewUserBtn');
        // const addNewUserModal = document.getElementById('addNewUserModal');
        // if (addNewUserBtn && addNewUserModal) {
        //     addNewUserBtn.addEventListener('click', () => {
        //         addNewUserModal.style.display = 'flex';
        //     });
        // }

        // Implement sorting for tables (assuming this is in script.js)
        document.querySelectorAll('table').forEach(table => {
            const headers = table.querySelectorAll('th.sortable');
            headers.forEach(header => {
                header.addEventListener('click', () => {
                    const column = header.dataset.sort;
                    const currentOrder = header.classList.contains('sorted-asc') ? 'desc' : 'asc';

                    // Remove sorting classes from other headers
                    headers.forEach(h => {
                        h.classList.remove('sorted-asc', 'sorted-desc');
                    });

                    // Add sorting class to current header
                    header.classList.add(`sorted-${currentOrder}`);

                    // Get table body rows
                    const tbody = table.querySelector('tbody');
                    const rows = Array.from(tbody.querySelectorAll('tr'));

                    // Sort rows
                    rows.sort((a, b) => {
                        const aText = a.querySelector(`td:nth-child(${Array.from(header.parentNode.children).indexOf(header) + 1})`).textContent.trim();
                        const bText = b.querySelector(`td:nth-child(${Array.from(header.parentNode.children).indexOf(header) + 1})`).textContent.trim();

                        if (currentOrder === 'asc') {
                            return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
                        } else {
                            return bText.localeCompare(aText, undefined, { numeric: true, sensitivity: 'base' });
                        }
                    });

                    // Re-append sorted rows
                    rows.forEach(row => tbody.appendChild(row));
                });
            });
        });

        // Implement multi-step forms (for addGeneratorModal, addPartModal, addServiceModal, addTechnicianModal)
        document.querySelectorAll('.modal').forEach(modal => {
            const formNavigationTabs = modal.querySelector('.form-navigation-tabs');
            if (formNavigationTabs) {
                const formSections = modal.querySelectorAll('.form-section');
                const prevBtn = modal.querySelector('[id^="prev"][id$="SectionBtn"]');
                const nextBtn = modal.querySelector('[id^="next"][id$="SectionBtn"]');
                const submitBtn = modal.querySelector('[id^="submitNew"][id$="FormBtn"]');

                let currentSectionIndex = 0;

                function showSection(index) {
                    formSections.forEach((section, i) => {
                        section.classList.toggle('active', i === index);
                    });
                    formNavigationTabs.querySelectorAll('.nav-tab').forEach((tab, i) => {
                        tab.classList.toggle('active', i === index);
                    });

                    prevBtn.style.display = index === 0 ? 'none' : 'inline-block';
                    nextBtn.style.display = index === formSections.length - 1 ? 'none' : 'inline-block';
                    submitBtn.style.display = index === formSections.length - 1 ? 'inline-block' : 'none';
                    currentSectionIndex = index;
                }

                formNavigationTabs.addEventListener('click', (e) => {
                    if (e.target.classList.contains('nav-tab')) {
                        const targetSection = e.target.dataset.section;
                        const index = Array.from(formSections).findIndex(section => section.id === `section-${targetSection}`);
                        if (index !== -1) {
                            showSection(index);
                        }
                    }
                });

                if (prevBtn) {
                    prevBtn.addEventListener('click', () => {
                        if (currentSectionIndex > 0) {
                            showSection(currentSectionIndex - 1);
                        }
                    });
                }

                if (nextBtn) {
                    nextBtn.addEventListener('click', () => {
                        if (currentSectionIndex < formSections.length - 1) {
                            showSection(currentSectionIndex + 1);
                        }
                    });
                }

                // Initialize first section
                showSection(0);
            }
        });

        // Implement specific data rendering functions for each page
        // These functions will need to be called after fetching data using `api.get()`
        // Example for admin.html:
        // function renderUsersTable(users) {
        //     const tbody = document.querySelector('#userManagementTable tbody');
        //     if (!tbody) return;
        //     tbody.innerHTML = ''; // Clear existing rows
        //     users.forEach(user => {
        //         const row = tbody.insertRow();
        //         row.innerHTML = `
        //             <td>${user.name}</td>
        //             <td>${user.email}</td>
        //             <td><span class="status-badge role-${user.role}">${user.role}</span></td>
        //             <td>${user.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}</td>
        //             <td><span class="status-badge status-${user.status}">${user.status}</span></td>
        //             <td>
        //                 <button class="action-button view-details edit-user-btn" data-id="${user.id}">
        //                     <i class="fas fa-edit"></i> Edit
        //                 </button>
        //                 <button class="action-button delete-button delete-user-btn" data-id="${user.id}">
        //                     <i class="fas fa-trash"></i> Delete
        //                 </button>
        //             </td>
        //         `;
        //     });
        //     // Attach event listeners for edit/delete buttons
        //     tbody.querySelectorAll('.edit-user-btn').forEach(button => {
        //         button.addEventListener('click', async () => {
        //             const userId = button.dataset.id;
        //             // Fetch user details and populate edit modal
        //             const userToEdit = users.find(u => u.id === userId);
        //             if (userToEdit) {
        //                 document.getElementById('modalUserName').textContent = userToEdit.name;
        //                 document.getElementById('modalUserEmail').textContent = userToEdit.email;
        //                 document.getElementById('modalUserId').textContent = userToEdit.id;
        //                 document.getElementById('editUserRole').value = userToEdit.role;
        //                 document.getElementById('userAccessStatus').value = userToEdit.status;
        //                 document.getElementById('editUserRoleModal').style.display = 'flex';
        //             }
        //         });
        //     });
        //     tbody.querySelectorAll('.delete-user-btn').forEach(button => {
        //         button.addEventListener('click', async () => {
        //             const userId = button.dataset.id;
        //             if (confirm('Are you sure you want to delete this user?')) {
        //                 try {
        //                     await api.delete('users', userId);
        //                     alert('User deleted successfully!');
        //                     const updatedUsers = await api.get('users');
        //                     renderUsersTable(updatedUsers);
        //                 } catch (error) {
        //                     console.error('Error deleting user:', error);
        //                     alert('Failed to delete user.');
        //                 }
        //             }
        //         });
        //     });
        // }

        // You will need to define similar `render...Table` functions for:
        // - `renderGeneratorsTable` (for registry.html and clientportal.html)
        // - `renderRecordsTable` (for records.html and reports.html)
        // - `renderPartsTable` (for parts.html)
        // - `renderTeamTable` (for team.html)

        // And then call them on DOMContentLoaded for each respective page, e.g.:
        // if (document.getElementById('userManagementTable')) { // Check if on admin page
        //     const users = await api.get('users');
        //     renderUsersTable(users);
        // }
        // if (document.getElementById('registryTable')) { // Check if on registry page
        //     const generators = await api.get('generators');
        //     renderGeneratorsTable(generators);
        // }
        // ... and so on for all pages.

        // For the calendar in schedule.html, the logic will also need to fetch services locally
        // and populate the calendar grid.
        // The Chart.js data in index.html will also need to be populated from local SQLite data.
    });
