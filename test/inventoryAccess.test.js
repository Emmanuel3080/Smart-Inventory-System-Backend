const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const app = require("../server");
const AdminModel = require("../Model/AdminModel");
const StaffModel = require("../Model/StaffModel");
const productModel = require("../Model/ProductsModel");
const supplierModel = require("../Model/SupplierModel");
const TransactionModel = require("../Model/TransactionModel");
const StaffInvitationModel = require("../Model/StaffInvitationModel");

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
    console.log("RUNNING END-TO-END INVENTORY ACCESS & OWNERSHIP TESTS");
    console.log("========================================================\n");

    const mongoUri = process.env.MongodbKey;
    await mongoose.connect(mongoUri);

    // Start server on dynamic port (0) to prevent port conflicts
    await new Promise((resolve) => {
        serverInstance = app.listen(0, () => {
            const port = serverInstance.address().port;
            BASE_URL = `http://localhost:${port}`;
            console.log(`Test server dynamically running at ${BASE_URL}`);
            resolve();
        });
    });

    const timestamp = Date.now();
    const testAdmin1Email = `admin1_${timestamp}@test.com`;
    const testAdmin2Email = `admin2_${timestamp}@test.com`;
    const testStaff1Email = `staff1_${timestamp}@test.com`;
    const testUnassignedStaffEmail = `unassigned_${timestamp}@test.com`;
    const testPassword = "Password123#";

    let admin1 = null;
    let admin2 = null;

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(testPassword, salt);

        // ------------------------------------------------------------------
        // SETUP: Create Admin 1 and Admin 2
        // ------------------------------------------------------------------
        console.log("\n--- STEP 1: Creating Admin 1 and Admin 2 ---");
        admin1 = await AdminModel.create({
            fullName: "Admin One",
            email: testAdmin1Email,
            password: hashedPassword,
            role: "super_admin"
        });

        admin2 = await AdminModel.create({
            fullName: "Admin Two",
            email: testAdmin2Email,
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

        assert(admin1 && admin2, "Both Admin 1 and Admin 2 created in DB");

        // ------------------------------------------------------------------
        // TEST 2: Independent Staff Registration (adminId must remain null)
        // ------------------------------------------------------------------
        console.log("\n--- STEP 2: Independent Staff Registration ---");
        const regRes = await fetch(`${BASE_URL}/staff/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                firstName: "Independent",
                lastName: "Staff",
                email: testUnassignedStaffEmail,
                password: testPassword,
                adminId: admin1._id // Attacker trying to supply arbitrary adminId!
            })
        });
        const regData = await regRes.json();
        assert(regRes.status === 201, "Independent staff registered with status 201");
        assert(regData.newStaff.adminId === null, "Arbitrary adminId ignored: staff adminId is strictly null");

        // Staff login
        const loginRes = await fetch(`${BASE_URL}/staff/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testUnassignedStaffEmail,
                password: testPassword
            })
        });
        const loginData = await loginRes.json();
        assert(loginRes.status === 200, "Unassigned staff logged in with status 200");
        const tokenUnassignedStaff = loginData.token;
        assert(tokenUnassignedStaff, "Unassigned staff received JWT token");

        // ------------------------------------------------------------------
        // TEST 3: Unassigned Staff Access Denied (HTTP 403)
        // ------------------------------------------------------------------
        console.log("\n--- STEP 3: Unassigned Staff Inventory Access Control ---");
        const unassignedProductsRes = await fetch(`${BASE_URL}/staff/all/products`, {
            headers: { Authorization: `Bearer ${tokenUnassignedStaff}` }
        });
        assert(unassignedProductsRes.status === 403, "Unassigned staff denied inventory product listing with HTTP 403");

        const unassignedSearchRes = await fetch(`${BASE_URL}/staff/products`, {
            headers: { Authorization: `Bearer ${tokenUnassignedStaff}` }
        });
        assert(unassignedSearchRes.status === 403, "Unassigned staff denied inventory search with HTTP 403");

        const unassignedSaleRes = await fetch(`${BASE_URL}/staff/process/sales`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tokenUnassignedStaff}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: [{ _id: new mongoose.Types.ObjectId(), quantity: 1 }],
                paymentMethod: "Cash"
            })
        });
        assert(unassignedSaleRes.status === 403, "Unassigned staff denied processing sales with HTTP 403");

        // ------------------------------------------------------------------
        // TEST 4: Staff Invitation Workflow (Admin 1 -> Staff 1)
        // ------------------------------------------------------------------
        console.log("\n--- STEP 4: Staff Invitation Creation, Verification & Acceptance ---");
        const inviteRes = await fetch(`${BASE_URL}/api/v1/staff/invitations`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tokenAdmin1}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: testStaff1Email })
        });
        const inviteData = await inviteRes.json();
        assert(inviteRes.status === 201, "Admin 1 created staff invitation (status 201)");
        assert(inviteData.invitationToken, "Raw token returned in invitation response");
        assert(inviteData.invitationLink, "Frontend invitation URL returned");

        const invitationToken = inviteData.invitationToken;

        // Verify token endpoint
        const verifyRes = await fetch(`${BASE_URL}/api/v1/staff/invitations/verify/${invitationToken}`);
        const verifyData = await verifyRes.json();
        assert(verifyRes.status === 200, "Invitation token verified successfully (status 200)");
        assert(verifyData.invitation.email === testStaff1Email.toLowerCase(), "Invitation email matches");

        // Attempt accept with wrong email
        const badEmailRes = await fetch(`${BASE_URL}/api/v1/staff/invitations/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: invitationToken,
                email: "wrong_email@test.com",
                firstName: "Assigned",
                lastName: "Staff",
                password: testPassword
            })
        });
        assert(badEmailRes.status === 400, "Acceptance rejected when email does not match invitation (status 400)");

        // Successfully accept invitation
        const acceptRes = await fetch(`${BASE_URL}/api/v1/staff/invitations/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: invitationToken,
                email: testStaff1Email,
                firstName: "StaffOne",
                lastName: "Tester",
                password: testPassword
            })
        });
        const acceptData = await acceptRes.json();
        assert(acceptRes.status === 201, "Staff accepted invitation successfully (status 201)");
        assert(acceptData.staff.adminId.toString() === admin1._id.toString(), "Staff is correctly assigned to Admin 1");

        // Verify token cannot be reused
        const reuseRes = await fetch(`${BASE_URL}/api/v1/staff/invitations/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: invitationToken,
                email: testStaff1Email,
                firstName: "StaffOne",
                lastName: "Tester",
                password: testPassword
            })
        });
        assert(reuseRes.status === 400, "Reusing accepted invitation token is rejected (status 400)");

        // ------------------------------------------------------------------
        // TEST 5: Assigned Staff Login & Password Verification
        // ------------------------------------------------------------------
        console.log("\n--- STEP 5: Assigned Staff Login ---");
        const staffLoginRes = await fetch(`${BASE_URL}/staff/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: testStaff1Email,
                password: testPassword
            })
        });
        const staffLoginData = await staffLoginRes.json();
        assert(staffLoginRes.status === 200, "Assigned Staff 1 logged in successfully (status 200)");
        assert(staffLoginData.staffInfo.adminId.toString() === admin1._id.toString(), "StaffInfo includes assigned adminId");
        const tokenStaff1 = staffLoginData.token;

        // ------------------------------------------------------------------
        // TEST 6: Inventory Ownership & Multi-Admin Isolation
        // ------------------------------------------------------------------
        console.log("\n--- STEP 6: Multi-Admin Inventory Isolation ---");

        // Create Supplier for Admin 1 and Admin 2
        const supplier1 = await supplierModel.create({
            adminId: admin1._id,
            supplierName: "Supplier Alpha",
            email: `sup1_${timestamp}@test.com`,
            phoneNumber: "08011111111"
        });

        const supplier2 = await supplierModel.create({
            adminId: admin2._id,
            supplierName: "Supplier Beta",
            email: `sup2_${timestamp}@test.com`,
            phoneNumber: "08022222222"
        });

        // Create Product for Admin 1
        const product1 = await productModel.create({
            adminId: admin1._id,
            createdBy: admin1._id,
            productName: "Admin1 Laptop",
            sku: `SKU-A1-${timestamp}`,
            description: "High end laptop",
            category: "Electronics",
            quantity: 10,
            unitPrice: 500,
            sellingPrice: 700,
            supplier: supplier1._id,
            productImage: "http://example.com/p1.jpg",
            status: "In_Stock"
        });

        // Create Product for Admin 2
        const product2 = await productModel.create({
            adminId: admin2._id,
            createdBy: admin2._id,
            productName: "Admin2 Smartphone",
            sku: `SKU-A2-${timestamp}`,
            description: "Flagship smartphone",
            category: "Electronics",
            quantity: 15,
            unitPrice: 300,
            sellingPrice: 450,
            supplier: supplier2._id,
            productImage: "http://example.com/p2.jpg",
            status: "In_Stock"
        });

        // Admin 1 views all products
        const a1ProductsRes = await fetch(`${BASE_URL}/admin/all/products`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const a1ProductsData = await a1ProductsRes.json();
        assert(a1ProductsRes.status === 200, "Admin 1 fetched products (status 200)");
        const a1HasProd1 = a1ProductsData.products.some(p => p._id.toString() === product1._id.toString());
        const a1HasProd2 = a1ProductsData.products.some(p => p._id.toString() === product2._id.toString());
        assert(a1HasProd1 && !a1HasProd2, "Admin 1 sees ONLY Product 1, cannot see Product 2");

        // Admin 2 views all products
        const a2ProductsRes = await fetch(`${BASE_URL}/admin/all/products`, {
            headers: { Authorization: `Bearer ${tokenAdmin2}` }
        });
        const a2ProductsData = await a2ProductsRes.json();
        assert(a2ProductsRes.status === 200, "Admin 2 fetched products (status 200)");
        const a2HasProd1 = a2ProductsData.products.some(p => p._id.toString() === product1._id.toString());
        const a2HasProd2 = a2ProductsData.products.some(p => p._id.toString() === product2._id.toString());
        assert(a2HasProd2 && !a2HasProd1, "Admin 2 sees ONLY Product 2, cannot see Product 1");

        // Admin 2 attempts to get Product 1 (cross-admin access attempt)
        const crossGetRes = await fetch(`${BASE_URL}/admin/product/${product1._id}`, {
            headers: { Authorization: `Bearer ${tokenAdmin2}` }
        });
        assert(crossGetRes.status === 404, "Admin 2 denied access to Admin 1's product details (status 404)");

        // Admin 2 attempts to update Product 1
        const crossUpdateRes = await fetch(`${BASE_URL}/admin/update_product/${product1._id}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${tokenAdmin2}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ sellingPrice: 999 })
        });
        assert(crossUpdateRes.status === 404, "Admin 2 denied updating Admin 1's product (status 404)");

        // Admin 2 attempts to delete Product 1
        const crossDeleteRes = await fetch(`${BASE_URL}/admin/delete_product/${product1._id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${tokenAdmin2}` }
        });
        assert(crossDeleteRes.status === 404, "Admin 2 denied deleting Admin 1's product (status 404)");

        // ------------------------------------------------------------------
        // TEST 7: Staff 1 Inventory Scoping
        // ------------------------------------------------------------------
        console.log("\n--- STEP 7: Staff Inventory Scoping (Admin 1's Staff) ---");

        // Staff 1 views products
        const staffProductsRes = await fetch(`${BASE_URL}/staff/all/products`, {
            headers: { Authorization: `Bearer ${tokenStaff1}` }
        });
        const staffProductsData = await staffProductsRes.json();
        assert(staffProductsRes.status === 200, "Staff 1 fetched products (status 200)");
        const staffHasProd1 = staffProductsData.products.some(p => p._id.toString() === product1._id.toString());
        const staffHasProd2 = staffProductsData.products.some(p => p._id.toString() === product2._id.toString());
        assert(staffHasProd1 && !staffHasProd2, "Staff 1 sees Admin 1's product, NOT Admin 2's product");

        // Staff 1 gets single product
        const staffGetRes = await fetch(`${BASE_URL}/staff/product/${product1._id}`, {
            headers: { Authorization: `Bearer ${tokenStaff1}` }
        });
        assert(staffGetRes.status === 200, "Staff 1 can view Product 1 details (status 200)");

        const staffCrossGetRes = await fetch(`${BASE_URL}/staff/product/${product2._id}`, {
            headers: { Authorization: `Bearer ${tokenStaff1}` }
        });
        assert(staffCrossGetRes.status === 404, "Staff 1 cannot view Product 2 details (status 404)");

        // Staff 1 search query
        const staffSearchRes = await fetch(`${BASE_URL}/staff/products?querys=Admin2`, {
            headers: { Authorization: `Bearer ${tokenStaff1}` }
        });
        const staffSearchData = await staffSearchRes.json();
        assert(staffSearchData.products.length === 0, "Staff 1 search for Admin 2's products yields 0 results");

        // ------------------------------------------------------------------
        // TEST 8: Sales Processing & Transaction Ownership
        // ------------------------------------------------------------------
        console.log("\n--- STEP 8: Sales Processing & Isolation ---");

        // Staff 1 processes sale on Product 1 (quantity 2)
        const saleRes = await fetch(`${BASE_URL}/staff/process/sales`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tokenStaff1}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: [{ _id: product1._id, quantity: 2 }],
                paymentMethod: "Cash"
            })
        });
        const saleData = await saleRes.json();
        assert(saleRes.status === 201, "Staff 1 processed sale successfully (status 201)");
        assert(saleData.receipt.totalAmount === 1400, "Total amount calculated correctly (2 * 700 = 1400)");

        // Verify stock decremented in DB
        const updatedProd1 = await productModel.findById(product1._id);
        assert(updatedProd1.quantity === 8, "Product 1 quantity decremented from 10 to 8");

        // Staff 1 attempts to process sale on Product 2 (Admin 2's product)
        const crossSaleRes = await fetch(`${BASE_URL}/staff/process/sales`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${tokenStaff1}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                items: [{ _id: product2._id, quantity: 1 }],
                paymentMethod: "Card"
            })
        });
        assert(crossSaleRes.status === 404, "Staff 1 rejected when attempting to sell Admin 2's product (status 404)");

        // Admin 1 views transactions
        const a1TxRes = await fetch(`${BASE_URL}/admin/all/transactions`, {
            headers: { Authorization: `Bearer ${tokenAdmin1}` }
        });
        const a1TxData = await a1TxRes.json();
        assert(a1TxRes.status === 200, "Admin 1 fetched transactions (status 200)");
        const a1HasTx = a1TxData.data.some(t => t._id.toString() === saleData.transactionId.toString());
        assert(a1HasTx, "Admin 1 sees Staff 1's sale transaction");

        // Admin 2 views transactions
        const a2TxRes = await fetch(`${BASE_URL}/admin/all/transactions`, {
            headers: { Authorization: `Bearer ${tokenAdmin2}` }
        });
        const a2TxData = await a2TxRes.json();
        const a2HasTx = a2TxData.data.some(t => t._id.toString() === saleData.transactionId.toString());
        assert(!a2HasTx, "Admin 2 DOES NOT see Admin 1's sale transaction");

        console.log("\n========================================================");
        console.log("ALL INVENTORY OWNERSHIP AND ACCESS CONTROL TESTS PASSED!");
        console.log("========================================================\n");

    } catch (err) {
        console.error("\n❌ TEST SUITE FAILED:", err);
        process.exitCode = 1;
    } finally {
        // Cleanup test data
        console.log("Cleaning up test documents...");
        await AdminModel.deleteMany({ email: { $in: [testAdmin1Email, testAdmin2Email] } });
        await StaffModel.deleteMany({ email: { $in: [testStaff1Email, testUnassignedStaffEmail] } });
        await productModel.deleteMany({ sku: { $in: [`SKU-A1-${timestamp}`, `SKU-A2-${timestamp}`] } });
        await supplierModel.deleteMany({ email: { $in: [`sup1_${timestamp}@test.com`, `sup2_${timestamp}@test.com`] } });
        await StaffInvitationModel.deleteMany({ email: testStaff1Email.toLowerCase() });
        await TransactionModel.deleteMany({ adminId: { $in: [admin1?._id, admin2?._id] } });

        if (serverInstance) serverInstance.close();
        await mongoose.disconnect();
        console.log("Disconnected and test server closed.");
    }
};

runTests();
