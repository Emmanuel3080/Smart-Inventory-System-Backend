const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
            index: true,
        },

        supplierName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            trim: true,
            lowercase: true,
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

supplierSchema.index({ adminId: 1, email: 1 }, { unique: true, sparse: true });

const supplierModel = mongoose.model("Supplier", supplierSchema);
module.exports = supplierModel