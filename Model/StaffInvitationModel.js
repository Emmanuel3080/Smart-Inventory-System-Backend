const mongoose = require("mongoose");

const staffInvitationSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

staffInvitationSchema.index({ adminId: 1, email: 1 });

const StaffInvitationModel = mongoose.model("StaffInvitation", staffInvitationSchema);
module.exports = StaffInvitationModel;

