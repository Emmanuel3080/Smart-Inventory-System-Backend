const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            unique: true,

        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ["super_admin", "supervisor", "staff"],
            default: "super_admin",
        },

        profileImage: {
            type: String,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        // lastLogin: {
        //     type: Date,
        // },
    },
    {
        timestamps: true,
    }
);


const AdminModel = mongoose.model("Admin", adminSchema)

module.exports = AdminModel