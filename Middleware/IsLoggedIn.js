const AdminModel = require("../Model/AdminModel");

const jwt = require("jsonwebtoken")
const dotenv = require("dotenv")
dotenv.config()

const isAdminLoggedIn = async (req, res, next) => {
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


        // Verify the Token
        const { adminId } = await jwt.verify(token, process.env.adminJwtToken)

        const user = await AdminModel.findById(adminId)
        if (!user) {
            return res.status(404).json({
                Message: "User Not Found"
            })
        }


        req.user = user

        next()




    } catch (error) {
        console.log(error);
        next(error)

    }
}

module.exports = isAdminLoggedIn