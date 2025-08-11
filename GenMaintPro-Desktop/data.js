// FileName: /data.js
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_ADMIN_CREDENTIALS = {
    id: 'admin-default-uuid',
    email: 'genmaintadmin@email.com',
    password: '@Genmaintadmin123',
    name: 'Default Admin',
    role: 'admin',
    status: 'active',
    first_login: true, // Set to true initially to trigger password change prompt
    permissions: {
        permDashboard: true, permReports: true, permAdmin: true, permClientPortal: true,
        permRegistryModify: true, permPartsModify: true, permScheduleModify: true,
        permRecordsModify: true, permTeamModify: true, permImportData: true, permExportData: true
    }
};

async function generateSampleData() {
    const users = [
        // Note: Default admin is handled by ensureDefaultAdminExists.
        // These are additional sample users.
        {
            id: `user-${uuidv4()}`,
            name: 'Alice Admin',
            email: 'alice.admin@example.com',
            password_hash: await bcrypt.hash('AdminPass123', 10),
            role: 'admin',
            status: 'active',
            last_login: new Date().toISOString(),
            phone: '0700000001',
            address: 'Admin HQ',
            employee_id: null,
            hire_date: null,
            team: null,
            certifications: null,
            specialties: null,
            notes: 'Secondary admin account.',
            first_login: false,
            permissions: JSON.stringify({
                permDashboard: true, permReports: true, permAdmin: true, permClientPortal: true,
                permRegistryModify: true, permPartsModify: true, permScheduleModify: true,
                permRecordsModify: true, permTeamModify: true, permImportData: true, permExportData: true
            }),
            created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: `user-${uuidv4()}`,
            name: 'Bob Technician',
            email: 'bob.tech@example.com',
            password_hash: await bcrypt.hash('TechPass123', 10),
            role: 'technician',
            status: 'active',
            last_login: new Date().toISOString(),
            phone: '0700000002',
            address: 'Workshop 1',
            employee_id: 'EMP-1001',
            hire_date: '2022-01-10',
            team: 'A-Team',
            certifications: 'Electrical Safety, Diesel Engines',
            specialties: 'Diesel Generators',
            notes: 'Senior technician',
            first_login: false,
            permissions: JSON.stringify({
                permDashboard: true, permScheduleModify: true, permRecordsModify: true, permPartsModify: true
            }),
            created_at: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: `user-${uuidv4()}`,
            name: 'Carol Client',
            email: 'carol.client@example.com',
            password_hash: await bcrypt.hash('ClientPass123', 10),
            role: 'client',
            status: 'active',
            last_login: new Date().toISOString(),
            phone: '0700000003',
            address: 'Client Site',
            employee_id: null,
            hire_date: null,
            team: null,
            certifications: null,
            specialties: null,
            notes: 'Main client contact for Warehouse A.',
            first_login: false,
            permissions: JSON.stringify({ permClientPortal: true, permDashboard: true }),
            created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: `user-${uuidv4()}`,
            name: 'David Technician',
            email: 'david.tech@example.com',
            password_hash: await bcrypt.hash('TechPass456', 10),
            role: 'technician',
            status: 'inactive',
            last_login: new Date().toISOString(),
            phone: '0700000004',
            address: 'Workshop 2',
            employee_id: 'EMP-1002',
            hire_date: '2023-05-20',
            team: 'B-Team',
            certifications: 'Gas Engines',
            specialties: 'Gas Generators',
            notes: 'On extended leave',
            first_login: false,
            permissions: JSON.stringify({
                permDashboard: true, permScheduleModify: true, permRecordsModify: true
            }),
            created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: `user-${uuidv4()}`,
            name: 'Eve Client',
            email: 'eve.client@example.com',
            password_hash: await bcrypt.hash('ClientPass456', 10),
            role: 'client',
            status: 'active',
            last_login: new Date().toISOString(),
            phone: '0700000005',
            address: 'Remote Site',
            employee_id: null,
            hire_date: null,
            team: null,
            certifications: null,
            specialties: null,
            notes: 'Client for remote data center.',
            first_login: false,
            permissions: JSON.stringify({ permClientPortal: true, permDashboard: true }),
            created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: `user-${uuidv4()}`,
            name: 'Frank Technician',
            email: 'frank.tech@example.com',
            password_hash: await bcrypt.hash('TechPass789', 10),
            role: 'technician',
            status: 'active',
            last_login: new Date().toISOString(),
            phone: '0700000006',
            address: 'Field Office',
            employee_id: 'EMP-1003',
            hire_date: '2024-01-01',
            team: 'C-Team',
            certifications: 'HVAC, Generator Diagnostics',
            specialties: 'Preventive Maintenance',
            notes: 'New hire, eager to learn.',
            first_login: false,
            permissions: JSON.stringify({
                permDashboard: true, permScheduleModify: true, permRecordsModify: true, permPartsModify: true
            }),
            created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];

    const generators = [
        {
            id: `generator-${uuidv4()}`,
            model: 'GenPro X100',
            type: 'Diesel',
            serial_number: 'SN-GPX100-001',
            location: 'Warehouse A',
            purchase_date: '2022-01-15',
            warranty_end: '2025-01-15',
            supplier: 'Global Power Inc.',
            cost: 1500000,
            total_hours_run: 1250,
            last_service: '2024-03-10',
            next_service: '2024-09-10',
            status: 'Active',
            client_id: users[2].id, // Carol Client
            assigned_tech_id: users[1].id, // Bob Technician
            notes: 'Primary backup for critical systems.',
            created_at: '2022-01-15T10:00:00Z'
        },
        {
            id: `generator-${uuidv4()}`,
            model: 'EcoGen 500',
            type: 'Gas',
            serial_number: 'SN-ECO500-002',
            location: 'Building B',
            purchase_date: '2023-03-12',
            warranty_end: '2026-03-12',
            supplier: 'EcoGen Ltd.',
            cost: 900000,
            total_hours_run: 300,
            last_service: '2024-04-01',
            next_service: '2024-10-01',
            status: 'Active',
            client_id: users[2].id, // Carol Client
            assigned_tech_id: users[3].id, // David Technician
            notes: 'Used for secondary loads.',
            created_at: '2023-03-12T09:00:00Z'
        },
        {
            id: `generator-${uuidv4()}`,
            model: 'PowerMax 2000',
            type: 'Diesel',
            serial_number: 'SN-PM2000-003',
            location: 'Remote Data Center',
            purchase_date: '2023-06-01',
            warranty_end: '2026-06-01',
            supplier: 'Power Solutions Co.',
            cost: 2000000,
            total_hours_run: 800,
            last_service: '2024-02-20',
            next_service: '2024-08-20',
            status: 'Maintenance',
            client_id: users[4].id, // Eve Client
            assigned_tech_id: users[1].id, // Bob Technician
            notes: 'Requires major overhaul.',
            created_at: '2023-06-01T11:00:00Z'
        },
        {
            id: `generator-${uuidv4()}`,
            model: 'SilentGen 150',
            type: 'Hybrid',
            serial_number: 'SN-SG150-004',
            location: 'Hospital Wing C',
            purchase_date: '2024-01-05',
            warranty_end: '2027-01-05',
            supplier: 'Quiet Power Systems',
            cost: 1800000,
            total_hours_run: 50,
            last_service: null,
            next_service: '2024-07-05',
            status: 'Active',
            client_id: users[4].id, // Eve Client
            assigned_tech_id: users[5].id, // Frank Technician
            notes: 'Brand new installation.',
            created_at: '2024-01-05T14:00:00Z'
        },
        {
            id: `generator-${uuidv4()}`,
            model: 'CompactGen 50',
            type: 'Portable',
            serial_number: 'SN-CG50-005',
            location: 'Construction Site X',
            purchase_date: '2023-11-01',
            warranty_end: '2025-11-01',
            supplier: 'Portable Power Co.',
            cost: 350000,
            total_hours_run: 150,
            last_service: '2024-01-20',
            next_service: '2024-07-20',
            status: 'Active',
            client_id: users[2].id, // Carol Client
            assigned_tech_id: users[1].id, // Bob Technician
            notes: 'Used for temporary power needs.',
            created_at: '2023-11-01T10:00:00Z'
        },
        {
            id: `generator-${uuidv4()}`,
            model: 'MegaWatt 5000',
            type: 'Diesel',
            serial_number: 'SN-MW5000-006',
            location: 'Industrial Complex Z',
            purchase_date: '2021-08-01',
            warranty_end: '2024-08-01',
            supplier: 'Heavy Duty Gens',
            cost: 5000000,
            total_hours_run: 5000,
            last_service: '2024-01-05',
            next_service: '2024-07-05',
            status: 'Active',
            client_id: users[4].id, // Eve Client
            assigned_tech_id: users[5].id, // Frank Technician
            notes: 'High capacity generator, critical for factory operations.',
            created_at: '2021-08-01T08:00:00Z'
        }
    ];

    const parts = [
        {
            id: `part-${uuidv4()}`,
            name: 'Oil Filter (Diesel)',
            part_number: 'OF-D-123',
            quantity_in_stock: 5,
            cost_per_unit: 1500,
            category: 'Filters',
            min_stock_level: 10,
            preferred_supplier: 'FilterCo',
            last_ordered: '2024-04-01',
            used_last_month: 15,
            compatible_generators: 'GenPro X100, PowerMax 2000, MegaWatt 5000',
            location: 'Warehouse Shelf A3',
            reorder_point: 15,
            lead_time: 5,
            notes: 'Standard oil filter for diesel units.',
            status: 'Low Stock',
            created_at: '2023-01-01T08:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Spark Plug (Gas)',
            part_number: 'SP-G-456',
            quantity_in_stock: 30,
            cost_per_unit: 800,
            category: 'Ignition',
            min_stock_level: 20,
            preferred_supplier: 'SparkWorks',
            last_ordered: '2024-03-15',
            used_last_month: 5,
            compatible_generators: 'EcoGen 500',
            location: 'Warehouse Shelf B1',
            reorder_point: 20,
            lead_time: 7,
            notes: 'For gas generators.',
            status: 'In Stock',
            created_at: '2023-02-01T08:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Air Filter (Large)',
            part_number: 'AF-L-789',
            quantity_in_stock: 2,
            cost_per_unit: 3500,
            category: 'Filters',
            min_stock_level: 5,
            preferred_supplier: 'AirFlow Inc.',
            last_ordered: '2024-01-20',
            used_last_month: 3,
            compatible_generators: 'PowerMax 2000, MegaWatt 5000',
            location: 'Warehouse Shelf A5',
            reorder_point: 5,
            lead_time: 10,
            notes: 'Critical part for large diesel units.',
            status: 'Low Stock',
            created_at: '2023-03-10T10:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Coolant (5L)',
            part_number: 'CL-5L-001',
            quantity_in_stock: 15,
            cost_per_unit: 1200,
            category: 'Fluids',
            min_stock_level: 10,
            preferred_supplier: 'CoolantPro',
            last_ordered: '2024-02-10',
            used_last_month: 8,
            compatible_generators: 'All Diesel, Hybrid',
            location: 'Warehouse Fluid Storage',
            reorder_point: 10,
            lead_time: 3,
            notes: 'Universal coolant.',
            status: 'In Stock',
            created_at: '2023-04-05T11:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Battery (12V)',
            part_number: 'BAT-12V-001',
            quantity_in_stock: 0,
            cost_per_unit: 8000,
            category: 'Electrical',
            min_stock_level: 3,
            preferred_supplier: 'VoltSupply',
            last_ordered: '2024-03-01',
            used_last_month: 2,
            compatible_generators: 'All Models',
            location: 'Warehouse Electrical',
            reorder_point: 5,
            lead_time: 14,
            notes: 'Standard starter battery.',
            status: 'Out of Stock',
            created_at: '2023-05-20T13:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Fuel Filter',
            part_number: 'FF-GEN-001',
            quantity_in_stock: 25,
            cost_per_unit: 950,
            category: 'Filters',
            min_stock_level: 10,
            preferred_supplier: 'FuelFlow',
            last_ordered: '2024-04-10',
            used_last_month: 7,
            compatible_generators: 'All Diesel',
            location: 'Warehouse Shelf A4',
            reorder_point: 12,
            lead_time: 4,
            notes: 'Common fuel filter.',
            status: 'In Stock',
            created_at: '2023-06-15T09:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Alternator Belt',
            part_number: 'AB-UNI-001',
            quantity_in_stock: 8,
            cost_per_unit: 2500,
            category: 'Belts',
            min_stock_level: 5,
            preferred_supplier: 'BeltPro',
            last_ordered: '2024-03-20',
            used_last_month: 4,
            compatible_generators: 'Most Models',
            location: 'Warehouse Shelf C2',
            reorder_point: 6,
            lead_time: 7,
            notes: 'Standard alternator belt.',
            status: 'In Stock',
            created_at: '2023-07-01T14:00:00Z'
        },
        {
            id: `part-${uuidv4()}`,
            name: 'Engine Oil (20L)',
            part_number: 'EO-20L-001',
            quantity_in_stock: 10,
            cost_per_unit: 10000,
            category: 'Fluids',
            min_stock_level: 5,
            preferred_supplier: 'LubriMax',
            last_ordered: '2024-04-25',
            used_last_month: 3,
            compatible_generators: 'All Diesel',
            location: 'Warehouse Fluid Storage',
            reorder_point: 7,
            lead_time: 5,
            notes: 'High-grade engine oil.',
            status: 'In Stock',
            created_at: '2023-08-01T09:00:00Z'
        }
    ];

    const services = [
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[0].id, // GenPro X100
            service_date: '2024-03-10',
            service_type: 'Scheduled Maintenance',
            technician_id: users[1].id, // Bob Technician
            status: 'completed',
            duration: 2.5,
            service_cost: 5000,
            work_order: 'WO-001',
            notes: 'Routine check and oil change. Replaced oil filter.',
            parts_used: JSON.stringify([{ part_id: parts[0].id, quantity: 1 }]),
            created_at: '2024-03-10T09:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[1].id, // EcoGen 500
            service_date: '2024-04-01',
            service_type: 'Repair',
            technician_id: users[3].id, // David Technician
            status: 'pending',
            duration: 1.5,
            service_cost: 3000,
            work_order: 'WO-002',
            notes: 'Spark plug replacement needed. Waiting for parts.',
            parts_used: JSON.stringify([{ part_id: parts[1].id, quantity: 2 }]),
            created_at: '2024-04-01T10:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[0].id, // GenPro X100
            service_date: '2023-10-15',
            service_type: 'Emergency Repair',
            technician_id: users[1].id, // Bob Technician
            status: 'completed',
            duration: 4.0,
            service_cost: 12000,
            work_order: 'WO-003',
            notes: 'Fuel pump replacement. Generator was down for 2 days.',
            parts_used: JSON.stringify([{ part_id: `part-${uuidv4()}`, quantity: 1, name: 'Fuel Pump' }]), // Example of a part not in main list
            created_at: '2023-10-14T15:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[2].id, // PowerMax 2000
            service_date: '2024-05-01',
            service_type: 'Major Overhaul',
            technician_id: users[1].id, // Bob Technician
            status: 'scheduled',
            duration: 8.0,
            service_cost: 25000,
            work_order: 'WO-004',
            notes: 'Full engine inspection and component replacement.',
            parts_used: JSON.stringify([{ part_id: parts[2].id, quantity: 1 }, { part_id: parts[0].id, quantity: 1 }]),
            created_at: '2024-04-20T11:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[3].id, // SilentGen 150
            service_date: '2024-07-05',
            service_type: 'First Maintenance',
            technician_id: users[5].id, // Frank Technician
            status: 'pending',
            duration: 3.0,
            service_cost: 6000,
            work_order: 'WO-005',
            notes: 'Initial check-up after installation.',
            parts_used: JSON.stringify([]),
            created_at: '2024-06-01T09:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[4].id, // CompactGen 50
            service_date: '2024-01-20',
            service_type: 'Routine Check',
            technician_id: users[1].id, // Bob Technician
            status: 'completed',
            duration: 1.0,
            service_cost: 2000,
            work_order: 'WO-006',
            notes: 'Checked fluid levels and general operation.',
            parts_used: JSON.stringify([{ part_id: parts[3].id, quantity: 0.5 }]),
            created_at: '2024-01-19T14:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[0].id, // GenPro X100
            service_date: '2023-04-22',
            service_type: 'Scheduled Maintenance',
            technician_id: users[1].id, // Bob Technician
            status: 'completed',
            duration: 2.0,
            service_cost: 4500,
            work_order: 'WO-007',
            notes: 'Annual service, replaced fuel filter.',
            parts_used: JSON.stringify([{ part_id: parts[5].id, quantity: 1 }]),
            created_at: '2023-04-21T10:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[1].id, // EcoGen 500
            service_date: '2023-09-05',
            service_type: 'Repair',
            technician_id: users[3].id, // David Technician
            status: 'completed',
            duration: 3.0,
            service_cost: 7500,
            work_order: 'WO-008',
            notes: 'Replaced faulty sensor.',
            parts_used: JSON.stringify([]),
            created_at: '2023-09-04T11:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[5].id, // MegaWatt 5000
            service_date: '2024-01-05',
            service_type: 'Scheduled Maintenance',
            technician_id: users[5].id, // Frank Technician
            status: 'completed',
            duration: 6.0,
            service_cost: 15000,
            work_order: 'WO-009',
            notes: 'Major service, oil and air filter change, general inspection.',
            parts_used: JSON.stringify([{ part_id: parts[0].id, quantity: 2 }, { part_id: parts[2].id, quantity: 1 }, { part_id: parts[7].id, quantity: 1 }]),
            created_at: '2024-01-04T08:00:00Z'
        },
        {
            id: `service-${uuidv4()}`,
            generator_id: generators[5].id, // MegaWatt 5000
            service_date: '2024-07-05',
            service_type: 'Scheduled Maintenance',
            technician_id: users[5].id, // Frank Technician
            status: 'scheduled',
            duration: 6.0,
            service_cost: 15000,
            work_order: 'WO-010',
            notes: 'Upcoming major service.',
            parts_used: JSON.stringify([]),
            created_at: '2024-06-20T10:00:00Z'
        }
    ];

    return { users, generators, parts, services };
}

module.exports = { generateSampleData, DEFAULT_ADMIN_CREDENTIALS };
