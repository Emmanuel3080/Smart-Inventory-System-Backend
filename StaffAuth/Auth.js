const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")

const dotenv = require("dotenv");
const StaffModel = require("../Model/StaffModel");
dotenv.config()


const RegisterStaff = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({
                message: "All fields are required (firstName, lastName, email, password)",
                status: "error"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        const existingStaff = await StaffModel.findOne({ email: normalizedEmail });
        if (existingStaff) {
            return res.status(400).json({
                message: "Email is already registered as a staff member."
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Security rule: Independently registered staff remain unassigned (adminId: null).
        // Never accept arbitrary adminId from request payload!
        const staff = await StaffModel.create({
            firstName,
            lastName,
            email: normalizedEmail,
            password: hashedPassword,
            adminId: null,
            role: "staff"
        });

        const staffInfo = {
            id: staff._id,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            adminId: staff.adminId,
            role: staff.role,
            isActive: staff.isActive,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        };

        return res.status(201).json({
            message: "Staff Profile Created successfully!",
            status: "success",
            newStaff: staffInfo
        });

    } catch (error) {
        console.log(error);
        next(error)
    }
};

const loginStaff = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "All Fields are Required"
            })
        }
        const staff = await StaffModel.findOne({ email }).select("+password");
        if (!staff) {
            return res.status(401).json({
                message: "Invalid email or password.",
                status: "error"
            });
        }

        if (!staff.isActive) {
            return res.status(403).json({
                message: "Account deactivated. Please see your system Administrator.",
                status: "error"
            });
        }

        const isMatch = await bcrypt.compare(password, staff.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password."
            });

        }
        const token = jwt.sign(
            { id: staff._id, Staffemail: staff.email },
            process.env.staffJwtSecret,
            { expiresIn: process.env.staffJwtExpiry }
        );



        const staffInfo = {
            id: staff._id,
            firstName: staff.firstName,
            lastName: staff.lastName,
            email: staff.email,
            adminId: staff.adminId,
            role: staff.role,
            isActive: staff.isActive,
            createdAt: staff.createdAt,
            updatedAt: staff.updatedAt,
        }




        
        return res.status(200).json({
            message: "Sign In  successful!",
            status: "success",
            staffInfo,
            token,
        });
    } catch (error) {
        console.log(error);
        next(error)
    }
};


const VerifyStaffJwt = async (req, res, next) => {
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
        const { id } = await jwt.verify(token, process.env.staffJwtSecret)

        const staff = await StaffModel.findById(id)
        if (!staff) {
            return res.status(404).json({
                Message: "Staff Not Found"
            })
        }

        return res.status(200).json({
            Message: "Token is Valid",
            Status: "Success",
            staff
        })








    } catch (error) {
        console.log(error);
        next(error)

    }
}




module.exports = {
    RegisterStaff,
    loginStaff,
    VerifyStaffJwt
}