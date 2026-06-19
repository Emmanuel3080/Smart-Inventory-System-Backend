const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
    {
        supplierName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            unique: true,
        },

        phoneNumber: {
            type: String,
            required: true,
        },

        address: {
            type: String,
        },

        companyName: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

const supplierModel = mongoose.model("Supplier", supplierSchema);
module.exports = supplierModel