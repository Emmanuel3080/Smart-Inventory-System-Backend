const productModel = require("../Model/ProductsModel");


const searchFilterProducts = async (req, res, next) => {
    try {
        const { querys, productName, sku, category, minPrice, maxPrice, status, onlyInStock } = req.query;
        const query = {};

        if (querys) {
            query.$or = [
                { productName: new RegExp(querys, "i") },
                { sku: new RegExp(querys, "i") }
            ];
        }

        if (productName) {
            query.productName = new RegExp(productName, "i");
        }
        if (sku) {
            query.sku = new RegExp(sku, "i")
        };
        if (category) {
            query.category = new RegExp(`^${category}$`, "i");
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

        const products = await productModel.find(query).populate("createdBy", "fullName email profileImage ").populate("supplier", "supplierName companyName").sort({ createdAt: -1 });

        if (products.length === 0) {
            return res.status(404).json({
                message: "No Products Found",
                status: "error"
            });
        }

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
module.exports = searchFilterProducts