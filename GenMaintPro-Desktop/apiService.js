// FileName: /apiService.js
const { getDb, logUserAction } = require('./database'); // Import logUserAction
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// Helper to run database queries with promises
const runQuery = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error("Database run error:", err.message, "SQL:", sql, "Params:", params);
                reject(err);
            } else {
                resolve({ id: this.lastID, changes: this.changes });
            }
        });
    });
};

const allQuery = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error("Database all error:", err.message, "SQL:", sql, "Params:", params);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getQuery = (db, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error("Database get error:", err.message, "SQL:", sql, "Params:", params);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Basic authorization check (can be expanded)
// userPermissions is an object { permAdmin: true, permReports: false, ... }
const checkPermission = async (userPermissions, requiredPermission, userId, actionDetails, allowUnauthenticated = false) => {
    // Allow unauthenticated access for specific endpoints (e.g., dashboard stats, charts)
    if (allowUnauthenticated) {
        return true;
    }

    // Enforce authentication for ALL other endpoints.
    // If no user is logged in (userId is null), deny access.
    if (!userId) {
        await logUserAction(null, 'ACCESS_DENIED', actionDetails || `Attempt to access resource without login: ${requiredPermission}`);
        throw new Error(`Unauthorized: Please log in to access this resource.`);
    }

    // If a user is logged in, but doesn't have the required permission
    if (!userPermissions || !userPermissions[requiredPermission]) {
        await logUserAction(userId, 'ACCESS_DENIED', actionDetails || `Attempt to access resource without permission: ${requiredPermission}`);
        throw new Error(`Unauthorized: Missing permission "${requiredPermission}".`);
    }
};

const apiService = {
    // Generic GET endpoint
    async get(endpoint, id = null, userRole = null, userPermissions = {}, userId = null) {
        const db = getDb();
        let sql;
        let params = [];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1; // 1-indexed

        try {
            // Define which endpoints are accessible without authentication
            const publicEndpoints = ['dashboardStats', 'chartData'];

            // All endpoints now require permission check, with an exception for public ones
            // The 'permDashboard' permission is used as a general access permission for public endpoints.
            // If the endpoint is public, the permission check is bypassed for unauthenticated users.
            await checkPermission(userPermissions, 'permDashboard', userId, `Attempt to view ${endpoint} without permission`, publicEndpoints.includes(endpoint));

            switch (endpoint) {
                case 'users':
                    await checkPermission(userPermissions, 'permAdmin', userId, 'Attempt to view users without permission');
                    if (id) {
                        sql = `SELECT id, name, email, password_hash, role, status, last_login, phone, address, employee_id, hire_date, team, certifications, specialties, notes, first_login, permissions FROM users WHERE id = ?`;
                        params = [id];
                        const user = await getQuery(db, sql, params);
                        if (user && user.permissions) {
                            user.permissions = JSON.parse(user.permissions); // Parse permissions string
                        }
                        await logUserAction(userId, 'VIEW_USER', `Viewed user: ${id}`);
                        return user;
                    } else {
                        sql = `SELECT id, name, email, role, status, last_login, phone, address, employee_id, hire_date, team, certifications, specialties, notes, first_login, permissions FROM users`;
                        const users = await allQuery(db, sql);
                        await logUserAction(userId, 'VIEW_ALL_USERS', `Viewed all users`);
                        return users.map(user => {
                            if (user.permissions) {
                                user.permissions = JSON.parse(user.permissions); // Parse permissions string
                            }
                            return user;
                        });
                    }
                case 'generators':
                    // Clients can only view their own generators
                    if (userRole === 'client' && userId) {
                        await checkPermission(userPermissions, 'permClientPortal', userId, 'Attempt to view client generators without permission');
                        sql = `SELECT g.*, u.name AS client_name, u.email AS client_email, t.name AS assigned_tech_name
                               FROM generators g
                               LEFT JOIN users u ON g.client_id = u.id
                               LEFT JOIN users t ON g.assigned_tech_id = t.id
                               WHERE g.client_id = ?`;
                        params = [userId];
                        await logUserAction(userId, 'VIEW_CLIENT_GENERATORS', `Viewed own generators`);
                        return await allQuery(db, sql);
                    } else {
                        await checkPermission(userPermissions, 'permRegistryModify', userId, 'Attempt to view generators without permission');
                        if (id) {
                            sql = `SELECT g.*, u.name AS client_name, u.email AS client_email, t.name AS assigned_tech_name
                               FROM generators g
                               LEFT JOIN users u ON g.client_id = u.id
                               LEFT JOIN users t ON g.assigned_tech_id = t.id
                               WHERE g.id = ?`;
                            params = [id];
                            await logUserAction(userId, 'VIEW_GENERATOR', `Viewed generator: ${id}`);
                            return await getQuery(db, sql, params);
                        } else {
                            sql = `SELECT g.*, u.name AS client_name, u.email AS client_email, t.name AS assigned_tech_name
                               FROM generators g
                               LEFT JOIN users u ON g.client_id = u.id
                               LEFT JOIN users t ON g.assigned_tech_id = t.id`;
                            await logUserAction(userId, 'VIEW_ALL_GENERATORS', `Viewed all generators`);
                            return await allQuery(db, sql);
                        }
                    }
                case 'services':
                    // Clients can only view services for their own generators
                    if (userRole === 'client' && userId) {
                        await checkPermission(userPermissions, 'permClientPortal', userId, 'Attempt to view client services without permission');
                        sql = `SELECT s.*, g.model AS generator_model, g.serial_number AS generator_serial, g.location AS generator_location,
                               t.name AS technician_name
                               FROM services s
                               JOIN generators g ON s.generator_id = g.id
                               JOIN users t ON s.technician_id = t.id
                               WHERE g.client_id = ?`;
                        params = [userId];
                        await logUserAction(userId, 'VIEW_CLIENT_SERVICES', `Viewed services for own generators`);
                        return await allQuery(db, sql);
                    } else {
                        await checkPermission(userPermissions, 'permRecordsModify', userId, 'Attempt to view service records without permission');
                        if (id) {
                            sql = `SELECT s.*, g.model AS generator_model, g.serial_number AS generator_serial, g.location AS generator_location, g.total_hours_run, g.last_service AS generator_last_service, g.next_service AS generator_next_service,
                               t.name AS technician_name, t.email AS technician_email, t.team AS technician_team, t.certifications AS technician_certifications
                               FROM services s
                               JOIN generators g ON s.generator_id = g.id
                               JOIN users t ON s.technician_id = t.id
                               WHERE s.id = ?`;
                            params = [id];
                            await logUserAction(userId, 'VIEW_SERVICE', `Viewed service record: ${id}`);
                            return await getQuery(db, sql, params);
                        } else {
                            sql = `SELECT s.*, g.model AS generator_model, g.serial_number AS generator_serial, g.location AS generator_location,
                               t.name AS technician_name
                               FROM services s
                               JOIN generators g ON s.generator_id = g.id
                               JOIN users t ON s.technician_id = t.id`;
                            await logUserAction(userId, 'VIEW_ALL_SERVICES', `Viewed all service records`);
                            return await allQuery(db, sql);
                        }
                    }
                case 'parts':
                    await checkPermission(userPermissions, 'permPartsModify', userId, 'Attempt to view parts without permission');
                    if (id) {
                        sql = `SELECT * FROM parts WHERE id = ?`;
                        params = [id];
                        await logUserAction(userId, 'VIEW_PART', `Viewed part: ${id}`);
                        return await getQuery(db, sql, params);
                    } else {
                        sql = `SELECT * FROM parts`;
                        await logUserAction(userId, 'VIEW_ALL_PARTS', `Viewed all parts`);
                        return await allQuery(db, sql);
                    }
                case 'technicians':
                    await checkPermission(userPermissions, 'permTeamModify', userId, 'Attempt to view technicians without permission');
                    if (id) {
                        sql = `SELECT id, name, email, phone, role, status, employee_id, hire_date, team, certifications, specialties, notes FROM users WHERE id = ? AND role = 'technician'`;
                        params = [id];
                        await logUserAction(userId, 'VIEW_TECHNICIAN', `Viewed technician: ${id}`);
                        return await getQuery(db, sql, params);
                    } else {
                        sql = `SELECT id, name, email, phone, role, status, employee_id, hire_date, team, certifications, specialties, notes FROM users WHERE role = 'technician'`;
                        await logUserAction(userId, 'VIEW_ALL_TECHNICIANS', `Viewed all technicians`);
                        return await allQuery(db, sql);
                    }
                case 'userActions': // New endpoint for user action logs
                    await checkPermission(userPermissions, 'permAdmin', userId, 'Attempt to view user actions without admin permission');
                    sql = `SELECT ua.*, u.name AS user_name, u.email AS user_email FROM user_actions ua LEFT JOIN users u ON ua.user_id = u.id ORDER BY timestamp DESC`;
                    await logUserAction(userId, 'VIEW_USER_ACTIONS', `Viewed user action logs`);
                    return await allQuery(db, sql);

                case 'chartData':
                    // Publicly accessible for dashboard visualization
                    const serviceCountsCurrentYear = await allQuery(db, `
                        SELECT strftime('%m', service_date) AS month, COUNT(*) AS count
                        FROM services
                        WHERE strftime('%Y', service_date) = ?
                        GROUP BY month ORDER BY month
                    `, [currentYear.toString()]);

                    const serviceCountsPreviousYear = await allQuery(db, `
                        SELECT strftime('%m', service_date) AS month, COUNT(*) AS count
                        FROM services
                        WHERE strftime('%Y', service_date) = ?
                        GROUP BY month ORDER BY month
                    `, [(currentYear - 1).toString()]);

                    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const dataCurrentYear = new Array(12).fill(0);
                    const dataPreviousYear = new Array(12).fill(0);

                    serviceCountsCurrentYear.forEach(row => {
                        dataCurrentYear[parseInt(row.month, 10) - 1] = row.count;
                    });
                    serviceCountsPreviousYear.forEach(row => {
                        dataPreviousYear[parseInt(row.month, 10) - 1] = row.count;
                    });
                    await logUserAction(userId, 'VIEW_CHART_DATA', `Viewed service trend chart data`);
                    return {
                        labels: labels,
                        datasets: [
                            { label: currentYear.toString(), data: dataCurrentYear, backgroundColor: 'rgba(52, 152, 219, 0.8)', borderColor: 'rgba(41, 128, 185, 1)', borderWidth: 1 },
                            { label: (currentYear - 1).toString(), data: dataPreviousYear, backgroundColor: 'rgba(149, 165, 166, 0.8)', borderColor: 'rgba(127, 140, 141, 1)', borderWidth: 1 }
                        ]
                    };
                case 'scheduledServices':
                    await checkPermission(userPermissions, 'permScheduleModify', userId, 'Attempt to view schedule without permission');
                    sql = `SELECT s.id, s.service_date, s.service_type, s.status,
                           g.model AS generator_model, g.serial_number AS generator_serial, g.location AS generator_location,
                           t.name AS technician_name
                           FROM services s
                           JOIN generators g ON s.generator_id = g.id
                           JOIN users t ON s.technician_id = t.id
                           WHERE s.status IN ('pending', 'scheduled')`;
                    await logUserAction(userId, 'VIEW_SCHEDULED_SERVICES', `Viewed scheduled services`);
                    return await allQuery(db, sql);

                // --- Dashboard Stats ---
                case 'dashboardStats':
                    // Publicly accessible for dashboard visualization
                    const totalServicesYTD = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE strftime('%Y', service_date) = ?`, [currentYear.toString()]);
                    const totalCostYTD = await getQuery(db, `SELECT SUM(service_cost) AS total FROM services WHERE strftime('%Y', service_date) = ?`, [currentYear.toString()]);
                    const avgResponseTime = await getQuery(db, `SELECT AVG(julianday(service_date) - julianday(created_at)) * 24 AS avg_hours FROM services WHERE status = 'completed' AND strftime('%Y', service_date) = ?`, [currentYear.toString()]); // Assuming created_at is when service was requested/scheduled
                    const overdueServices = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND service_date < CURRENT_DATE`);

                    // For trend calculation, compare with previous year
                    const totalServicesPrevYear = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE strftime('%Y', service_date) = ?`, [(currentYear - 1).toString()]);
                    const totalCostPrevYear = await getQuery(db, `SELECT SUM(service_cost) AS total FROM services WHERE strftime('%Y', service_date) = ?`, [(currentYear - 1).toString()]);
                    const overdueServicesPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND service_date < DATE('now', 'start of month') AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);

                    let totalServicesTrend = 'N/A';
                    if (totalServicesPrevYear.count > 0) {
                        const percentageChange = ((totalServicesYTD.count - totalServicesPrevYear.count) / totalServicesPrevYear.count) * 100;
                        totalServicesTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last year`;
                    } else if (totalServicesYTD.count > 0) {
                        totalServicesTrend = 'New data this year';
                    }

                    let totalCostTrend = 'N/A';
                    if (totalCostPrevYear.total > 0) {
                        const percentageChange = ((totalCostYTD.total - totalCostPrevYear.total) / totalCostPrevYear.total) * 100;
                        totalCostTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last year`;
                    } else if (totalCostYTD.total > 0) {
                        totalCostTrend = 'New cost data this year';
                    }

                    let overdueServicesTrend = 'N/A';
                    if (overdueServicesPrevMonth.count > 0) {
                        const percentageChange = ((overdueServices.count - overdueServicesPrevMonth.count) / overdueServicesPrevMonth.count) * 100;
                        overdueServicesTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (overdueServices.count > 0) {
                        overdueServicesTrend = 'New overdue services this month';
                    }
                    await logUserAction(userId, 'VIEW_DASHBOARD_STATS', `Viewed dashboard statistics`);

                    return {
                        totalServicesYTD: totalServicesYTD.count || 0,
                        totalServicesTrend: totalServicesTrend,
                        totalCostYTD: totalCostYTD.total || 0,
                        totalCostTrend: totalCostTrend,
                        avgResponseTime: avgResponseTime.avg_hours ? avgResponseTime.avg_hours.toFixed(1) : 'N/A',
                        avgResponseTimeTrend: 'N/A', // Placeholder, requires more complex trend logic
                        overdueServices: overdueServices.count || 0,
                        overdueServicesTrend: overdueServicesTrend
                    };

                // --- Service Records Stats ---
                case 'serviceRecordsStats':
                    await checkPermission(userPermissions, 'permRecordsModify', userId, 'Attempt to view service records stats without permission');
                    const completedServices = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'completed'`);
                    const pendingServices = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' OR status = 'scheduled'`);
                    const overdueRecords = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND service_date < CURRENT_DATE`);
                    const activeTechnicians = await getQuery(db, `SELECT COUNT(DISTINCT id) AS count FROM users WHERE role = 'technician' AND status = 'active'`);

                    // Trends for service records
                    const completedServicesPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'completed' AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);
                    const pendingServicesPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE (status = 'pending' OR status = 'scheduled') AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);
                    const overdueRecordsPrevMonthCount = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND service_date < DATE('now', 'start of month') AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);
                    // For active technicians, we need to count active technicians at the end of the previous month.
                    // This is a simplification; a more robust solution would involve historical user status.
                    const activeTechniciansPrevMonthCount = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND status = 'active' AND created_at <= DATE('now', 'start of month', '-1 day')`);


                    let completedServicesTrend = 'N/A';
                    if (completedServicesPrevMonth.count > 0) {
                        const percentageChange = ((completedServices.count - completedServicesPrevMonth.count) / completedServicesPrevMonth.count) * 100;
                        completedServicesTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (completedServices.count > 0) {
                        completedServicesTrend = 'New completed services this month';
                    }

                    let pendingServicesTrend = 'N/A';
                    if (pendingServicesPrevMonth.count > 0) {
                        const percentageChange = ((pendingServices.count - pendingServicesPrevMonth.count) / pendingServicesPrevMonth.count) * 100;
                        pendingServicesTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (pendingServices.count > 0) {
                        pendingServicesTrend = 'New pending services this month';
                    }

                    let overdueRecordsTrend = 'N/A';
                    if (overdueRecordsPrevMonthCount.count > 0) {
                        const percentageChange = ((overdueRecords.count - overdueRecordsPrevMonthCount.count) / overdueRecordsPrevMonthCount.count) * 100;
                        overdueRecordsTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (overdueRecords.count > 0) {
                        overdueRecordsTrend = 'New overdue records this month';
                    }

                    let activeTechniciansTrend = 'N/A'; // Corrected: Removed redeclaration
                    if (activeTechniciansPrevMonthCount.count > 0) {
                        const percentageChange = ((activeTechnicians.count - activeTechniciansPrevMonthCount.count) / activeTechniciansPrevMonthCount.count) * 100;
                        activeTechniciansTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (activeTechnicians.count > 0) {
                        activeTechniciansTrend = 'New active technicians this month';
                    }
                    await logUserAction(userId, 'VIEW_SERVICE_RECORDS_STATS', `Viewed service records statistics`);

                    return {
                        completedServices: completedServices.count || 0,
                        completedServicesTrend: completedServicesTrend,
                        pendingServices: pendingServices.count || 0,
                        pendingServicesTrend: pendingServicesTrend,
                        overdueRecords: overdueRecords.count || 0,
                        overdueRecordsTrend: overdueRecordsTrend,
                        activeTechnicians: activeTechnicians.count || 0,
                        activeTechniciansTrend: activeTechniciansTrend
                    };

                // --- Parts Inventory Stats ---
                case 'partsInventoryStats':
                    await checkPermission(userPermissions, 'permPartsModify', userId, 'Attempt to view parts inventory stats without permission');
                    const totalUniqueParts = await getQuery(db, `SELECT COUNT(*) AS count FROM parts`);
                    const lowStockItems = await getQuery(db, `SELECT COUNT(*) AS count FROM parts WHERE quantity_in_stock <= min_stock_level`);
                    const totalInventoryValue = await getQuery(db, `SELECT SUM(quantity_in_stock * cost_per_unit) AS total FROM parts`);
                    const partsUsedLastMonth = await getQuery(db, `SELECT SUM(used_last_month) AS total FROM parts`);

                    // Trends for parts inventory
                    const totalUniquePartsPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM parts WHERE created_at <= DATE('now', 'start of month', '-1 day')`);
                    const lowStockItemsPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM parts WHERE quantity_in_stock <= min_stock_level AND updated_at <= DATE('now', 'start of month', '-1 day')`);
                    const totalInventoryValuePrevMonth = await getQuery(db, `SELECT SUM(quantity_in_stock * cost_per_unit) AS total FROM parts WHERE updated_at <= DATE('now', 'start of month', '-1 day')`);
                    const partsUsedTwoMonthsAgo = await getQuery(db, `SELECT SUM(used_last_month) AS total FROM parts WHERE strftime('%Y-%m', updated_at) = strftime('%Y-%m', DATE('now', '-2 month'))`);

                    let totalUniquePartsTrend = 'N/A';
                    if (totalUniquePartsPrevMonth.count > 0) {
                        const percentageChange = ((totalUniqueParts.count - totalUniquePartsPrevMonth.count) / totalUniquePartsPrevMonth.count) * 100;
                        totalUniquePartsTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (totalUniqueParts.count > 0) {
                        totalUniquePartsTrend = 'New parts added this month';
                    }

                    let lowStockItemsTrend = 'N/A';
                    if (lowStockItemsPrevMonth.count > 0) {
                        const percentageChange = ((lowStockItems.count - lowStockItemsPrevMonth.count) / lowStockItemsPrevMonth.count) * 100;
                        lowStockItemsTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (lowStockItems.count > 0) {
                        lowStockItemsTrend = 'New low stock items this month';
                    }

                    let totalInventoryValueTrend = 'N/A';
                    if (totalInventoryValuePrevMonth.total > 0) {
                        const percentageChange = ((totalInventoryValue.total - totalInventoryValuePrevMonth.total) / totalInventoryValuePrevMonth.total) * 100;
                        totalInventoryValueTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (totalInventoryValue.total > 0) {
                        totalInventoryValueTrend = 'New cost data this month';
                    }

                    let partsUsedLastMonthTrend = 'N/A';
                    if (partsUsedTwoMonthsAgo.total > 0) {
                        const percentageChange = ((partsUsedLastMonth.total - partsUsedTwoMonthsAgo.total) / partsUsedTwoMonthsAgo.total) * 100;
                        partsUsedLastMonthTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs previous month`;
                    } else if (partsUsedLastMonth.total > 0) {
                        partsUsedLastMonthTrend = 'New parts usage this month';
                    }
                    await logUserAction(userId, 'VIEW_PARTS_INVENTORY_STATS', `Viewed parts inventory statistics`);

                    return {
                        totalUniqueParts: totalUniqueParts.count || 0,
                        totalUniquePartsTrend: totalUniquePartsTrend,
                        lowStockItems: lowStockItems.count || 0,
                        lowStockItemsTrend: lowStockItemsTrend,
                        totalInventoryValue: totalInventoryValue.total || 0,
                        totalInventoryValueTrend: totalInventoryValueTrend,
                        partsUsedLastMonth: partsUsedLastMonth.total || 0,
                        partsUsedLastMonthTrend: partsUsedLastMonthTrend
                    };

                // --- Team Management Stats ---
                case 'teamManagementStats':
                    await checkPermission(userPermissions, 'permTeamModify', userId, 'Attempt to view team management stats without permission');
                    const activeTechs = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND status = 'active'`);
                    // This is a placeholder. Real certification tracking would need more complex logic/data.
                    const certificationsDue = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND certifications LIKE '%Expired%'`); // Example
                    const overdueAssignments = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE technician_id IS NOT NULL AND status = 'pending' AND service_date < CURRENT_DATE`);
                    const avgServicesPerTech = await getQuery(db, `
                        SELECT CAST(COUNT(s.id) AS REAL) / COUNT(DISTINCT t.id) AS avg_services
                        FROM services s
                        JOIN users t ON s.technician_id = t.id
                        WHERE strftime('%Y-%m', s.service_date) = strftime('%Y-%m', 'now') AND t.role = 'technician'
                    `);

                    // Trends for team management
                    const activeTechsPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND status = 'active' AND created_at <= DATE('now', 'start of month', '-1 day')`);
                    const certificationsDuePrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND certifications LIKE '%Expired%' AND updated_at <= DATE('now', 'start of month', '-1 day')`);
                    const overdueAssignmentsPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE technician_id IS NOT NULL AND status = 'pending' AND service_date < DATE('now', 'start of month') AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);
                    const avgServicesPerTechPrevMonth = await getQuery(db, `
                        SELECT CAST(COUNT(s.id) AS REAL) / COUNT(DISTINCT t.id) AS avg_services
                        FROM services s
                        JOIN users t ON s.technician_id = t.id
                        WHERE strftime('%Y-%m', s.service_date) = strftime('%Y-%m', DATE('now', '-1 month')) AND t.role = 'technician'
                    `);

                    let teamActiveTechniciansTrend = 'N/A'; // Renamed to avoid conflict
                    if (activeTechsPrevMonth.count > 0) {
                        const percentageChange = ((activeTechs.count - activeTechsPrevMonth.count) / activeTechsPrevMonth.count) * 100;
                        teamActiveTechniciansTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (activeTechs.count > 0) {
                        teamActiveTechniciansTrend = 'New active technicians this month';
                    }

                    let certificationsDueTrend = 'N/A';
                    if (certificationsDuePrevMonth.count > 0) {
                        const percentageChange = ((certificationsDue.count - certificationsDuePrevMonth.count) / certificationsDuePrevMonth.count) * 100;
                        certificationsDueTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (certificationsDue.count > 0) {
                        certificationsDueTrend = 'New certifications due this month';
                    }

                    let overdueAssignmentsTrend = 'N/A';
                    if (overdueAssignmentsPrevMonth.count > 0) {
                        const percentageChange = ((overdueAssignments.count - overdueAssignmentsPrevMonth.count) / overdueAssignmentsPrevMonth.count) * 100;
                        overdueAssignmentsTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (overdueAssignments.count > 0) {
                        overdueAssignmentsTrend = 'New overdue assignments this month';
                    }

                    let avgServicesPerTechTrend = 'N/A';
                    if (avgServicesPerTechPrevMonth.avg_services > 0) {
                        const percentageChange = ((avgServicesPerTech.avg_services - avgServicesPerTechPrevMonth.avg_services) / avgServicesPerTechPrevMonth.avg_services) * 100;
                        avgServicesPerTechTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs previous month`;
                    } else if (avgServicesPerTech.avg_services > 0) {
                        avgServicesPerTechTrend = 'New average services per tech this month';
                    }
                    await logUserAction(userId, 'VIEW_TEAM_MANAGEMENT_STATS', `Viewed team management statistics`);

                    return {
                        activeTechnicians: activeTechs.count || 0,
                        activeTechniciansTrend: teamActiveTechniciansTrend,
                        certificationsDue: certificationsDue.count || 0,
                        certificationsDueTrend: certificationsDueTrend,
                        overdueAssignments: overdueAssignments.count || 0,
                        overdueAssignmentsTrend: overdueAssignmentsTrend,
                        avgServicesPerTech: avgServicesPerTech.avg_services ? avgServicesPerTech.avg_services.toFixed(1) : 'N/A',
                        avgServicesPerTechTrend: avgServicesPerTechTrend
                    };

                // --- Admin Panel Stats ---
                case 'adminPanelStats':
                    await checkPermission(userPermissions, 'permAdmin', userId, 'Attempt to view admin panel stats without permission');
                    const totalUsers = await getQuery(db, `SELECT COUNT(*) AS count FROM users`);
                    const adminUsers = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'admin'`);
                    const technicianUsers = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician'`);
                    const clientUsers = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'client'`);

                    // Calculate trends (example: users added this month)
                    const firstDayOfCurrentMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
                    const firstDayOfLastMonth = new Date(currentYear, currentMonth - 2, 1).toISOString().split('T')[0];

                    // Corrected trend calculation: compare total counts at the end of current vs. last month
                    const totalUsersLastMonthEnd = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE created_at <= DATE('now', 'start of month', '-1 day')`);
                    const adminUsersLastMonthEnd = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND created_at <= DATE('now', 'start of month', '-1 day')`);
                    const techUsersLastMonthEnd = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'technician' AND created_at <= DATE('now', 'start of month', '-1 day')`);
                    const clientUsersLastMonthEnd = await getQuery(db, `SELECT COUNT(*) AS count FROM users WHERE role = 'client' AND created_at <= DATE('now', 'start of month', '-1 day')`);


                    let totalUsersTrend = 'N/A';
                    if (totalUsersLastMonthEnd.count > 0) {
                        const percentageChange = ((totalUsers.count - totalUsersLastMonthEnd.count) / totalUsersLastMonthEnd.count) * 100;
                        totalUsersTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (totalUsers.count > 0) {
                        totalUsersTrend = 'New users this month';
                    }

                    let adminUsersTrend = 'N/A';
                    if (adminUsersLastMonthEnd.count > 0) {
                        const percentageChange = ((adminUsers.count - adminUsersLastMonthEnd.count) / adminUsersLastMonthEnd.count) * 100;
                        adminUsersTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (adminUsers.count > 0) {
                        adminUsersTrend = 'New admins this month';
                    }

                    let techUsersTrend = 'N/A';
                    if (techUsersLastMonthEnd.count > 0) {
                        const percentageChange = ((technicianUsers.count - techUsersLastMonthEnd.count) / techUsersLastMonthEnd.count) * 100;
                        techUsersTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (technicianUsers.count > 0) {
                        techUsersTrend = 'New technicians this month';
                    }

                    let clientUsersTrend = 'N/A';
                    if (clientUsersLastMonthEnd.count > 0) {
                        const percentageChange = ((clientUsers.count - clientUsersLastMonthEnd.count) / clientUsersLastMonthEnd.count) * 100;
                        clientUsersTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (clientUsers.count > 0) {
                        clientUsersTrend = 'New clients this month';
                    }
                    await logUserAction(userId, 'VIEW_ADMIN_PANEL_STATS', `Viewed admin panel statistics`);

                    return {
                        totalUsers: totalUsers.count || 0,
                        totalUsersTrend: totalUsersTrend,
                        adminUsers: adminUsers.count || 0,
                        adminUsersTrend: adminUsersTrend,
                        technicianUsers: technicianUsers.count || 0,
                        technicianUsersTrend: techUsersTrend,
                        clientUsers: clientUsers.count || 0,
                        clientUsersTrend: clientUsersTrend
                    };

                // --- Registry Stats ---
                case 'registryStats':
                    await checkPermission(userPermissions, 'permRegistryModify', userId, 'Attempt to view registry stats without permission');
                    const totalGenerators = await getQuery(db, `SELECT COUNT(*) AS count FROM generators`);
                    const activeGenerators = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE status = 'Active'`);
                    const generatorsDueForService = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE next_service <= CURRENT_DATE`);
                    const generatorsUnderWarranty = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE warranty_end >= CURRENT_DATE`);

                    // Trends for registry
                    const totalGeneratorsPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE created_at <= DATE('now', 'start of month', '-1 day')`);
                    const activeGeneratorsPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE status = 'Active' AND created_at <= DATE('now', 'start of month', '-1 day')`);
                    const generatorsDueForServicePrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE next_service <= DATE('now', 'start of month')`);
                    const generatorsUnderWarrantyPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM generators WHERE warranty_end >= DATE('now', 'start of month')`);

                    let totalGeneratorsTrend = 'N/A';
                    if (totalGeneratorsPrevMonth.count > 0) {
                        const percentageChange = ((totalGenerators.count - totalGeneratorsPrevMonth.count) / totalGeneratorsPrevMonth.count) * 100;
                        totalGeneratorsTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (totalGenerators.count > 0) {
                        totalGeneratorsTrend = 'New generators added this month';
                    }

                    let activeGeneratorsTrend = 'N/A';
                    if (activeGeneratorsPrevMonth.count > 0) {
                        const percentageChange = ((activeGenerators.count - activeGeneratorsPrevMonth.count) / activeGeneratorsPrevMonth.count) * 100;
                        activeGeneratorsTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (activeGenerators.count > 0) {
                        activeGeneratorsTrend = 'New active generators this month';
                    }

                    let generatorsDueForServiceTrend = 'N/A';
                    if (generatorsDueForServicePrevMonth.count > 0) {
                        const percentageChange = ((generatorsDueForService.count - generatorsDueForServicePrevMonth.count) / generatorsDueForServicePrevMonth.count) * 100;
                        generatorsDueForServiceTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (generatorsDueForService.count > 0) {
                        generatorsDueForServiceTrend = 'New generators due for service this month';
                    }

                    let generatorsUnderWarrantyTrend = 'N/A';
                    if (generatorsUnderWarrantyPrevMonth.count > 0) {
                        const percentageChange = ((generatorsUnderWarranty.count - generatorsUnderWarrantyPrevMonth.count) / generatorsUnderWarrantyPrevMonth.count) * 100;
                        generatorsUnderWarrantyTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (generatorsUnderWarranty.count > 0) {
                        generatorsUnderWarrantyTrend = 'New generators under warranty this month';
                    }
                    await logUserAction(userId, 'VIEW_REGISTRY_STATS', `Viewed registry statistics`);

                    return {
                        totalGenerators: totalGenerators.count || 0,
                        totalGeneratorsTrend: totalGeneratorsTrend,
                        activeGenerators: activeGenerators.count || 0,
                        activeGeneratorsTrend: activeGeneratorsTrend,
                        generatorsDueForService: generatorsDueForService.count || 0,
                        generatorsDueForServiceTrend: generatorsDueForServiceTrend,
                        generatorsUnderWarranty: generatorsUnderWarranty.count || 0,
                        generatorsUnderWarrantyTrend: generatorsUnderWarrantyTrend
                    };

                // --- Schedule Stats ---
                case 'scheduleStats':
                    await checkPermission(userPermissions, 'permScheduleModify', userId, 'Attempt to view schedule stats without permission');
                    const upcomingServices = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE service_date >= CURRENT_DATE AND status IN ('pending', 'scheduled')`);
                    const pendingServicesSchedule = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending'`);
                    const overdueServicesSchedule = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND service_date < CURRENT_DATE`);
                    const servicesCompletedThisMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'completed' AND strftime('%Y-%m', service_date) = strftime('%Y-%m', 'now')`);

                    // Trends for schedule
                    const upcomingServicesPrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE service_date >= DATE('now', 'start of month', '-1 month') AND service_date < DATE('now', 'start of month') AND status IN ('pending', 'scheduled')`);
                    const pendingServicesSchedulePrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);
                    const overdueServicesSchedulePrevMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'pending' AND service_date < DATE('now', 'start of month') AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);
                    const servicesCompletedLastMonth = await getQuery(db, `SELECT COUNT(*) AS count FROM services WHERE status = 'completed' AND strftime('%Y-%m', service_date) = strftime('%Y-%m', DATE('now', '-1 month'))`);

                    let upcomingServicesTrend = 'N/A';
                    if (upcomingServicesPrevMonth.count > 0) {
                        const percentageChange = ((upcomingServices.count - upcomingServicesPrevMonth.count) / upcomingServicesPrevMonth.count) * 100;
                        upcomingServicesTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (upcomingServices.count > 0) {
                        upcomingServicesTrend = 'New upcoming services this month';
                    }

                    let pendingServicesScheduleTrend = 'N/A';
                    if (pendingServicesSchedulePrevMonth.count > 0) {
                        const percentageChange = ((pendingServicesSchedule.count - pendingServicesSchedulePrevMonth.count) / pendingServicesSchedulePrevMonth.count) * 100;
                        pendingServicesScheduleTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (pendingServicesSchedule.count > 0) {
                        pendingServicesScheduleTrend = 'New pending services this month';
                    }

                    let overdueServicesScheduleTrend = 'N/A';
                    if (overdueServicesSchedulePrevMonth.count > 0) {
                        const percentageChange = ((overdueServicesSchedule.count - overdueServicesSchedulePrevMonth.count) / overdueServicesSchedulePrevMonth.count) * 100;
                        overdueServicesScheduleTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (overdueServicesSchedule.count > 0) {
                        overdueServicesScheduleTrend = 'New overdue services this month';
                    }

                    let servicesCompletedThisMonthTrend = 'N/A';
                    if (servicesCompletedLastMonth.count > 0) {
                        const percentageChange = ((servicesCompletedThisMonth.count - servicesCompletedLastMonth.count) / servicesCompletedLastMonth.count) * 100;
                        servicesCompletedThisMonthTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last month`;
                    } else if (servicesCompletedThisMonth.count > 0) {
                        servicesCompletedThisMonthTrend = 'New completed services this month';
                    }
                    await logUserAction(userId, 'VIEW_SCHEDULE_STATS', `Viewed schedule statistics`);

                    return {
                        upcomingServices: upcomingServices.count || 0,
                        upcomingServicesTrend: upcomingServicesTrend,
                        pendingServicesSchedule: pendingServicesSchedule.count || 0,
                        pendingServicesScheduleTrend: pendingServicesScheduleTrend,
                        overdueServicesSchedule: overdueServicesSchedule.count || 0,
                        overdueServicesScheduleTrend: overdueServicesScheduleTrend,
                        servicesCompletedThisMonth: servicesCompletedThisMonth.count || 0,
                        servicesCompletedThisMonthTrend: servicesCompletedThisMonthTrend
                    };

                // --- Reports Stats (Aggregated) ---
                case 'reportsStats':
                    await checkPermission(userPermissions, 'permReports', userId, 'Attempt to view reports stats without permission');
                    const totalRevenue = await getQuery(db, `SELECT SUM(service_cost) AS total FROM services WHERE status = 'completed'`);
                    const mostUsedPart = await getQuery(db, `
                        SELECT p.name, SUM(json_extract(value, '$.quantity')) AS total_quantity_used
                        FROM services, json_each(parts_used)
                        JOIN parts p ON json_extract(value, '$.part_id') = p.id
                        GROUP BY p.name
                        ORDER BY total_quantity_used DESC
                        LIMIT 1
                    `);
                    const topPerformingTechnician = await getQuery(db, `
                        SELECT u.name, COUNT(s.id) AS completed_services_count
                        FROM services s
                        JOIN users u ON s.technician_id = u.id
                        WHERE s.status = 'completed'
                        GROUP BY u.name
                        ORDER BY completed_services_count DESC
                        LIMIT 1
                    `);
                    const serviceCompletionRate = await getQuery(db, `
                        SELECT CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS REAL) * 100 / COUNT(*) AS rate
                        FROM services
                    `);

                    // Trends for reports (simplified for example)
                    const totalRevenuePrevYear = await getQuery(db, `SELECT SUM(service_cost) AS total FROM services WHERE status = 'completed' AND strftime('%Y', service_date) = ?`, [(currentYear - 1).toString()]);
                    const serviceCompletionRatePrevYear = await getQuery(db, `
                        SELECT CAST(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS REAL) * 100 / COUNT(*) AS rate
                        FROM services
                        WHERE strftime('%Y', service_date) = ?
                    `, [(currentYear - 1).toString()]);

                    let totalRevenueTrend = 'N/A';
                    if (totalRevenuePrevYear.total > 0) {
                        const percentageChange = ((totalRevenue.total - totalRevenuePrevYear.total) / totalRevenuePrevYear.total) * 100;
                        totalRevenueTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(0)}% vs last year`;
                    } else if (totalRevenue.total > 0) {
                        totalRevenueTrend = 'New revenue data this year';
                    }

                    let serviceCompletionRateTrend = 'N/A';
                    if (serviceCompletionRatePrevYear.rate > 0) {
                        const percentageChange = (serviceCompletionRate.rate - serviceCompletionRatePrevYear.rate); // Absolute change for rates
                        serviceCompletionRateTrend = `${percentageChange >= 0 ? '↑' : '↓'} ${Math.abs(percentageChange).toFixed(1)}% points vs last year`;
                    } else if (serviceCompletionRate.rate > 0) {
                        serviceCompletionRateTrend = 'New completion rate data this year';
                    }
                    await logUserAction(userId, 'VIEW_REPORTS_STATS', `Viewed reports statistics`);

                    return {
                        totalRevenue: totalRevenue.total || 0,
                        totalRevenueTrend: totalRevenueTrend,
                        mostUsedPart: mostUsedPart ? `${mostUsedPart.name} (${mostUsedPart.total_quantity_used})` : 'N/A',
                        topPerformingTechnician: topPerformingTechnician ? `${topPerformingTechnician.name} (${topPerformingTechnician.completed_services_count})` : 'N/A',
                        serviceCompletionRate: serviceCompletionRate.rate ? serviceCompletionRate.rate.toFixed(1) : 'N/A',
                        serviceCompletionRateTrend: serviceCompletionRateTrend
                    };

                case 'serviceCostByTypeChartData':
                    await checkPermission(userPermissions, 'permReports', userId, 'Attempt to view service cost by type chart data without permission');
                    const serviceCostByType = await allQuery(db, `
                        SELECT service_type, SUM(service_cost) AS total_cost
                        FROM services
                        WHERE status = 'completed'
                        GROUP BY service_type
                        ORDER BY total_cost DESC
                    `);
                    await logUserAction(userId, 'VIEW_SERVICE_COST_BY_TYPE_CHART', `Viewed service cost by type chart data`);
                    return {
                        labels: serviceCostByType.map(row => row.service_type),
                        datasets: [{
                            label: 'Total Cost (Ksh)',
                            data: serviceCostByType.map(row => row.total_cost),
                            backgroundColor: [
                                '#3498db', '#2ecc71', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'
                            ],
                            borderColor: [
                                '#2980b9', '#27ae60', '#e67e22', '#c0392b', '#8e44ad', '#16a085'
                            ],
                            borderWidth: 1
                        }]
                    };

                case 'generatorStatusChartData':
                    await checkPermission(userPermissions, 'permReports', userId, 'Attempt to view generator status chart data without permission');
                    const generatorStatusCounts = await allQuery(db, `
                        SELECT status, COUNT(*) AS count
                        FROM generators
                        GROUP BY status
                    `);
                    await logUserAction(userId, 'VIEW_GENERATOR_STATUS_CHART', `Viewed generator status chart data`);
                    return {
                        labels: generatorStatusCounts.map(row => row.status),
                        datasets: [{
                            label: 'Number of Generators',
                            data: generatorStatusCounts.map(row => row.count),
                            backgroundColor: [
                                '#2ecc71', '#e74c3c', '#f39c12', '#95a5a6'
                            ],
                            borderColor: [
                                '#27ae60', '#c0392b', '#e67e22', '#7f8c8d'
                            ],
                            borderWidth: 1
                        }]
                    };

                case 'partsStockChartData':
                    await checkPermission(userPermissions, 'permReports', userId, 'Attempt to view parts stock chart data without permission');
                    const partsStockLevels = await allQuery(db, `
                        SELECT name, quantity_in_stock, min_stock_level
                        FROM parts
                        ORDER BY quantity_in_stock ASC
                    `);
                    await logUserAction(userId, 'VIEW_PARTS_STOCK_CHART', `Viewed parts stock chart data`);
                    return {
                        labels: partsStockLevels.map(row => row.name),
                        datasets: [
                            {
                                label: 'Quantity In Stock',
                                data: partsStockLevels.map(row => row.quantity_in_stock),
                                backgroundColor: '#3498db',
                                borderColor: '#2980b9',
                                borderWidth: 1
                            },
                            {
                                label: 'Minimum Stock Level',
                                data: partsStockLevels.map(row => row.min_stock_level),
                                backgroundColor: '#e74c3c',
                                borderColor: '#c0392b',
                                borderWidth: 1
                            }
                        ]
                    };

                case 'userRoleDistributionChartData': // New endpoint for user role distribution chart
                    await checkPermission(userPermissions, 'permAdmin', userId, 'Attempt to view user role distribution chart data without admin permission');
                    const userRoleCounts = await allQuery(db, `
                        SELECT role, COUNT(*) AS count
                        FROM users
                        GROUP BY role
                    `);
                    await logUserAction(userId, 'VIEW_USER_ROLE_DISTRIBUTION_CHART', `Viewed user role distribution chart data`);
                    return {
                        labels: userRoleCounts.map(row => row.role),
                        datasets: [{
                            label: 'Number of Users',
                            data: userRoleCounts.map(row => row.count),
                            backgroundColor: [
                                '#3498db', // Admin (blue)
                                '#2ecc71', // Technician (green)
                                '#f39c12'  // Client (orange)
                            ],
                            borderColor: [
                                '#2980b9',
                                '#27ae60',
                                '#e67e22'
                            ],
                            borderWidth: 1
                        }]
                    };

                default:
                    await logUserAction(userId, 'API_GET_UNKNOWN', `Unknown endpoint: ${endpoint}`);
                    throw new Error(`Unknown endpoint: ${endpoint}`);
            }
        } catch (error) {
            console.error(`Error in apiService.get(${endpoint}, ${id}):`, error.message);
            throw error;
        }
    },

    // Generic POST endpoint
    async post(endpoint, data, userRole = null, userPermissions = {}, userId = null) {
        const db = getDb();
        let sql;
        let params;
        const newId = `${endpoint.slice(0, -1)}-${uuidv4()}`; // e.g., user-uuid, generator-uuid

        try {
            switch (endpoint) {
                case 'users':
                    await checkPermission(userPermissions, 'permAdmin', userId, 'Attempt to create user without permission'); // Only admins can add users
                    if (!data.name || !data.email || !data.password || !data.role) {
                        throw new Error('Missing required user fields.');
                    }
                    const password_hash = await bcrypt.hash(data.password, 10);
                    const permissions = JSON.stringify(data.permissions || {}); // Store permissions as JSON
                    sql = `INSERT INTO users (id, name, email, password_hash, role, status, last_login, first_login, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
                    params = [newId, data.name, data.email, password_hash, data.role || 'client', data.status || 'active', false, permissions];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'CREATE_USER', `Created new user: ${data.email} with role ${data.role}`);
                    return { id: newId, ...data, password_hash: undefined, permissions: JSON.parse(permissions) };
                case 'generators':
                    await checkPermission(userPermissions, 'permRegistryModify', userId, 'Attempt to create generator without permission'); // Only authorized users can add generators
                    if (!data.model || !data.type || !data.serial || !data.location) {
                        throw new Error('Missing required generator fields.');
                    }
                    sql = `INSERT INTO generators (id, model, type, serial_number, location, purchase_date, warranty_end, supplier, cost, total_hours_run, last_service, next_service, status, client_id, assigned_tech_id, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
                    params = [newId, data.model, data.type, data.serial, data.location, data.purchaseDate, data.warrantyEnd, data.supplier, data.cost, data.totalHoursRun, data.lastService, data.nextService, data.status, data.clientId, data.assignedTech, data.notes];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'CREATE_GENERATOR', `Created new generator: ${data.model} (${data.serial})`);
                    return { id: newId, ...data };
                case 'services':
                    await checkPermission(userPermissions, 'permScheduleModify', userId, 'Attempt to create service without permission'); // Only authorized users can add services
                    if (!data.generator_id || !data.service_date || !data.service_type || !data.technician_id || !data.status) {
                        throw new Error('Missing required service fields.');
                    }
                    sql = `INSERT INTO services (id, generator_id, service_date, service_type, technician_id, status, duration, service_cost, work_order, notes, parts_used, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
                    params = [newId, data.generator_id, data.service_date, data.service_type, data.technician_id, data.status, data.duration, data.service_cost, data.work_order, data.notes, data.parts_used];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'CREATE_SERVICE', `Created new service for generator ${data.generator_id} (${data.service_type})`);
                    return { id: newId, ...data };
                case 'parts':
                    await checkPermission(userPermissions, 'permPartsModify', userId, 'Attempt to create part without permission'); // Only authorized users can add parts
                    if (!data.name || !data.part_number || data.quantity_in_stock === undefined || data.cost_per_unit === undefined) {
                        throw new Error('Missing required part fields.');
                    }
                    sql = `INSERT INTO parts (id, name, part_number, quantity_in_stock, cost_per_unit, category, min_stock_level, preferred_supplier, last_ordered, used_last_month, compatible_generators, location, reorder_point, lead_time, notes, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
                    params = [newId, data.name, data.part_number, data.quantity_in_stock, data.cost_per_unit, data.category, data.min_stock_level, data.preferred_supplier, data.last_ordered, data.used_last_month, data.compatible_generators, data.location, data.reorder_point, data.lead_time, data.notes, data.status];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'CREATE_PART', `Created new part: ${data.name} (${data.part_number})`);
                    return { id: newId, ...data };
                case 'technicians':
                    await checkPermission(userPermissions, 'permTeamModify', userId, 'Attempt to create technician without permission'); // Only authorized users can add technicians
                    if (!data.name || !data.email || !data.password) {
                        throw new Error('Missing required technician fields.');
                    }
                    const techPasswordHash = await bcrypt.hash(data.password || 'defaultpass', 10);
                    const techPermissions = JSON.stringify(data.permissions || {});
                    sql = `INSERT INTO users (id, name, email, password_hash, role, status, phone, employee_id, hire_date, team, certifications, specialties, notes, first_login, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
                    params = [newId, data.name, data.email, techPasswordHash, 'technician', data.status || 'active', data.phone, data.employee_id, data.hire_date, data.team, data.certifications, data.specialties, data.notes, false, techPermissions];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'CREATE_TECHNICIAN', `Created new technician: ${data.name} (${data.email})`);
                    return { id: newId, ...data, password_hash: undefined, permissions: JSON.parse(techPermissions) };
                default:
                    await logUserAction(userId, 'API_POST_UNKNOWN', `Unknown endpoint for POST: ${endpoint}`);
                    throw new Error(`Unknown endpoint for POST: ${endpoint}`);
            }
        } catch (error) {
            console.error(`Error in apiService.post(${endpoint}):`, error.message);
            throw error;
        }
    },

    // Generic PUT endpoint
    async put(endpoint, id, data, userRole = null, userPermissions = {}, userId = null) {
        const db = getDb();
        let sql;
        let params;

        try {
            switch (endpoint) {
                case 'users':
                    await checkPermission(userPermissions, 'permAdmin', userId, `Attempt to update user ${id} without permission`); // Only admins can modify users
                    const userFields = [];
                    const userValues = [];
                    for (const key in data) {
                        if (data[key] !== undefined && key !== 'id' && key !== 'password' && key !== 'first_login' && key !== 'permissions') {
                            userFields.push(`${key} = ?`);
                            userValues.push(data[key]);
                        }
                    }
                    if (data.password) { // Handle password change if provided
                        if (data.password.length < 6) { // Example: Password policy
                            throw new Error('Password must be at least 6 characters long.');
                        }
                        const newPasswordHash = await bcrypt.hash(data.password, 10);
                        userFields.push(`password_hash = ?`);
                        userValues.push(newPasswordHash);
                    }
                    if (data.permissions) { // Handle permissions update
                        userFields.push(`permissions = ?`);
                        userValues.push(JSON.stringify(data.permissions));
                    }
                    if (userFields.length === 0) return { id, ...data };

                    sql = `UPDATE users SET ${userFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    params = [...userValues, id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'UPDATE_USER', `Updated user: ${id}`);
                    return { id, ...data };
                case 'generators':
                    await checkPermission(userPermissions, 'permRegistryModify', userId, `Attempt to update generator ${id} without permission`); // Only authorized users can modify generators
                    const genFields = [];
                    const genValues = [];
                    for (const key in data) {
                        if (data[key] !== undefined && key !== 'id') {
                            genFields.push(`${key} = ?`);
                            genValues.push(data[key]);
                        }
                    }
                    if (genFields.length === 0) return { id, ...data };

                    sql = `UPDATE generators SET ${genFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    params = [...genValues, id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'UPDATE_GENERATOR', `Updated generator: ${id}`);
                    return { id, ...data };
                case 'services':
                    await checkPermission(userPermissions, 'permScheduleModify', userId, `Attempt to update service ${id} without permission`); // Only authorized users can modify services
                    const serviceFields = [];
                    const serviceValues = [];
                    for (const key in data) {
                        if (data[key] !== undefined && key !== 'id') {
                            serviceFields.push(`${key} = ?`);
                            serviceValues.push(data[key]);
                        }
                    }
                    if (serviceFields.length === 0) return { id, ...data };

                    sql = `UPDATE services SET ${serviceFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    params = [...serviceValues, id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'UPDATE_SERVICE', `Updated service: ${id}`);
                    return { id, ...data };
                case 'parts':
                    await checkPermission(userPermissions, 'permPartsModify', userId, `Attempt to update part ${id} without permission`); // Only authorized users can modify parts
                    const partFields = [];
                    const partValues = [];
                    for (const key in data) {
                        if (data[key] !== undefined && key !== 'id') {
                            partFields.push(`${key} = ?`);
                            partValues.push(data[key]);
                        }
                    }
                    if (partFields.length === 0) return { id, ...data };

                    sql = `UPDATE parts SET ${partFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
                    params = [...partValues, id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'UPDATE_PART', `Updated part: ${id}`);
                    return { id, ...data };
                case 'technicians':
                    await checkPermission(userPermissions, 'permTeamModify', userId, `Attempt to update technician ${id} without permission`); // Only authorized users can modify technicians
                    const techFields = [];
                    const techValues = [];
                    for (const key in data) {
                        if (data[key] !== undefined && key !== 'id' && key !== 'password') {
                            techFields.push(`${key} = ?`);
                            techValues.push(data[key]);
                        }
                    }
                    if (data.password) { // Handle password change if provided
                        const newPasswordHash = await bcrypt.hash(data.password, 10);
                        techFields.push(`password_hash = ?`);
                        techValues.push(newPasswordHash);
                    }
                    if (techFields.length === 0) return { id, ...data };

                    sql = `UPDATE users SET ${techFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = 'technician'`;
                    params = [...techValues, id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'UPDATE_TECHNICIAN', `Updated technician: ${id}`);
                    return { id: id, ...data };
                default:
                    await logUserAction(userId, 'API_PUT_UNKNOWN', `Unknown endpoint for PUT: ${endpoint}`);
                    throw new Error(`Unknown endpoint for PUT: ${endpoint}`);
            }
        } catch (error) {
            console.error(`Error in apiService.put(${endpoint}, ${id}):`, error.message);
            throw error;
        }
    },

    // Generic DELETE endpoint
    async delete(endpoint, id, userRole = null, userPermissions = {}, userId = null) {
        const db = getDb();
        let sql;
        let params;

        try {
            switch (endpoint) {
                case 'users':
                    await checkPermission(userPermissions, 'permAdmin', userId, `Attempt to delete user ${id} without permission`); // Only admins can delete users
                    sql = `DELETE FROM users WHERE id = ?`;
                    params = [id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'DELETE_USER', `Deleted user: ${id}`);
                    return true;
                case 'generators':
                    await checkPermission(userPermissions, 'permRegistryModify', userId, `Attempt to delete generator ${id} without permission`); // Only authorized users can delete generators
                    sql = `DELETE FROM generators WHERE id = ?`;
                    params = [id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'DELETE_GENERATOR', `Deleted generator: ${id}`);
                    return true;
                case 'services':
                    await checkPermission(userPermissions, 'permScheduleModify', userId, `Attempt to delete service ${id} without permission`); // Only authorized users can delete services
                    sql = `DELETE FROM services WHERE id = ?`;
                    params = [id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'DELETE_SERVICE', `Deleted service: ${id}`);
                    return true;
                case 'parts':
                    await checkPermission(userPermissions, 'permPartsModify', userId, `Attempt to delete part ${id} without permission`); // Only authorized users can delete parts
                    sql = `DELETE FROM parts WHERE id = ?`;
                    params = [id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'DELETE_PART', `Deleted part: ${id}`);
                    return true;
                case 'technicians':
                    await checkPermission(userPermissions, 'permTeamModify', userId, `Attempt to delete technician ${id} without permission`); // Only authorized users can delete technicians
                    sql = `DELETE FROM users WHERE id = ? AND role = 'technician'`;
                    params = [id];
                    await runQuery(db, sql, params);
                    await logUserAction(userId, 'DELETE_TECHNICIAN', `Deleted technician: ${id}`);
                    return true;
                default:
                    await logUserAction(userId, 'API_DELETE_UNKNOWN', `Unknown endpoint for DELETE: ${endpoint}`);
                    throw new Error(`Unknown endpoint for DELETE: ${endpoint}`);
            }
        } catch (error) {
            console.error(`Error in apiService.delete(${endpoint}, ${id}):`, error.message);
            throw error;
        }
    }
};

module.exports = apiService;
