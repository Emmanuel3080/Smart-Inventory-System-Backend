const productModel = require("../Model/ProductsModel");
const { getInventoryOwnerId } = require("../Middleware/InventoryAccess");

// Helper to escape special regex characters to prevent regex injection crashes
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const searchFilterProducts = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                message: "Access denied. You are an unassigned staff member and cannot access inventory.",
                status: "error"
            });
        }

        const { querys, productName, sku, category, minPrice, maxPrice, status, onlyInStock } = req.query;

        // Enforce inventory ownership: search only within assigned admin's inventory
        const query = { adminId: ownerId };

        if (querys) {
            const escaped = escapeRegex(querys.trim());
            query.$or = [
                { productName: new RegExp(escaped, "i") },
                { sku: new RegExp(escaped, "i") }
            ];
        }

        if (productName) {
            query.productName = new RegExp(escapeRegex(productName.trim()), "i");
        }
        if (sku) {
            query.sku = new RegExp(escapeRegex(sku.trim()), "i");
        }
        if (category) {
            query.category = new RegExp(`^${escapeRegex(category.trim())}$`, "i");
        }
        if (status) {
            query.status = status;
        }

        if (minPrice || maxPrice) {
            query.sellingPrice = {};
            if (minPrice) {
                query.sellingPrice.$gte = Number(minPrice);
            }
            if (maxPrice) {
                query.sellingPrice.$lte = Number(maxPrice);
            }
        }

        if (onlyInStock === 'true') {
            query.quantity = { $gt: 0 };
        }

        const products = await productModel.find(query)
            .populate("createdBy", "fullName email profileImage")
            .populate("supplier", "supplierName companyName")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Products Fetched",
            status: "Success",
            No_Of_Products: products.length,
            products
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

module.exports = searchFilterProducts;
