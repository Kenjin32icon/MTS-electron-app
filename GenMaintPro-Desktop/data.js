// src/backend/data.js

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const saltRounds = 10;

const generateSampleData = async () => {
    const users = [];
    const generators = [];
    const services = [];
    const parts = [];

    // --- Users ---
    const adminPassword = await bcrypt.hash('admin123', saltRounds);
    const techPassword = await bcrypt.hash('tech123', saltRounds);
    const clientPassword = await bcrypt.hash('client123', saltRounds);

    const adminUser = {
        id: `user-${uuidv4()}`,
        name: 'Admin User',
        email: 'admin@genmaint.com',
        password_hash: adminPassword,
        role: 'admin',
        status: 'active',
        last_login: new Date().toISOString(),
        phone: '555-111-2222',
        address: '123 Admin St, Admin City',
        employee_id: 'EMP001',
        hire_date: '2020-01-01',
        team: 'Management',
        certifications: 'PMP, ITIL',
        specialties: 'System Admin, Reporting',
        notes: 'Primary system administrator.'
    };
    users.push(adminUser);

    const techJohn = {
        id: `user-${uuidv4()}`,
        name: 'John Doe',
        email: 'john.doe@genmaint.com',
        password_hash: techPassword,
        role: 'technician',
        status: 'active',
        last_login: new Date().toISOString(),
        phone: '555-333-4444',
        address: '456 Tech Ave, Tech Town',
        employee_id: 'EMP002',
        hire_date: '2021-03-15',
        team: 'Field Service A',
        certifications: 'Generator Repair, Electrical Safety',
        specialties: 'Diesel Generators, Troubleshooting',
        notes: 'Experienced diesel generator technician.'
    };
    users.push(techJohn);

    const techJane = {
        id: `user-${uuidv4()}`,
        name: 'Jane Smith',
        email: 'jane.smith@genmaint.com',
        password_hash: techPassword,
        role: 'technician',
        status: 'active',
        last_login: new Date().toISOString(),
        phone: '555-555-6666',
        address: '789 Service Rd, Service City',
        employee_id: 'EMP003',
        hire_date: '2022-07-01',
        team: 'Field Service B',
        certifications: 'Gas Generator Maintenance',
        specialties: 'Natural Gas Generators, Preventative Maintenance',
        notes: 'Specializes in natural gas units.'
    };
    users.push(techJane);

    const clientABC = {
        id: `user-${uuidv4()}`,
        name: 'ABC Corp',
        email: 'client@abccorp.com',
        password_hash: clientPassword,
        role: 'client',
        status: 'active',
        last_login: new Date().toISOString(),
        phone: '555-777-8888',
        address: '101 Business Park, Corp City',
        notes: 'Key client with multiple generators.'
    };
    users.push(clientABC);

    const clientXYZ = {
        id: `user-${uuidv4()}`,
        name: 'XYZ Solutions',
        email: 'client@xyzsolutions.com',
        password_hash: clientPassword,
        role: 'client',
        status: 'active',
        last_login: new Date().toISOString(),
        phone: '555-999-0000',
        address: '202 Tech Hub, Solution Town',
        notes: 'New client, single generator.'
    };
    users.push(clientXYZ);

    // --- Generators ---
    const gen1 = {
        id: `gen-${uuidv4()}`,
        model: 'GenPro X100',
        type: 'Diesel',
        serial_number: 'SN-GPX100-001',
        location: 'Warehouse A',
        purchase_date: '2022-01-15',
        warranty_end: '2025-01-15',
        supplier: 'Global Power Inc.',
        cost: 15000.00,
        total_hours_run: 1250.5,
        last_service: '2024-03-10',
        next_service: '2024-09-10',
        status: 'Active',
        client_id: clientABC.id,
        assigned_tech_id: techJohn.id,
        notes: 'Primary backup for critical systems. Regular load testing recommended.'
    };
    generators.push(gen1);

    const gen2 = {
        id: `gen-${uuidv4()}`,
        model: 'EcoGen 5000',
        type: 'Natural Gas',
        serial_number: 'SN-EG5000-002',
        location: 'Site B',
        purchase_date: '2023-05-20',
        warranty_end: '2026-05-20',
        supplier: 'Green Energy Solutions',
        cost: 22000.00,
        total_hours_run: 300.2,
        last_service: '2024-04-01',
        next_service: '2024-10-01',
        status: 'Active',
        client_id: clientABC.id,
        assigned_tech_id: techJane.id,
        notes: 'Used for peak shaving. Requires quarterly gas line inspection.'
    };
    generators.push(gen2);

    const gen3 = {
        id: `gen-${uuidv4()}`,
        model: 'PowerMax 200',
        type: 'Gasoline',
        serial_number: 'SN-PM200-003',
        location: 'Main Office',
        purchase_date: '2024-01-05',
        warranty_end: '2027-01-05',
        supplier: 'Local Hardware',
        cost: 3500.00,
        total_hours_run: 50.0,
        last_service: null,
        next_service: '2024-07-05',
        status: 'Active',
        client_id: clientXYZ.id,
        assigned_tech_id: techJohn.id,
        notes: 'Small emergency backup for office. Fuel stabilizer used.'
    };
    generators.push(gen3);

    // --- Parts ---
    const partOilFilter = {
        id: `part-${uuidv4()}`,
        name: 'Oil Filter',
        part_number: 'OF-12345',
        quantity_in_stock: 50,
        cost_per_unit: 15.00,
        category: 'Filters',
        min_stock_level: 10,
        preferred_supplier: 'FilterCo',
        last_ordered: '2024-04-01',
        used_last_month: 15,
        compatible_generators: 'GenPro X100, EcoGen 5000',
        location: 'Warehouse Shelf A3',
        reorder_point: 15,
        lead_time: 5,
        notes: 'Standard oil filter. High usage item.',
        status: 'In Stock'
    };
    parts.push(partOilFilter);

    const partAirFilter = {
        id: `part-${uuidv4()}`,
        name: 'Air Filter',
        part_number: 'AF-67890',
        quantity_in_stock: 5,
        cost_per_unit: 25.00,
        category: 'Filters',
        min_stock_level: 5,
        preferred_supplier: 'AirFlow Parts',
        last_ordered: '2024-03-10',
        used_last_month: 3,
        compatible_generators: 'GenPro X100',
        location: 'Warehouse Shelf A4',
        reorder_point: 8,
        lead_time: 7,
        notes: 'Specific for GenPro X100. Monitor stock closely.',
        status: 'Low Stock'
    };
    parts.push(partAirFilter);

    const partSparkPlug = {
        id: `part-${uuidv4()}`,
        name: 'Spark Plug',
        part_number: 'SP-11223',
        quantity_in_stock: 0,
        cost_per_unit: 5.50,
        category: 'Electrical',
        min_stock_level: 20,
        preferred_supplier: 'Ignition Supply',
        last_ordered: '2024-02-01',
        used_last_month: 10,
        compatible_generators: 'PowerMax 200',
        location: 'Warehouse Bin B1',
        reorder_point: 25,
        lead_time: 3,
        notes: 'Out of stock. Urgent reorder needed.',
        status: 'Out of Stock'
    };
    parts.push(partSparkPlug);

    // --- Services ---
    const service1 = {
        id: `srv-${uuidv4()}`,
        generator_id: gen1.id,
        service_date: '2024-03-10',
        service_type: 'Scheduled Maintenance',
        technician_id: techJohn.id,
        status: 'completed',
        duration: 2.5,
        service_cost: 350.00,
        work_order: 'WO-2024-001',
        notes: 'Oil change, filter replacement, general inspection. Generator running smoothly.',
        parts_used: JSON.stringify([
            { part_id: partOilFilter.id, quantity: 1 },
            { part_id: partAirFilter.id, quantity: 1 }
        ])
    };
    services.push(service1);

    const service2 = {
        id: `srv-${uuidv4()}`,
        generator_id: gen2.id,
        service_date: '2024-04-01',
        service_type: 'Quarterly Inspection',
        technician_id: techJane.id,
        status: 'completed',
        duration: 1.0,
        service_cost: 150.00,
        work_order: 'WO-2024-002',
        notes: 'Checked gas lines, pressure, and general operational parameters. All good.',
        parts_used: '[]'
    };
    services.push(service2);

    const service3 = {
        id: `srv-${uuidv4()}`,
        generator_id: gen1.id,
        service_date: '2024-09-10', // Future date
        service_type: 'Scheduled Maintenance',
        technician_id: techJohn.id,
        status: 'pending',
        duration: 3.0,
        service_cost: 400.00,
        work_order: 'WO-2024-003',
        notes: 'Next major service. Includes coolant flush.',
        parts_used: '[]' // Placeholder, parts will be added after service
    };
    services.push(service3);

    const service4 = {
        id: `srv-${uuidv4()}`,
        generator_id: gen3.id,
        service_date: '2024-07-05', // Future date
        service_type: 'Initial Setup & Inspection',
        technician_id: techJohn.id,
        status: 'scheduled',
        duration: 1.5,
        service_cost: 200.00,
        work_order: 'WO-2024-004',
        notes: 'First service for new generator. Check all connections and run test.',
        parts_used: '[]'
    };
    services.push(service4);

    return { users, generators, services, parts };
};

module.exports = { generateSampleData };