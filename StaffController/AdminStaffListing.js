const StaffModel = require("../Model/StaffModel");

// Safe regex escape helper
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * GET /api/v1/staff
 * Retrieve all staff accounts linked to the authenticated admin
 */
const getAdminStaffList = async (req, res, next) => {
    try {
        const adminId = req.user?._id;

        if (!adminId) {
            return res.status(401).json({
                message: "Unauthorized: Admin authentication required",
                status: "error"
            });
        }

        // Strict ownership: only query staff belonging to this admin
        // Unassigned staff (adminId: null) are never included
        const filter = {
            adminId: adminId
        };

        // 1. Search across firstName, lastName, and email
        if (req.query.search && typeof req.query.search === "string" && req.query.search.trim()) {
            const searchRegex = new RegExp(escapeRegex(req.query.search.trim()), "i");
            filter.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ];
        }

        // 2. Status filter: 'active' or 'inactive' (mapped to isActive)
        if (req.query.status !== undefined && req.query.status !== null && String(req.query.status).trim() !== "") {
            const statusStr = String(req.query.status).trim().toLowerCase();
            if (statusStr === "active" || statusStr === "true") {
                filter.isActive = true;
            } else if (statusStr === "inactive" || statusStr === "false") {
                filter.isActive = false;
            } else {
                return res.status(400).json({
                    message: "Invalid status parameter. Must be 'active' or 'inactive'.",
                    status: "error"
                });
            }
        }

        // 3. Pagination parameters with safe defaults
        const rawPage = parseInt(req.query.page, 10);
        const rawLimit = parseInt(req.query.limit, 10);

        const page = (!isNaN(rawPage) && rawPage > 0) ? rawPage : 1;
        const limit = (!isNaN(rawLimit) && rawLimit > 0 && rawLimit <= 100) ? rawLimit : 10;
        const skip = (page - 1) * limit;

        // 4. Sorting with whitelist and safe defaults
        const sortFieldWhitelist = {
            createdAt: "createdAt",
            firstName: "firstName",
            lastName: "lastName",
            email: "email",
            role: "role",
            isActive: "isActive",
            updatedAt: "updatedAt"
        };

        const sortBy = sortFieldWhitelist[req.query.sortBy] || "createdAt";
        const sortOrder = (req.query.sortOrder && String(req.query.sortOrder).toLowerCase() === "asc") ? 1 : -1;
        const sortOptions = { [sortBy]: sortOrder };

        // 5. Query database
        const totalRecords = await StaffModel.countDocuments(filter);
        const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

        // Project strictly safe fields (no password or sensitive fields)
        const staffDocs = await StaffModel.find(filter)
            .select("_id firstName lastName email role isActive adminId createdAt updatedAt")
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean();

        const staffList = staffDocs.map((s) => ({
            id: s._id,
            firstName: s.firstName,
            lastName: s.lastName,
            email: s.email,
            role: s.role,
            isActive: s.isActive,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt
        }));

        return res.status(200).json({
            message: "Staff accounts retrieved successfully",
            status: "success",
            staff: staffList,
            data: staffList,
            pagination: {
                totalRecords,
                currentPage: page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

    } catch (error) {
        console.error("Get Admin Staff List Error:", error);
        next(error);
    }
};

module.exports = {
    getAdminStaffList
};

