const express = require("express");
const { AdminSignUp, AdminSignIn, verifyToken } = require("../AdminAuth/Auth");
const uploadAdminProfile = require("../ImagesMiddleware/UploadAdminProfile");
const isAdminLoggedIn = require("../Middleware/IsLoggedIn");
const isAdmin = require("../Middleware/isAdmin");
const { requireInventoryAccess } = require("../Middleware/InventoryAccess");
const { AddSupplier, getSuppliers, getSingleSupplier } = require("../SupplierController/Supplier");
const { postProduct, getAllProduct, updateProduct, singleProduct, deleteproduct } = require("../ProductController/Product");
const uploadProductImage = require("../ImagesMiddleware/UploadProductImage");
const { getTransactions } = require("../SalesController/SalesController");
const { getAdminStaffList } = require("../StaffController/AdminStaffListing");

const AdminRouter = express.Router();

AdminRouter.post("/signup", uploadAdminProfile.single("profileImage"), AdminSignUp);
AdminRouter.post("/signin", AdminSignIn);
AdminRouter.post("/verify_token", verifyToken);

// Staff Listing (Scoped to Admin)
AdminRouter.get("/staff", isAdminLoggedIn, isAdmin, getAdminStaffList);
AdminRouter.get("/staff/all", isAdminLoggedIn, isAdmin, getAdminStaffList);

// Supplier Routes (Scoped to Admin inventory)
AdminRouter.post("/add_supplier", isAdminLoggedIn, isAdmin, requireInventoryAccess, AddSupplier);
AdminRouter.get("/supplier/:supplierId", isAdminLoggedIn, isAdmin, requireInventoryAccess, getSingleSupplier);
AdminRouter.get("/suppliers/all", isAdminLoggedIn, isAdmin, requireInventoryAccess, getSuppliers);

// Products Routes (Scoped to Admin inventory)
AdminRouter.post("/post_product", isAdminLoggedIn, isAdmin, requireInventoryAccess, uploadProductImage.single("productImage"), postProduct);
AdminRouter.get("/product/:productId", isAdminLoggedIn, isAdmin, requireInventoryAccess, singleProduct);
AdminRouter.get("/all/products", isAdminLoggedIn, isAdmin, requireInventoryAccess, getAllProduct);
AdminRouter.patch("/update_product/:id", isAdminLoggedIn, isAdmin, requireInventoryAccess, uploadProductImage.single("productImage"), updateProduct);
AdminRouter.delete("/delete_product/:productId", isAdminLoggedIn, isAdmin, requireInventoryAccess, deleteproduct);

// Sales & Transactions (Scoped to Admin inventory)
AdminRouter.get("/all/transactions", isAdminLoggedIn, isAdmin, requireInventoryAccess, getTransactions);

module.exports = AdminRouter;
