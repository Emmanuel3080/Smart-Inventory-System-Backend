
const jwt = require("jsonwebtoken")
const dotenv = require("dotenv");
const StaffModel = require("../Model/StaffModel");
dotenv.config()

const isStaffLoggedIn = async (req, res, next) => {
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
        const { id } = await jwt.verify(token, process.env.staffJwtSecret)

        const staff = await StaffModel.findById(id)
        if (!staff) {
            return res.status(404).json({
                Message: "Staff Not Found"
            })     
        }


        req.staff = staff

        next()




    } catch (error) {
        console.log(error);
        next(error)

    }
}

module.exports = isStaffLoggedIn