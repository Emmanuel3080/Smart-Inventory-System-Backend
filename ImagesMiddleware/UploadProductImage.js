
const { CloudinaryStorage } = require("multer-storage-cloudinary")

const multer = require("multer")
const cloudinary = require("../Cloudinary/cloudinarySetup")


const storage = new CloudinaryStorage({
    cloudinary: cloudinary,

    params: {
        folder: "Product Image",
        allowedFormat: ["jpg", "png", "gif", "jpeg"],
        transformation: [{ width: 500, height: 500 }],
    },
})

const uploadProductImage = multer({ storage });
module.exports = uploadProductImage;