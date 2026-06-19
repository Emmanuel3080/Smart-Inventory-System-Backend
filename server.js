// console.log ("Me")

const express = require("express")
const dotenv = require("dotenv")
const connectDatabase = require("./ConnectDatabase/DbConnect")

const morgan = require("morgan")
const handleError = require("./ErrorHandler/HandleError")
dotenv.config()
const cors = require("cors")
const AdminRouter = require("./Router/AdminRouter")
const app = express()


const port = process.env.PORTNUMBER
// console.log(port);






app.listen(port, () => {
    console.log(`Port Running at http://localhost:${port}`);
})

app.use(cors())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan("dev"))

app.use("/admin", AdminRouter)

app.get("/", (req, res) => {
    res.send("Hello Ayomide")
})

connectDatabase()



app.use("/{*any}", handleError)

app.all("/{*any}", (req, res) => {
    res.status(500).json({
        Message: `${req.method} ${req.originalUrl} is not a vaild endpoint on this server`,
    });
});      