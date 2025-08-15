## Project Structure and Electron App Implementation for GenMaintPro-Desktop

This document outlines the project structure and steps to implement the Electron application, GenMaintPro-Desktop, based on the provided documentation.

### 1. Project Structure

The GenMaintPro-Desktop application follows a clear and modular structure to separate concerns and facilitate development.

**Root Directory (`GenMaintPro-Desktop/`)**

*   **`main.js`**: The main Electron process file. This is the entry point for the Electron application, responsible for creating browser windows, handling IPC communications, and managing backend services.
*   **`preload.js`**: A script that runs before other scripts in the renderer process. It provides a bridge between the renderer process and the main process, exposing necessary Node.js APIs securely.
*   **`package.json`**: Defines project metadata, scripts, and dependencies.
*   **`package-lock.json`**: Records the exact versions of dependencies installed.
*   **`style.css`**: Contains the global CSS styles for the application's user interface.
*   **`script.js`**: The main JavaScript file for the renderer process, handling UI interactions, data fetching, and rendering for most pages.
*   **`auth.js`**: Handles authentication-related logic on the frontend, including login, logout, and user registration.
*   **`apiService.js`**: A backend service module that encapsulates all database interaction logic (CRUD operations) and permission checks. It's called by the main Electron process.
*   **`authService.js`**: A backend service module specifically for user authentication (login, registration, password updates) and permission management.
*   **`database.js`**: Manages the SQLite database, including initialization, table creation, data seeding (sample data), and user action logging.
*   **`data.js`**: Contains default admin credentials and functions to generate sample data for the database.
*   **`backup-manager.js`**: (Likely a duplicate of `database.js` based on the provided content, but conceptually would handle database backup and restore operations).
*   **`performance-monitor.js`**: (Not provided, but implied by `main.js` usage) Would handle application performance monitoring.
*   **`error-boundary.js`**: Handles uncaught errors in the renderer process, providing a graceful fallback UI.
*   **`fatal-error.html`**: A simple HTML page displayed when a fatal error occurs in the renderer process.

**HTML Pages (`GenMaintPro-Desktop/`)**

*   **`index.html`**: The main dashboard page of the application.
*   **`admin.html`**: The administrative panel for managing users, data, and configurations.
*   **`clientportal.html`**: The client-specific portal to view assigned generators and service history.
*   **`registry.html`**: (Not provided, but implied by navigation) Likely for managing generator registry.
*   **`schedule.html`**: (Not provided, but implied by navigation) Likely for managing service schedules.
*   **`records.html`**: (Not provided, but implied by navigation) Likely for managing service records.
*   **`parts.html`**: (Not provided, but implied by navigation) Likely for managing parts inventory.
*   **`team.html`**: (Not provided, but implied by navigation) Likely for managing technician teams.
*   **`reports.html`**: (Not provided, but implied by navigation) Likely for viewing various reports.

### 2. Implementation Steps for the Electron App (GenMaintPro-Desktop)

Follow these steps to set up and run the GenMaintPro-Desktop Electron application.

#### Step 1: Create Project Directory

First, create the main directory for your project and navigate into it:

```bash
mkdir GenMaintPro-Desktop
cd GenMaintPro-Desktop
```

#### Step 2: Initialize npm

Initialize a new Node.js project within your directory. This will create a `package.json` file.

```bash
npm init -y
```

#### Step 3: Install Electron and other dependencies

Install Electron as a development dependency and other core dependencies required for the application's functionality.

```bash
npm install electron bcrypt sqlite3 uuid fs-extra
```

#### Step 4: Create Core Application Files

Create the following files in your `GenMaintPro-Desktop` directory with the content provided in the context:

*   `main.js`
*   `preload.js`
*   `apiService.js`
*   `authService.js`
*   `database.js`
*   `data.js`
*   `auth.js`
*   `script.js`
*   `style.css`
*   `error-boundary.js`
*   `fatal-error.html`

#### Step 5: Create HTML Pages

Create the following HTML files in your `GenMaintPro-Desktop` directory with the content provided in the context:

*   `index.html`
*   `admin.html`
*   `clientportal.html`

*(Note: For a complete application, you would also create `registry.html`, `schedule.html`, `records.html`, `parts.html`, `team.html`, and `reports.html` based on the navigation links present in the provided HTML files.)*

