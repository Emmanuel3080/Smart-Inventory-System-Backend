const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const AdminModel = require("../Model/AdminModel");
const StaffModel = require("../Model/StaffModel");
const productModel = require("../Model/ProductsModel");
const supplierModel = require("../Model/SupplierModel");
const TransactionModel = require("../Model/TransactionModel");
const StaffInvitationModel = require("../Model/StaffInvitationModel");

const runMigration = async () => {
    console.log("=================================================");
    console.log("Starting SME Inventory Ownership Migration Script");
    console.log("=================================================");

    const mongoUri = process.env.MongodbKey;
    if (!mongoUri) {
        console.error("ERROR: MongodbKey not set in environment.");
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB successfully.");

        // 1. Identify Existing Admins
        const admins = await AdminModel.find();
        console.log(`\n[Admins] Found ${admins.length} registered admin(s):`);
        const adminIdSet = new Set(admins.map(a => a._id.toString()));
        admins.forEach(a => console.log(`  - Admin: ${a.fullName} (${a.email}) [ID: ${a._id}]`));

        // 2. Migrate Products
        console.log("\n[Products] Checking product ownership...");
        const products = await productModel.find();
        let migratedProducts = 0;
        let unknownOwnerProducts = 0;
        let alreadyOwnedProducts = 0;

        for (const product of products) {
            if (product.adminId && adminIdSet.has(product.adminId.toString())) {
                alreadyOwnedProducts++;
                continue;
            }

            // Determine actual ownership via createdBy
            if (product.createdBy && adminIdSet.has(product.createdBy.toString())) {
                product.adminId = product.createdBy;
                await product.save();
                migratedProducts++;
                console.log(`  -> Assigned product '${product.productName}' (${product.sku}) to Admin ${product.adminId}`);
            } else if (admins.length === 1 && !product.adminId) {
                // If there is only one single admin in the database, assign to that sole admin
                product.adminId = admins[0]._id;
                if (!product.createdBy) product.createdBy = admins[0]._id;
                await product.save();
                migratedProducts++;
                console.log(`  -> Assigned unassigned product '${product.productName}' to sole Admin ${admins[0].email}`);
            } else {
                // Unknown ownership: preserve record, leave adminId null so it remains inaccessible until manual review
                product.adminId = null;
                await product.save();
                unknownOwnerProducts++;
                console.warn(`  [!] Product '${product.productName}' (${product.sku}) has unknown ownership. Left inaccessible (adminId: null).`);
            }
        }

        console.log(`Products summary: ${alreadyOwnedProducts} already owned, ${migratedProducts} migrated, ${unknownOwnerProducts} unknown/inaccessible.`);

        // 3. Migrate Suppliers
        console.log("\n[Suppliers] Checking supplier ownership...");
        const suppliers = await supplierModel.find();
        let migratedSuppliers = 0;
        let unknownSuppliers = 0;
        let alreadyOwnedSuppliers = 0;

        for (const supplier of suppliers) {
            if (supplier.adminId && adminIdSet.has(supplier.adminId.toString())) {
                alreadyOwnedSuppliers++;
                continue;
            }

            // Look for products linked to this supplier to deduce admin ownership
            const sampleProduct = await productModel.findOne({ supplier: supplier._id, adminId: { $ne: null } });
            if (sampleProduct && sampleProduct.adminId) {
                supplier.adminId = sampleProduct.adminId;
                await supplier.save();
                migratedSuppliers++;
                console.log(`  -> Linked supplier '${supplier.supplierName}' to Admin ${supplier.adminId} (deduced from products)`);
            } else if (admins.length === 1) {
                supplier.adminId = admins[0]._id;
                await supplier.save();
                migratedSuppliers++;
                console.log(`  -> Assigned supplier '${supplier.supplierName}' to sole Admin ${admins[0].email}`);
            } else {
                supplier.adminId = null;
                await supplier.save();
                unknownSuppliers++;
                console.warn(`  [!] Supplier '${supplier.supplierName}' has unknown ownership. Left inaccessible.`);
            }
        }

        console.log(`Suppliers summary: ${alreadyOwnedSuppliers} already owned, ${migratedSuppliers} migrated, ${unknownSuppliers} unknown/inaccessible.`);

        // 4. Migrate Staff Records
        console.log("\n[Staff] Checking staff admin assignments...");
        const staffList = await StaffModel.find();
        let assignedStaff = 0;
        let unassignedStaff = 0;

        for (const staff of staffList) {
            if (staff.adminId && adminIdSet.has(staff.adminId.toString())) {
                assignedStaff++;
            } else {
                // Independently registered staff retain adminId: null
                if (staff.adminId !== null) {
                    staff.adminId = null;
                    await staff.save();
                }
                unassignedStaff++;
            }
        }
        console.log(`Staff summary: ${assignedStaff} assigned to an admin, ${unassignedStaff} unassigned (independent).`);

        // 5. Migrate Transactions
        console.log("\n[Transactions] Checking transaction ownership...");
        const transactions = await TransactionModel.find();
        let migratedTransactions = 0;
        let alreadyOwnedTransactions = 0;
        let unknownTransactions = 0;

        for (const tx of transactions) {
            if (tx.adminId && adminIdSet.has(tx.adminId.toString())) {
                alreadyOwnedTransactions++;
                continue;
            }

            const cashier = await StaffModel.findById(tx.cashier);
            if (cashier && cashier.adminId) {
                tx.adminId = cashier.adminId;
                await tx.save();
                migratedTransactions++;
            } else if (admins.length === 1) {
                tx.adminId = admins[0]._id;
                await tx.save();
                migratedTransactions++;
            } else {
                tx.adminId = null;
                await tx.save();
                unknownTransactions++;
            }
        }
        console.log(`Transactions summary: ${alreadyOwnedTransactions} already owned, ${migratedTransactions} migrated, ${unknownTransactions} unknown.`);

        // 6. Ensure Indexes
        console.log("\n[Indexes] Building and verifying model indexes...");
        await productModel.syncIndexes();
        await StaffModel.syncIndexes();
        await supplierModel.syncIndexes();
        await TransactionModel.syncIndexes();
        await StaffInvitationModel.syncIndexes();
        console.log("Indexes synchronized successfully.");

        console.log("\n=================================================");
        console.log("Migration completed successfully!");
        console.log("=================================================");

    } catch (err) {
        console.error("Migration failed with error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Database disconnected.");
    }
};

if (require.main === module) {
    runMigration();
}

module.exports = runMigration;

