const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
            required: true,
        },

        sku: {
            // [Brand]-[Category]-[Size]-[Number] : Unique code to idenity a product
            type: String,
            required: true,
            unique: true,
        },

        description: {
            type: String,
            required: true,
        },

        category: {
            type: String,
            enum: [
                "Electronics",
                "Groceries",
                "Clothing",
                "Furniture",
                "Pharmacy",
                "Stationery",
                "Accessories",
                "Other"
            ],
            required: true,
        },

        supplier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Supplier",
            required: true,
        },

        quantity: {
            // This represents how many units of a product are currently in stock
            type: Number,
            default: 0,
            min: 0,
        },

        unitPrice: {
            // This is the cost price — how much YOU (the business) buy the product from the supplier.
            type: Number,
            required: true,
            min: 0,
        },

        sellingPrice: {
            // This is the price you sell the product to customers for.
            type: Number,
            required: true,
            min: 0,
        },

        minimumStockLevel: {
            // It defines the lowest allowed quantity of a product before it is considered “low stock.”
            type: Number,
            default: 5,
        },

        expiryDate: {
            type: Date,
        },

        productImage: {
            type: String,
        },
        status: {
            type: String,
            enum: ["In_Stock", "Low_Stock", "Out_of_Stock"],
            default: "In_Stock",
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
        },

        // lastUpdatedBy: {
        //   type: mongoose.Schema.Types.ObjectId,
        //   ref: "Admin",
        // },
    },
    {
        timestamps: true,
    }
);


const productModel = mongoose.model("Products", productSchema)
module.exports = productModel