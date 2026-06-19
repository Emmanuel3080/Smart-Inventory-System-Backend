const supplierModel = require("../Model/SupplierModel");





const AddSupplier = async (req, res, next) => {
    try {
        const { supplierName, email, phoneNumber, address, companyName } = req.body;

        // if (!supplierName || !phoneNumber || !email || !address || !companyName) {
        //     return res.status(400).json({
        //         Message: "All fields are required",
        //         Status: "Error",
        //     });
        // }

        const existingSupplier = await supplierModel.findOne({ email });

        if (existingSupplier) {
            return res.status(409).json({
                Message: "Supplier already exists",
                Status: "Error",
            });
        }

        const supplier = await supplierModel.create({
            ...req.body    
        });           

        if (!supplier) {
            return res.status(400).json({
                Message: "Failed to create Supplier Profile",
                Status: "Error"
            })
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
        const suppliers = await supplierModel.find();

        if (!suppliers) {
            return res.status(404).json({
                Message: "Unable to fetch Supllier Details",
                Status: "Error"
            })
        }

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
        const { supplierId } = req.params;

        const supplier = await supplierModel.findById(supplierId);

        if (!supplier) {
            return res.status(404).json({
                Message: "Supplier not found",
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
}