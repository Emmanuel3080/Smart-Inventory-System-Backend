
const mongoose = require("mongoose")

const staffSchema = new mongoose.Schema({
    firstName: {
        type: String, required: true
    },
    lastName: {
        type: String, required: true
    },
    email: {
        type: String, required: true, unique: true
    },
    password: {
        type: String, required: true, select: false
    },
    role: {
        type: String,
        enum: ['admin', 'staff'],
        default: 'staff'
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });


const StaffModel = mongoose.model("staff", staffSchema)
module.exports = StaffModel