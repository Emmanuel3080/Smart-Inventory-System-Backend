const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
    {
        productName: {
            type: String,
            required: true,
        },

        sku: {
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
            type: Number,
            default: 0,
            min: 0,
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        sellingPrice: {
            type: Number,
            required: true,
            min: 0,
        },

        minimumStockLevel: {
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

        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

productSchema.index({ adminId: 1, sku: 1 });
productSchema.index({ adminId: 1, category: 1 });
productSchema.index({ adminId: 1, status: 1 });

const productModel = mongoose.model("Products", productSchema)
module.exports = productModel