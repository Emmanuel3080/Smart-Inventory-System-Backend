const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const StaffInvitationModel = require("../Model/StaffInvitationModel");
const StaffModel = require("../Model/StaffModel");

/**
 * POST /api/v1/staff/invitations
 * Admin-only: Create and issue a staff invitation
 */
const createInvitation = async (req, res, next) => {
    try {
        const { email } = req.body;
        const adminId = req.user?._id;

        if (!email) {
            return res.status(400).json({
                message: "Staff email is required",
                status: "error"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if an existing staff is already linked to an admin
        const existingStaff = await StaffModel.findOne({ email: normalizedEmail });
        if (existingStaff && existingStaff.adminId) {
            return res.status(400).json({
                message: "A staff account with this email is already assigned to an admin.",
                status: "error"
            });
        }

        // Generate a 32-byte secure random token
        const rawToken = crypto.randomBytes(32).toString("hex");

        // Compute SHA-256 hash for secure storage
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

        // 24 hour expiration
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Invalidate any previous unaccepted invitations for this email & admin
        await StaffInvitationModel.deleteMany({
            adminId,
            email: normalizedEmail,
            acceptedAt: null
        });

        const invitation = await StaffInvitationModel.create({
            adminId,
            email: normalizedEmail,
            tokenHash,
            expiresAt
        });

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const invitationUrl = `${frontendUrl}/staff/accept-invitation?token=${rawToken}`;

        return res.status(201).json({
            message: "Staff invitation created successfully",
            status: "success",
            invitationUrl,
            invitationLink: invitationUrl,
            invitationToken: rawToken, // Provided for direct linking/testing
            invitation: {
                id: invitation._id,
                email: invitation.email,
                adminId: invitation.adminId,
                expiresAt: invitation.expiresAt
            }
        });
    } catch (error) {
        console.error("Create Invitation Error:", error);
        next(error);
    }
};

/**
 * GET /api/v1/staff/invitations/verify/:token
 * Public: Validate an invitation token before accepting
 */
const verifyInvitation = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({
                message: "Invitation token is required",
                status: "error"
            });
        }

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await StaffInvitationModel.findOne({ tokenHash })
            .populate("adminId", "fullName email");

        if (!invitation) {
            return res.status(404).json({
                message: "Invalid invitation token",
                status: "error"
            });
        }

        if (invitation.acceptedAt) {
            return res.status(400).json({
                message: "Invitation has already been accepted",
                status: "error"
            });
        }

        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({
                message: "Invitation has expired",
                status: "error"
            });
        }

        return res.status(200).json({
            message: "Invitation token is valid",
            status: "success",
            invitation: {
                email: invitation.email,
                admin: invitation.adminId,
                expiresAt: invitation.expiresAt,
                createdAt: invitation.createdAt
            }
        });
    } catch (error) {
        console.error("Verify Invitation Error:", error);
        next(error);
    }
};

/**
 * POST /api/v1/staff/invitations/accept
 * Public: Accept an invitation, set name/password, and link staff to the admin
 */
const acceptInvitation = async (req, res, next) => {
    let session = null;
    let inTransaction = false;

    try {
        const { token, email, firstName, lastName, password } = req.body;

        if (!token || !email || !firstName || !lastName || !password) {
            return res.status(400).json({
                message: "Missing required fields: token, email, firstName, lastName, password",
                status: "error"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const invitation = await StaffInvitationModel.findOne({ tokenHash });

        if (!invitation) {
            return res.status(404).json({
                message: "Invalid invitation token",
                status: "error"
            });
        }

        if (invitation.acceptedAt) {
            return res.status(400).json({
                message: "Invitation has already been accepted",
                status: "error"
            });
        }

        if (new Date() > invitation.expiresAt) {
            return res.status(400).json({
                message: "Invitation has expired",
                status: "error"
            });
        }

        if (invitation.email !== normalizedEmail) {
            return res.status(400).json({
                message: "Provided email does not match the invitation email",
                status: "error"
            });
        }

        // Check if staff already exists and is already assigned
        const existingStaff = await StaffModel.findOne({ email: normalizedEmail });
        if (existingStaff && existingStaff.adminId) {
            return res.status(400).json({
                message: "A staff account with this email is already assigned to an admin",
                status: "error"
            });
        }

        // Hash staff password using existing bcrypt configuration
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Attempt MongoDB transaction if supported
        try {
            session = await mongoose.startSession();
            session.startTransaction();
            inTransaction = true;
        } catch (e) {
            session = null;
            inTransaction = false;
        }

        // Atomically mark invitation accepted (concurrency guard against double-acceptance)
        const updatedInvitation = await StaffInvitationModel.findOneAndUpdate(
            {
                _id: invitation._id,
                acceptedAt: null,
                expiresAt: { $gt: new Date() }
            },
            {
                acceptedAt: new Date()
            },
            { returnDocument: 'after', ...(session ? { session } : {}) }
        );

        if (!updatedInvitation) {
            if (inTransaction) await session.abortTransaction();
            return res.status(400).json({
                message: "Invitation could not be accepted. It may have expired or already been accepted.",
                status: "error"
            });
        }

        let staff;
        if (existingStaff) {
            // Independently registered staff previously unassigned: link them to this admin
            existingStaff.firstName = firstName;
            existingStaff.lastName = lastName;
            existingStaff.password = hashedPassword;
            existingStaff.adminId = invitation.adminId;
            existingStaff.isActive = true;
            staff = await existingStaff.save(session ? { session } : undefined);
        } else {
            const [newStaff] = await StaffModel.create(
                [
                    {
                        firstName,
                        lastName,
                        email: normalizedEmail,
                        password: hashedPassword,
                        adminId: invitation.adminId,
                        role: "staff",
                        isActive: true
                    }
                ],
                session ? { session } : undefined
            );
            staff = newStaff;
        }

        if (inTransaction) {
            await session.commitTransaction();
        }

        const staffInfo = {
            id: staff._id,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            adminId: staff.adminId,
            role: staff.role,
            isActive: staff.isActive,
            createdAt: staff.createdAt
        };

        return res.status(201).json({
            message: "Staff account created and linked to admin successfully!",
            status: "success",
            staff: staffInfo
        });
    } catch (error) {
        if (inTransaction && session) {
            try {
                await session.abortTransaction();
            } catch (abortErr) {
                console.error("Abort Transaction Error:", abortErr);
            }
        }
        console.error("Accept Invitation Error:", error);
        next(error);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

module.exports = {
    createInvitation,
    verifyInvitation,
    acceptInvitation
};
