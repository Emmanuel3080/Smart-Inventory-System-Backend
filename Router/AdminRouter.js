

const express = require("express")
const { AdminSignUp, AdminSignIn, verifyToken } = require("../AdminAuth/Auth")
const uploadAdminProfile = require("../ImagesMiddleware/UploadAdminProfile")
const isAdminLoggedIn = require("../Middleware/IsLoggedIn")
const { AddSupplier, getSuppliers, getSingleSupplier } = require("../SupplierController/Supplier")
const isAdmin = require("../Middleware/isAdmin")
const { postProduct, getAllProduct, updateProduct, singleProduct, deleteproduct } = require("../ProductController/Product")
const uploadProductImage = require("../ImagesMiddleware/UploadProductImage")

const AdminRouter = express.Router()


AdminRouter.post("/signup", uploadAdminProfile.single("profileImage"), AdminSignUp)
AdminRouter.post("/signin", AdminSignIn)
AdminRouter.post("/verify_token", verifyToken)

                      

// Supplier
AdminRouter.post("/add_supplier", isAdminLoggedIn, AddSupplier)
AdminRouter.get("/supplier/:supplierId", isAdminLoggedIn, getSingleSupplier)
AdminRouter.get("/suppliers/all", isAdminLoggedIn, getSuppliers)



// Products
AdminRouter.post("/post_product", isAdminLoggedIn, isAdmin, uploadProductImage.single("productImage"), postProduct)
AdminRouter.get("/product/:productId", isAdminLoggedIn, isAdmin, singleProduct)
AdminRouter.get("/all/products", isAdminLoggedIn, isAdmin, getAllProduct)
AdminRouter.patch("/update_product/:id", isAdminLoggedIn, isAdmin, uploadProductImage.single("productImage"), updateProduct)
AdminRouter.delete("/delete_product/:productId", isAdminLoggedIn, isAdmin, deleteproduct)

module.exports = AdminRouter

                               