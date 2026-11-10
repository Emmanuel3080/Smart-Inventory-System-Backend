const supplierModel = require("../Model/SupplierModel");
const { getInventoryOwnerId } = require("../Middleware/InventoryAccess");

const AddSupplier = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                Message: "Access denied. Cannot create supplier without an Admin inventory context.",
                Status: "Error"
            });
        }

        const { supplierName, email, phoneNumber, address, companyName } = req.body;

        if (!supplierName || !phoneNumber) {
            return res.status(400).json({
                Message: "Supplier name and phone number are required",
                Status: "Error",
            });
        }

        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        // Check if supplier exists for this admin
        if (normalizedEmail) {
            const existingSupplier = await supplierModel.findOne({ email: normalizedEmail, adminId: ownerId });
            if (existingSupplier) {
                return res.status(409).json({
                    Message: "Supplier with this email already exists in your inventory",
                    Status: "Error",
                });
            }
        }

        const supplier = await supplierModel.create({
            supplierName,
            email: normalizedEmail,
            phoneNumber,
            address,
            companyName,
            adminId: ownerId,
        });

        if (!supplier) {
            return res.status(400).json({
                Message: "Failed to create Supplier Profile",
                Status: "Error"
            });
        }

        return res.status(201).json({
            Message: "Supplier Profile created successfully",
            Status: "Success",
            supplier,
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};

const getSuppliers = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                Message: "Access denied. Cannot fetch suppliers without an Admin inventory context.",
                Status: "Error"
            });
        }

        const suppliers = await supplierModel.find({ adminId: ownerId });

        return res.status(200).json({
            Message: "Suppliers fetched successfully",
            Status: "Success",
            No_of_Suppliers: suppliers.length,
            suppliers,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const getSingleSupplier = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                Message: "Access denied. Cannot fetch supplier without an Admin inventory context.",
                Status: "Error"
            });
        }

        const { supplierId } = req.params;
        const supplier = await supplierModel.findOne({ _id: supplierId, adminId: ownerId });

        if (!supplier) {
            return res.status(404).json({
                Message: "Supplier not found or does not belong to your inventory",
                Status: "Error",
            });
        }

        return res.status(200).json({
            Message: "Supplier fetched successfully",
            Status: "Success",
            supplier,
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

module.exports = {
    AddSupplier,
    getSuppliers,
    getSingleSupplier
};
