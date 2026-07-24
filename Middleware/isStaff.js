const isStaff = (req, res, next) => {
    try {
        const staff = req.staff;

        if (!staff) {
            return res.status(401).json({
                message: "Unauthorized - no staff found",
            });
        }

        if (staff.role !== "staff") {
            return res.status(403).json({
                Message: "You are not authorized to perform this action",
            });
        }

        next();
    } catch (error) {
        console.log(error);
        next(error);
    }
};


module.exports = isStaff