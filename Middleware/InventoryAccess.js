/**
 * Inventory Ownership & Access Control Middleware
 * 
 * Rules:
 * - Admin: Owner ID is their own user ID (req.user._id).
 * - Assigned Staff: Owner ID is their assigned adminId (req.staff.adminId).
 * - Unassigned Staff: Deny inventory access with HTTP 403 Forbidden.
 */
const requireInventoryAccess = (req, res, next) => {
    try {
        if (req.user && req.user._id) {
            req.inventoryAdminId = req.user._id;
            return next();
        }

        if (req.staff) {
            if (!req.staff.adminId) {
                return res.status(403).json({
                    Message: "Access denied. You are an unassigned staff member and cannot access inventory until linked to an Admin.",
                    message: "Access denied. You are an unassigned staff member and cannot access inventory until linked to an Admin.",
                    Status: "Error",
                    status: "error",
                    code: "UNASSIGNED_STAFF"
                });
            }
            req.inventoryAdminId = req.staff.adminId;
            return next();
        }

        return res.status(401).json({
            Message: "Unauthorized: Authentication required to access inventory",
            message: "Unauthorized: Authentication required to access inventory",
            Status: "Error",
            status: "error"
        });
    } catch (error) {
        next(error);
    }
};

const getInventoryOwnerId = (req) => {
    if (req.inventoryAdminId) return req.inventoryAdminId;
    if (req.user && req.user._id) return req.user._id;
    if (req.staff && req.staff.adminId) return req.staff.adminId;
    return null;
};

module.exports = {
    requireInventoryAccess,
    getInventoryOwnerId
};

