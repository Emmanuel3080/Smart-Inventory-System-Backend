const handleDuplicateError = (err) => {
    if (!err.keyValue) {
        return {
            errMessage: "Duplicate field error",
            statusCode: 400,
        };
    }
    const errKey = Object.keys(err.keyValue)[0];
    const errValue = Object.values(err.keyValue)[0];

    const errMessage = `${errKey} of ${errValue} already exists`;

    return {
        errMessage,
        statusCode: 400,
    };
};

const handleValidateErr = (err) => {
    const errMessage = Object.values(err.errors).map(
        (validErr) => validErr.message
    );

    return {
        errMessage,
        statusCode: 400,
    };
};

const handleCastError = (err) => {
    const errMessage = `${err.value} is invaild in my ${err.kind} Field`;

    return {
        errMessage,
        statusCode: 400,
    };
};

const handleJsonWebTokenError = (err) => {
    const errMessage = `Inavaild Signature`;

    return {
        errMessage,
        statusCode: 400,
    };
};

const handleError = (err, req, res, next) => {
    //   res.json("Errororo");

    if (err.code === 11000) {
        const error = handleDuplicateError(err);
        res.status(error.statusCode).json({
            Message: error.errMessage,
            Status: "Error",
        });
    } else if (err.name == "CastError") {
        const error = handleCastError(err);
        res.status(error.statusCode).json({
            Message: error.errMessage,
            Status: "Error",
        });
    } else if (err.name == "JsonWebTokenError") {
        const error = handleJsonWebTokenError(err);
        res.status(error.statusCode).json({
            Message: error.errMessage,
            Status: "Error",
        });
    } else if (err.name === "ValidationError") {
        // console.log("djdjdjdj");

        const error = handleValidateErr(err);
        return res.status(error.statusCode).json({
            Message: error.errMessage,
            Status: "Error",
        });
    } else {
        return res.status(500).json({
            Message: "Something went wrong....",
            Status: "Error",
        });
    }
};

module.exports = handleError;
