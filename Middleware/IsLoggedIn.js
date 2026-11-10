const AdminModel = require("../Model/AdminModel");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const isAdminLoggedIn = async (req, res, next) => {
    let token;
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                Message: "Unauthorized: Token Not Found",
                message: "Unauthorized: Token Not Found",
                Status: "Error",
                status: "error"
            });
        }

        // Check if token belongs to a staff account -> Deny with HTTP 403 Forbidden
        try {
            const isStaffToken = jwt.verify(token, process.env.staffJwtSecret);
            if (isStaffToken) {
                return res.status(403).json({
                    Message: "Forbidden: Staff accounts are not authorized to access admin resources.",
                    message: "Forbidden: Staff accounts are not authorized to access admin resources.",
                    Status: "Error",
                    status: "error",
                    code: "STAFF_FORBIDDEN"
                });
            }
        } catch (ignoredStaffErr) {
            // Not a staff token, continue with admin token verification
        }

        // Verify the Admin Token
        const { adminId } = await jwt.verify(token, process.env.adminJwtToken);

        const user = await AdminModel.findById(adminId);
        if (!user) {
            return res.status(404).json({
                Message: "User Not Found",
                message: "User Not Found",
                Status: "Error",
                status: "error"
            });
        }

        req.user = user;
        next();

    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({
                Message: error.message || "Invalid or Expired Token",
                message: error.message || "Invalid or Expired Token",
                Status: "Error",
                status: "error"
            });
        }
        console.log(error);
        next(error);
    }
};

module.exports = isAdminLoggedIn;