#### Step 6: Update `package.json` Scripts

Ensure your `package.json` includes the `start` script to run the Electron application. It should look similar to this (after `npm init -y` and `npm install`):

```json
{
  "name": "genmaintpro-desktop",
  "version": "1.0.0",
  "description": "Offline Generator Maintenance System",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "electron": "^28.3.3",
    "electron-rebuild": "^3.2.9"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "fs-extra": "^11.3.1",
    "sqlite3": "^5.1.7",
    "uuid": "^11.1.0"
  }
}
```

#### Step 7: Rebuild Native Modules (if necessary)

If you encounter issues with `sqlite3` or `bcrypt` (which are native Node.js modules), you might need to rebuild them for your Electron version:

```bash
npm install --save-dev electron-rebuild
./node_modules/.bin/electron-rebuild
```

#### Step 8: Run the Application

Now you can start your Electron application:

```bash
npm start
```

This command will launch the GenMaintPro-Desktop application, opening the `index.html` (Dashboard) page. The application will automatically initialize the SQLite database and populate it with default admin and sample data if no non-default users are found.

### Steps of Creation of the Main Electron App from Previous Thought Process Test Versions

The provided documentation reflects a well-structured Electron application. The "steps of creation" from previous thought processes was involved:

1.  **Initial Setup**: Basic Electron boilerplate (`main.js`, `index.html`, `package.json`).
2.  **UI Prototyping**: Developing the HTML and CSS for the main dashboard and other pages (`index.html`, `admin.html`, `clientportal.html`, etc.) with static content.
3.  **Database Integration (SQLite)**:
    *   Setting up `database.js` to initialize SQLite.
    *   Defining table schemas (`users`, `generators`, `services`, `parts`, `user_actions`).
    *   Implementing initial data seeding (`data.js`, `populateSampleData`).
4.  **Backend API Layer (`apiService.js`)**:
    *   Creating generic CRUD operations (`get`, `post`, `put`, `delete`) that interact with the `database.js`.
    *   Implementing specific data retrieval logic for different endpoints (e.g., `users`, `generators`, `services`, `parts`, `dashboardStats`, `adminPanelStats`, `userActions`).
5.  **Authentication System (`authService.js`, `auth.js`)**:
    *   Implementing user registration and login logic using `bcrypt` for password hashing.
    *   Handling user sessions and `currentUser` state in `main.js`.
    *   Developing frontend authentication UI (`signInUpModal`, `loginForm`, `signupForm`).
    *   Implementing the "first login" password change mechanism for the default admin.
6.  **IPC Communication**:
    *   Establishing secure communication between renderer and main processes using `ipcRenderer` and `ipcMain` (e.g., `window.electronAPI.login`, `ipcMain.handle('auth:login')`).
    *   Implementing data update notifications (`notifyDataUpdate`) to keep the UI synchronized.
7.  **Frontend Logic (`script.js`)**:
    *   Fetching and displaying data from the backend API.
    *   Implementing filtering, sorting, and pagination for tables.
    *   Handling modal interactions (add/edit forms, confirmations).
    *   Integrating charting libraries (Chart.js) for data visualization.
    *   Implementing UI features like dark mode toggle.
8.  **Authorization and Permissions**:
    *   Defining granular permissions for different user roles (`data.js`).
    *   Implementing `checkPermission` in `apiService.js` to enforce access control on the backend.
    *   Dynamically showing/hiding UI elements based on user permissions on the frontend (`updateNavigationVisibility` in `auth.js`).
9.  **Admin Functionality**:
    *   Implementing database reset and sample data loading features, with admin credential verification.
    *   Adding user management (add, edit, delete users) and user action logging.
10. **Error Handling and Robustness**:
    *   Implementing `error-boundary.js` for renderer process errors.
    *   Handling renderer crashes in `main.js` (`render-process-gone`).
    *   Adding basic input validation and error messages.
11. **Backup and Restore**:
    *   Implementing `backup-manager.js` (or integrating its logic into `database.js`) for manual and automatic backups.
    *   Adding IPC handlers for backup/restore operations with permission checks.

This iterative process, starting from basic functionality and progressively adding features and robustness, would lead to the comprehensive structure observed in the provided files.
