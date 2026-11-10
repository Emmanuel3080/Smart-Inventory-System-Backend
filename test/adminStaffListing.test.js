const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const app = require("../server");
const AdminModel = require("../Model/AdminModel");
const StaffModel = require("../Model/StaffModel");

let serverInstance;
let BASE_URL;

const assert = (condition, message) => {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    }
    console.log(`✅ PASSED: ${message}`);
};

const runTests = async () => {
    console.log("\n========================================================");
    console.log("RUNNING ADMIN STAFF LISTING API TEST SUITE (GET /api/v1/staff)");
    console.log("========================================================\n");

    const mongoUri = process.env.MongodbKey;
    await mongoose.connect(mongoUri);

    // Dynamic port assignment to avoid port conflicts
    await new Promise((resolve) => {
        serverInstance = app.listen(0, () => {
            const port = serverInstance.address().port;
            BASE_URL = `http://localhost:${port}`;
            console.log(`Test server running at ${BASE_URL}`);
            resolve();
        });
    });

    const timestamp = Date.now();
    const testAdmin1Email = `listing_adm1_${timestamp}@test.com`;
    const testAdmin2Email = `listing_adm2_${timestamp}@test.com`;
    const testAdminEmptyEmail = `listing_adm_empty_${timestamp}@test.com`;

    const staffEmails = {
        alice: `alice_${timestamp}@test.com`,
        bob: `bob_${timestamp}@test.com`,
        charlie: `charlie_${timestamp}@test.com`,
        david: `david_${timestamp}@test.com`,
        unassigned: `unassigned_${timestamp}@test.com`
    };

    let admin1, admin2, adminEmpty;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("Password123#", salt);

        // 1. Create Admins
        admin1 = await AdminModel.create({
            fullName: "Admin First",
            email: testAdmin1Email,
            password: hashedPassword,
            role: "super_admin"
        });

        admin2 = await AdminModel.create({
            fullName: "Admin Second",
            email: testAdmin2Email,
            password: hashedPassword,
            role: "super_admin"
        });

        adminEmpty = await AdminModel.create({
            fullName: "Admin Empty",
            email: testAdminEmptyEmail,
            password: hashedPassword,
            role: "super_admin"
        });

        const tokenAdmin1 = jwt.sign(
            { adminId: admin1._id, adminEmail: admin1.email },
            process.env.adminJwtToken,
            { expiresIn: "1d" }
        );

        const tokenAdmin2 = jwt.sign(
            { adminId: admin2._id, adminEmail: admin2.email },
            process.env.adminJwtToken,
            { expiresIn: "1d" }
        );

        const tokenAdminEmpty = jwt.sign(
            { adminId: adminEmpty._id, adminEmail: adminEmpty.email },
            process.env.adminJwtToken,
            { expiresIn: "1d" }
        );

        // 2. Create Staff accounts
        // Admin 1's staff
        const staffAlice = await StaffModel.create({
            firstName: "Alice",
            lastName: "Smith",
            email: staffEmails.alice,
            password: hashedPassword,
            adminId: admin1._id,
            role: "staff",
            isActive: true
        });

        const staffBob = await StaffModel.create({
            firstName: "Bob",
            lastName: "Jones",
            email: staffEmails.bob,
            password: hashedPassword,
            adminId: admin1._id,
            role: "staff",
            isActive: false // Inactive
        });

        const staffCharlie = await StaffModel.create({
            firstName: "Charlie",
            lastName: "Brown",
            email: staffEmails.charlie,
            password: hashedPassword,
            adminId: admin1._id,
            role: "staff",
            isActive: true
        });

        // Admin 2's staff
        const staffDavid = await StaffModel.create({
            firstName: "David",
            lastName: "Miller",
            email: staffEmails.david,
            password: hashedPassword,
            adminId: admin2._id,
            role: "staff",
            isActive: true
        });

        // Unassigned staff
        const staffUnassigned = await StaffModel.create({
            firstName: "Eve",
            lastName: "Unknown",
            email: staffEmails.unassigned,
            password: hashedPassword,
            adminId: null, // Unassigned!
            role: "staff",
            isActive: true
        });

        // Staff JWT token for testing 403 on staff attempt
        const tokenStaffAlice = jwt.sign(
            { id: staffAlice._id, Staffemail: staffAlice.email },
            process.env.staffJwtSecret,
            { expiresIn: "1d" }
        );

        // ------------------------------------------------------------------
        // TEST 1: Admin 1 retrieves all staff
        // ------------------------------------------------------------------
        console.log("\n--- TEST 1: Admin 1 Staff Retrieval & Multi-Admin Isolation ---");
        const resA1 = await fetch(`${BASE_URL}/api/v1/staff`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataA1 = await resA1.json();
        assert(resA1.status === 200, "Admin 1 retrieved staff list with status 200");
        assert(dataA1.staff.length === 3, "Admin 1 has exactly 3 staff accounts");
        const a1Ids = dataA1.staff.map(s => s.id.toString());
        assert(a1Ids.includes(staffAlice._id.toString()), "Admin 1 results contain Alice");
        assert(a1Ids.includes(staffBob._id.toString()), "Admin 1 results contain Bob");
        assert(a1Ids.includes(staffCharlie._id.toString()), "Admin 1 results contain Charlie");
        assert(!a1Ids.includes(staffDavid._id.toString()), "Admin 1 results DO NOT contain David (Admin 2's staff)");
        assert(!a1Ids.includes(staffUnassigned._id.toString()), "Admin 1 results DO NOT contain Eve (unassigned staff)");

        // ------------------------------------------------------------------
        // TEST 2: Admin 2 retrieves staff
        // ------------------------------------------------------------------
        console.log("\n--- TEST 2: Admin 2 Staff Retrieval ---");
        const resA2 = await fetch(`${BASE_URL}/api/v1/staff`, {
            headers: { Authorization: `Bearer ${tokenAdmin2}` }
        });
        const dataA2 = await resA2.json();
        assert(resA2.status === 200, "Admin 2 retrieved staff list with status 200");
        assert(dataA2.staff.length === 1, "Admin 2 has exactly 1 staff account");
        assert(dataA2.staff[0].id.toString() === staffDavid._id.toString(), "Admin 2 results contain ONLY David");

        // ------------------------------------------------------------------
        // TEST 3: Admin with no linked staff accounts
        // ------------------------------------------------------------------
        console.log("\n--- TEST 3: Admin with No Linked Staff Returns Empty Array ---");
        const resEmpty = await fetch(`${BASE_URL}/api/v1/staff`, {
            headers: { Authorization: `Bearer ${tokenAdminEmpty}` }
        });
        const dataEmpty = await resEmpty.json();
        assert(resEmpty.status === 200, "Admin with no staff gets status 200");
        assert(Array.isArray(dataEmpty.staff) && dataEmpty.staff.length === 0, "Staff list is an empty array");
        assert(dataEmpty.pagination.totalRecords === 0, "Pagination totalRecords is 0");
        assert(dataEmpty.pagination.totalPages === 0, "Pagination totalPages is 0");

        // ------------------------------------------------------------------
        // TEST 4: Pagination (page & limit)
        // ------------------------------------------------------------------
        console.log("\n--- TEST 4: Pagination Support ---");
        const resPage1 = await fetch(`${BASE_URL}/api/v1/staff?page=1&limit=2`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataPage1 = await resPage1.json();
        assert(dataPage1.staff.length === 2, "Page 1 with limit 2 returns 2 records");
        assert(dataPage1.pagination.totalRecords === 3, "Pagination totalRecords is 3");
        assert(dataPage1.pagination.totalPages === 2, "Pagination totalPages is 2");
        assert(dataPage1.pagination.currentPage === 1, "Pagination currentPage is 1");
        assert(dataPage1.pagination.hasNextPage === true, "hasNextPage is true on page 1");
        assert(dataPage1.pagination.hasPrevPage === false, "hasPrevPage is false on page 1");

        const resPage2 = await fetch(`${BASE_URL}/api/v1/staff?page=2&limit=2`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataPage2 = await resPage2.json();
        assert(dataPage2.staff.length === 1, "Page 2 with limit 2 returns remaining 1 record");
        assert(dataPage2.pagination.currentPage === 2, "Pagination currentPage is 2");
        assert(dataPage2.pagination.hasNextPage === false, "hasNextPage is false on page 2");
        assert(dataPage2.pagination.hasPrevPage === true, "hasPrevPage is true on page 2");

        // ------------------------------------------------------------------
        // TEST 5: Search (across firstName, lastName, and email)
        // ------------------------------------------------------------------
        console.log("\n--- TEST 5: Search Support ---");
        const resSearchFirstName = await fetch(`${BASE_URL}/api/v1/staff?search=Alice`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataSearchFirstName = await resSearchFirstName.json();
        assert(dataSearchFirstName.staff.length === 1, "Search by firstName 'Alice' returns 1 record");
        assert(dataSearchFirstName.staff[0].firstName === "Alice", "Search matched Alice");

        const resSearchLastName = await fetch(`${BASE_URL}/api/v1/staff?search=smith`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataSearchLastName = await resSearchLastName.json();
        assert(dataSearchLastName.staff.length === 1, "Case-insensitive search by lastName 'smith' matches Alice");

        const resSearchEmail = await fetch(`${BASE_URL}/api/v1/staff?search=bob_`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataSearchEmail = await resSearchEmail.json();
        assert(dataSearchEmail.staff.length === 1, "Search by email prefix matches Bob");

        // Search for David (Admin 2's staff) while authenticated as Admin 1
        const resSearchCross = await fetch(`${BASE_URL}/api/v1/staff?search=David`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataSearchCross = await resSearchCross.json();
        assert(dataSearchCross.staff.length === 0, "Admin 1 search for Admin 2's staff returns 0 records");

        // ------------------------------------------------------------------
        // TEST 6: Status Filtering (active / inactive)
        // ------------------------------------------------------------------
        console.log("\n--- TEST 6: Status Filtering ---");
        const resActive = await fetch(`${BASE_URL}/api/v1/staff?status=active`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataActive = await resActive.json();
        assert(dataActive.staff.length === 2, "Filtering status=active returns 2 staff (Alice & Charlie)");
        assert(dataActive.staff.every(s => s.isActive === true), "All returned staff have isActive: true");

        const resInactive = await fetch(`${BASE_URL}/api/v1/staff?status=inactive`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataInactive = await resInactive.json();
        assert(dataInactive.staff.length === 1, "Filtering status=inactive returns 1 staff (Bob)");
        assert(dataInactive.staff[0].firstName === "Bob", "Inactive staff is Bob");
        assert(dataInactive.staff[0].isActive === false, "Bob has isActive: false");

        // Invalid status parameter
        const resBadStatus = await fetch(`${BASE_URL}/api/v1/staff?status=invalid_status`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        assert(resBadStatus.status === 400, "Invalid status query returns HTTP 400");

        // ------------------------------------------------------------------
        // TEST 7: Sorting
        // ------------------------------------------------------------------
        console.log("\n--- TEST 7: Sorting Support ---");
        const resSortAsc = await fetch(`${BASE_URL}/api/v1/staff?sortBy=firstName&sortOrder=asc`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataSortAsc = await resSortAsc.json();
        const namesAsc = dataSortAsc.staff.map(s => s.firstName);
        assert(namesAsc[0] === "Alice" && namesAsc[1] === "Bob" && namesAsc[2] === "Charlie", "Sorted ascending by firstName: Alice, Bob, Charlie");

        const resSortDesc = await fetch(`${BASE_URL}/api/v1/staff?sortBy=firstName&sortOrder=desc`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const dataSortDesc = await resSortDesc.json();
        const namesDesc = dataSortDesc.staff.map(s => s.firstName);
        assert(namesDesc[0] === "Charlie" && namesDesc[1] === "Bob" && namesDesc[2] === "Alice", "Sorted descending by firstName: Charlie, Bob, Alice");

        // ------------------------------------------------------------------
        // TEST 8: Sensitive Data Protection
        // ------------------------------------------------------------------
        console.log("\n--- TEST 8: Sensitive Data Leak Prevention ---");
        const sampleStaff = dataA1.staff[0];
        assert(sampleStaff.id !== undefined, "Staff object has id");
        assert(sampleStaff.firstName !== undefined, "Staff object has firstName");
        assert(sampleStaff.lastName !== undefined, "Staff object has lastName");
        assert(sampleStaff.email !== undefined, "Staff object has email");
        assert(sampleStaff.role !== undefined, "Staff object has role");
        assert(sampleStaff.isActive !== undefined, "Staff object has isActive");
        assert(sampleStaff.createdAt !== undefined, "Staff object has createdAt");
        assert(sampleStaff.password === undefined, "Password field is NOT exposed");
        assert(sampleStaff.tokenHash === undefined, "Token hashes are NOT exposed");

        // ------------------------------------------------------------------
        // TEST 9: Staff accounts receive HTTP 403 Forbidden
        // ------------------------------------------------------------------
        console.log("\n--- TEST 9: Access Control (Staff receives HTTP 403) ---");
        const resStaffAttempt = await fetch(`${BASE_URL}/api/v1/staff`, {
            headers: { Authorization: `Bearer ${tokenStaffAlice}` }
        });
        assert(resStaffAttempt.status === 403, "Staff account receives HTTP 403 Forbidden when requesting /api/v1/staff");

        // ------------------------------------------------------------------
        // TEST 10: Unauthenticated access receives HTTP 401 Unauthorized
        // ------------------------------------------------------------------
        console.log("\n--- TEST 10: Unauthenticated Access (HTTP 401) ---");
        const resNoAuth = await fetch(`${BASE_URL}/api/v1/staff`);
        assert(resNoAuth.status === 401, "Unauthenticated request receives HTTP 401 Unauthorized");

        console.log("\n========================================================");
        console.log("ALL ADMIN STAFF LISTING API TESTS PASSED!");
        console.log("========================================================\n");

    } catch (err) {
        console.error("\n❌ TEST SUITE FAILED:", err);
        process.exitCode = 1;
    } finally {
        console.log("Cleaning up test documents...");
        await AdminModel.deleteMany({ email: { $in: [testAdmin1Email, testAdmin2Email, testAdminEmptyEmail] } });
        await StaffModel.deleteMany({ email: { $in: Object.values(staffEmails) } });

        if (serverInstance) serverInstance.close();
        await mongoose.disconnect();
        console.log("Disconnected and test server closed.");
    }
};

runTests();

