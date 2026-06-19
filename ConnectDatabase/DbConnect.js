const mongoose = require("mongoose")
const dotenv = require("dotenv")
dotenv.config()

const mongoDburl = process.env.MongodbKey 
// impor

const connectDatabase = async()=>{
    console.log("Connecting...");
    try {
        const connect = await mongoose.connect(mongoDburl)
        if(connect){
            console.log("MongoDb Connected Successfully👩‍💻❤");
        }
    } catch (error) {                 
        console.log(error);
    }
   
}     

module.exports = connectDatabase