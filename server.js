const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDatabase = require("./ConnectDatabase/DbConnect");
const handleError = require("./ErrorHandler/HandleError");

const AdminRouter = require("./Router/AdminRouter");
const StaffRoutes = require("./Router/StaffRoutes");
const StaffInvitationRouter = require("./Router/StaffInvitationRouter");
const AdminStaffRouter = require("./Router/AdminStaffRouter");

dotenv.config();

const app = express();
const port = process.env.PORTNUMBER || process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Primary Application Routes
app.use("/admin", AdminRouter);
app.use("/staff", StaffRoutes);

// Staff Invitation System (Exact required endpoint and alias)
app.use("/api/v1/staff/invitations", StaffInvitationRouter);
app.use("/staff/invitations", StaffInvitationRouter);

// Admin Staff Listing API
app.use("/api/v1/staff", AdminStaffRouter);

app.get("/", (req, res) => {
    res.send("Hello Ayomide");
});

// 404 Handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        Message: `${req.method} ${req.originalUrl} is not a valid endpoint on this server`,
        Status: "Error"
    });
});

// Centralized Error Handler
app.use(handleError);

if (require.main === module) {
    connectDatabase().then(() => {
        app.listen(port, () => {
            console.log(`Port Running at http://localhost:${port}`);
        });
    }).catch((err) => {
        console.error("Failed to connect to database:", err);
    });
}

module.exports = app;
