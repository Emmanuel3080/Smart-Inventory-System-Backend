
const express = require("express")
const { RegisterStaff, loginStaff, VerifyStaffJwt } = require("../StaffAuth/Auth")
const isStaffLoggedIn = require("../Middleware/isStaffLoggedIn")
const { getAllProduct, singleProduct } = require("../ProductController/Product")
const isStaff = require("../Middleware/isStaff")
const searchFilterProducts = require("../StaffController/Staff")
const { processSale } = require("../SalesController/SalesController")


const StaffRoutes = express.Router()




StaffRoutes.post("/auth/signup", RegisterStaff)
StaffRoutes.post("/auth/signin", loginStaff)

StaffRoutes.post("/verify_jwt", VerifyStaffJwt)


// Products Routes
StaffRoutes.get("/all/products", isStaffLoggedIn, isStaff, getAllProduct)
StaffRoutes.get("/product/:productId", isStaffLoggedIn, isStaff, singleProduct)

// Filter products
StaffRoutes.get("/products", isStaffLoggedIn, isStaff, searchFilterProducts)

// Process Sales
StaffRoutes.post("/process/sales", isStaffLoggedIn, isStaff, processSale)



module.exports = StaffRoutes