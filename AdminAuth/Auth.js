
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const AdminModel = require("../Model/AdminModel")
const dotenv = require("dotenv")
dotenv.config()

const AdminSignUp = async (req, res, next) => {



    const { password, fullName, email } = req.body

    if (!password || !fullName || !email) {
        return res.status(400).json({
            Message: "Missing or Incorrect Fields",
            Status: "Error"
        })
    }

    try {


        const adminProfileImage = req.file
        if (!adminProfileImage) {
            return res.status(400).json({
                Message: "No Image File Found",
                Status: "Error"
            })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const admin = await AdminModel.create({ ...req.body, password: hashedPassword, profileImage: adminProfileImage.path })

        if (!admin) {
            return res.status(400).json({
                Message: "Unable to Create Admin Profile",
                Status: "Error"
            })
        }


        const adminInfo = {
            fullName: admin?.fullName,
            email: admin?.email,
            id: admin._id,
            createdAt: admin?.createdAt,
            updatedAt: admin?.updatedAt,
            role: admin?.role,
            isActive: admin?.isActive,
            profileImage: admin?.profileImage
        }

        return res.status(201).json({
            Message: "Admin profile Created Sucessfully",
            Status: "Success",
            adminInfo
        })

    } catch (error) {
        console.log(error);
        next(error)

    }
}


const AdminSignIn = async (req, res, next) => {


    const { adminEmail, password } = req.body
    try {

        const admin = await AdminModel.findOne({ email: adminEmail }).select("+password")

        if (!admin) {
            return res.status(400).json({
                Message: "Email or password Incorrect",
                Status: "Error"
            })
        }     



        const isPasswordMatch = await bcrypt.compare(password, admin.password)
        if (!isPasswordMatch) {
            return res.status(400).json({
                Message: "Email or password Incorrect",
                Status: "Error"
            })
        }

        const adminInfo = {
            fullName: admin?.fullName,
            email: admin?.email,
            id: admin._id,
            createdAt: admin?.createdAt,
            updatedAt: admin?.updatedAt,
            role: admin?.role,
            isActive: admin?.isActive,
            profileImage: admin?.profileImage
        }


        const generateToken = await jwt.sign({ adminId: admin._id, adminEmail: admin.email }, process.env.adminJwtToken, { expiresIn: process.env.adminJwtExpiry })


        return res.status(200).json({
            Message: "Sign In Successful",
            Status: "Success",
            adminInfo,
            accesToken: generateToken
        })

    } catch (error) {
        console.log(error);
        next(error)

    }
}

const verifyToken = async (req, res, next) => {
    let token;
    try {

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1]
        }

        if (!token) {
            return res.status(404).json({
                Message: "Token Not Found",
                Status: "Error"
            })
        }


        // Check if Token has been Blacklisted

        // const isTokenBlacklisted = await blackListedTokenModel.findOne({ token: token })
        // if (isTokenBlacklisted) {
        //     return res.status(400).json({
        //         Message: "Token has been Blacklisted",
        //         Status: "Error"
        //     })
        // }

        // Verify the Token
        const { adminId } = await jwt.verify(token, process.env.adminJwtToken)

        const user = await AdminModel.findById(adminId)
        // if(!user){
        //     return res.status(404).json({
        //         Message : "User Not Found"
        //     })
        // }

        return res.status(200).json({
            Message: "Token is Valid",
            Status: "Success",
            user
        })


    } catch (error) {
        console.log(error);
        next(error)

    }
}

module.exports = {
    AdminSignUp,
    AdminSignIn,
    verifyToken
}