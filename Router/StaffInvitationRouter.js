const express = require("express");
const isAdminLoggedIn = require("../Middleware/IsLoggedIn");
const isAdmin = require("../Middleware/isAdmin");
const {
    createInvitation,
    verifyInvitation,
    acceptInvitation
} = require("../StaffController/StaffInvitation");

const StaffInvitationRouter = express.Router();

// POST /api/v1/staff/invitations (Admin only)
StaffInvitationRouter.post("/", isAdminLoggedIn, isAdmin, createInvitation);

// GET /api/v1/staff/invitations/verify/:token (Public)
StaffInvitationRouter.get("/verify/:token", verifyInvitation);

// POST /api/v1/staff/invitations/accept (Public)
StaffInvitationRouter.post("/accept", acceptInvitation);

module.exports = StaffInvitationRouter;

