const express = require("express");
const isAdminLoggedIn = require("../Middleware/IsLoggedIn");
const isAdmin = require("../Middleware/isAdmin");
const { getAdminStaffList } = require("../StaffController/AdminStaffListing");

const AdminStaffRouter = express.Router();

// GET /api/v1/staff (Admin Only)
AdminStaffRouter.get("/", isAdminLoggedIn, isAdmin, getAdminStaffList);

module.exports = AdminStaffRouter;

