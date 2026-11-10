const express = require("express");
const { RegisterStaff, loginStaff, VerifyStaffJwt } = require("../StaffAuth/Auth");
const isStaffLoggedIn = require("../Middleware/isStaffLoggedIn");
const isStaff = require("../Middleware/isStaff");
const { requireInventoryAccess } = require("../Middleware/InventoryAccess");
const { getAllProduct, singleProduct } = require("../ProductController/Product");
const searchFilterProducts = require("../StaffController/Staff");
const { processSale } = require("../SalesController/SalesController");

const StaffRoutes = express.Router();

// Independent Staff Authentication
StaffRoutes.post("/auth/signup", RegisterStaff);
StaffRoutes.post("/auth/signin", loginStaff);
StaffRoutes.post("/verify_jwt", VerifyStaffJwt);

// Products Routes (Enforce assigned Admin inventory access)
StaffRoutes.get("/all/products", isStaffLoggedIn, isStaff, requireInventoryAccess, getAllProduct);
StaffRoutes.get("/product/:productId", isStaffLoggedIn, isStaff, requireInventoryAccess, singleProduct);

// Search & Filter products (Scoped to assigned Admin inventory)
StaffRoutes.get("/products", isStaffLoggedIn, isStaff, requireInventoryAccess, searchFilterProducts);

// Process Sales (Scoped to assigned Admin inventory)
StaffRoutes.post("/process/sales", isStaffLoggedIn, isStaff, requireInventoryAccess, processSale);

module.exports = StaffRoutes;
