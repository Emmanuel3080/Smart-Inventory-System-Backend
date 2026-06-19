const productModel = require("../Model/ProductsModel");
const supplierModel = require("../Model/SupplierModel");


const postProduct = async (req, res, next) => {
    try {
        const adminId = req?.user?._id;

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

        const supplierExists = await supplierModel.findById(supplier);
        if (!supplierExists) {
            return res.status(404).json({
                Message: "Supplier not found",
            });
        }

        const existingProduct = await productModel.findOne({ sku });
        if (existingProduct) {
            return res.status(409).json({
                Message: "Product with this SKU already exists",
                Status: "Error"
            });
        }

        const product = await productModel.create({
            productName,
            sku,
            description,
            category,
            quantity: quantity || 0,
            unitPrice,
            sellingPrice,
            supplier,
            expiryDate,
            minimumStockLevel,
            productImage: productImg.path,
            createdBy: adminId,
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
        const products = await productModel.find()

        if (products.length == 0 || !products) {
            return res.status(400).json({
                Message: "Unable to fetch all products",
                Status: "Error"
            })
        }


        return res.status(200).json({
            Message: "All Products Fetched Successfully",
            Status: "Success",
            No_Of_Products: products.length,
            products
        })
    } catch (error) {
        console.log(error);
        next(error)

    }
}



const updateProduct = async (req, res, next) => {

    const { id } = req.params;

    if (req.file) {
        req.body.productImage = req.file.path;
    }
    try {
        const updateData = { ...req.body }

        const product = await productModel.findByIdAndUpdate(id, updateData, { returnDocument: "after", runValidators: true })

        if (!product) {
            return res.status(400).json({
                Message: "Product Not Found, Unable to update product",
                Status: "Error"
            })
        }

        return res.status(200).json({
            Message: "Product Updated Successfully",
            Status: "Success",
            product
        })
    } catch (error) {
        console.log(error);
        next(error)

    }
}



const singleProduct = async (req, res, next) => {
    const { productId } = req.params
    try {
        const product = await productModel.findById(productId)

        if (!product) {
            return res.status(404).json({
                Message: "Product Not Found",
                Status: "Error"
            })
        }

        return res.status(200).json({
            Message: "Product Fetched Successfully",
            Status: "Success",
            product
        })

    } catch (error) {
        console.log(error);
        next(error)
    }
}

const deleteproduct = async (req, res, next) => {
    const { productId } = req.params
    try {
        const product = await productModel.findByIdAndDelete(productId)

        if (!product) {
            return res.status(400).json({
                Message: "Unable to delete Properties",
                Status: "Error"
            })
        }

        return res.status(200).json({
            Message: "Product deleted successfully",
            Status: "Success"
        })
    } catch (error) {
        console.log(error);
        next(error)

    }
}
module.exports = {
    postProduct,
    getAllProduct,
    singleProduct,
    updateProduct,
    deleteproduct

}