
const { CloudinaryStorage } = require("multer-storage-cloudinary")

const multer = require("multer")
const cloudinary = require("../Cloudinary/cloudinarySetup")


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,

    params: {
        folder: "AdminProfileImage",
        allowedFormat: ["jpg", "png", "gif", "jpeg"],
        transformation: [{ width: 500, height: 500 }],
    },
})

const uploadAdminProfile = multer({ storage });
module.exports = uploadAdminProfile;      