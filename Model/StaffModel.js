
const mongoose = require("mongoose")

const staffSchema = new mongoose.Schema({
    firstName: {
        type: String, required: true
    },
    lastName: {
        type: String, required: true
    },
    email: {
        type: String, required: true, unique: true, lowercase: true, trim: true
    },
    password: {
        type: String, required: true, select: false
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
        index: true
    },
    role: {
        type: String,
        enum: ['admin', 'staff'],
        default: 'staff'
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

staffSchema.index({ adminId: 1, email: 1 });
staffSchema.index({ adminId: 1, isActive: 1 });
staffSchema.index({ adminId: 1, createdAt: -1 });

const StaffModel = mongoose.model("staff", staffSchema)
module.exports = StaffModel