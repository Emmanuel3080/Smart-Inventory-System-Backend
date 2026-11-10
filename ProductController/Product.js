const productModel = require("../Model/ProductsModel");
const supplierModel = require("../Model/SupplierModel");
const { getInventoryOwnerId } = require("../Middleware/InventoryAccess");

const postProduct = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                Message: "Access denied. Cannot create product without an Admin inventory context.",
                Status: "Error"
            });
        }

        const {
            productName,
            sku,
            description,
            category,
            quantity,
            unitPrice,
            sellingPrice,
            supplier,
            expiryDate,
            minimumStockLevel,
        } = req.body;

        const productImg = req.file;

        if (!productImg) {
            return res.status(400).json({
                Message: "Product image is required",
            });
        }

        if (!productName || !sku || !category || !unitPrice || !sellingPrice || !description || !supplier) {
            return res.status(400).json({
                Message: "Missing required product fields",
            });
        }

        // Supplier must belong to this admin's inventory
        const supplierExists = await supplierModel.findOne({ _id: supplier, adminId: ownerId });
        if (!supplierExists) {
            return res.status(404).json({
                Message: "Supplier not found or does not belong to your inventory",
                Status: "Error"
            });
        }

        // SKU must be unique for this admin's inventory
        const existingProduct = await productModel.findOne({ sku, adminId: ownerId });
        if (existingProduct) {
            return res.status(409).json({
                Message: "Product with this SKU already exists in your inventory",
                Status: "Error"
            });
        }

        const stockQty = Number(quantity) || 0;
        const minLevel = Number(minimumStockLevel) || 5;
        let productStatus = "In_Stock";
        if (stockQty <= 0) {
            productStatus = "Out_of_Stock";
        } else if (stockQty <= minLevel) {
            productStatus = "Low_Stock";
        }

        const product = await productModel.create({
            productName,
            sku,
            description,
            category,
            quantity: stockQty,
            unitPrice,
            sellingPrice,
            supplier,
            expiryDate,
            minimumStockLevel: minLevel,
            productImage: productImg.path,
            status: productStatus,
            createdBy: req.user ? req.user._id : ownerId,
            adminId: ownerId,
        });

        return res.status(201).json({
            Message: "Product created successfully",
            Status: "Success",
            product,
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};

const getAllProduct = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                Message: "Access denied. You are an unassigned staff member and cannot access inventory.",
                Status: "Error"
            });
        }

        const products = await productModel.find({ adminId: ownerId })
            .populate("createdBy", "fullName email profileImage")
            .populate("supplier", "supplierName companyName");

        return res.status(200).json({
            Message: "All Products Fetched Successfully",
            Status: "Success",
            No_Of_Products: products.length,
            products
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const updateProduct = async (req, res, next) => {
    const { id } = req.params;
    const ownerId = getInventoryOwnerId(req);

    if (!ownerId) {
        return res.status(403).json({
            Message: "Access denied. You do not have permission to manage this inventory.",
            Status: "Error"
        });
    }

    if (req.file) {
        req.body.productImage = req.file.path;
    }

    // Security: Do not allow reassigning product adminId or createdBy
    delete req.body.adminId;
    delete req.body.createdBy;

    try {
        // If supplier is being updated, verify it belongs to this admin
        if (req.body.supplier) {
            const supplierExists = await supplierModel.findOne({ _id: req.body.supplier, adminId: ownerId });
            if (!supplierExists) {
                return res.status(404).json({
                    Message: "Supplier not found or does not belong to your inventory",
                    Status: "Error"
                });
            }
        }

        // Recalculate status if quantity or minimumStockLevel is updated
        if (req.body.quantity !== undefined) {
            const qty = Number(req.body.quantity);
            const minLevel = req.body.minimumStockLevel !== undefined ? Number(req.body.minimumStockLevel) : 5;
            if (qty <= 0) {
                req.body.status = "Out_of_Stock";
            } else if (qty <= minLevel) {
                req.body.status = "Low_Stock";
            } else {
                req.body.status = "In_Stock";
            }
        }

        const product = await productModel.findOneAndUpdate(
            { _id: id, adminId: ownerId },
            req.body,
            { returnDocument: 'after', runValidators: true }
        );

        if (!product) {
            return res.status(404).json({
                Message: "Product Not Found or does not belong to your inventory",
                Status: "Error"
            });
        }

        return res.status(200).json({
            Message: "Product Updated Successfully",
            Status: "Success",
            product
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const singleProduct = async (req, res, next) => {
    const { productId } = req.params;
    const ownerId = getInventoryOwnerId(req);

    if (!ownerId) {
        return res.status(403).json({
            Message: "Access denied. You are an unassigned staff member and cannot access inventory.",
            Status: "Error"
        });
    }

    try {
        const product = await productModel.findOne({ _id: productId, adminId: ownerId })
            .populate("createdBy", "fullName email profileImage")
            .populate("supplier", "supplierName companyName");

        if (!product) {
            return res.status(404).json({
                Message: "Product Not Found",
                Status: "Error"
            });
        }

        return res.status(200).json({
            Message: "Product Fetched Successfully",
            Status: "Success",
            product
        });

    } catch (error) {
        console.log(error);
        next(error);
    }
};

const deleteproduct = async (req, res, next) => {
    const { productId } = req.params;
    const ownerId = getInventoryOwnerId(req);

    if (!ownerId) {
        return res.status(403).json({
            Message: "Access denied. You do not have permission to manage this inventory.",
            Status: "Error"
        });
    }

    try {
        const product = await productModel.findOneAndDelete({ _id: productId, adminId: ownerId });

        if (!product) {
            return res.status(404).json({
                Message: "Product Not Found or does not belong to your inventory",
                Status: "Error"
            });
        }

        return res.status(200).json({
            Message: "Product deleted successfully",
            Status: "Success"
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

module.exports = {
    postProduct,
    getAllProduct,
    singleProduct,
    updateProduct,
    deleteproduct
};
