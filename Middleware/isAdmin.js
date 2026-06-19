const isAdmin = (req, res, next) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({
                message: "Unauthorized - no user found",
            });
        }

        if (user.role !== "super_admin") {
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


module.exports = isAdmin