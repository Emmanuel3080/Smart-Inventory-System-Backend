const productModel = require("../Model/ProductsModel");
const TransactionModel = require("../Model/TransactionModel");

const processSale = async (req, res, next) => {
    try {
        const { items, paymentMethod } = req.body;
        const staffId = req.staff?._id;

        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "Cart cannot be empty"
            });

        }

        let calculatedGrandTotal = 0;
        const processedItems = [];

        for (const item of items) {
            // Fix: reference item._id since your cart items use _id
            const productId = item._id;

            const updatedProduct = await productModel.findOneAndUpdate(
                {
                    _id: productId,
                    quantity: { $gte: item.quantity }
                },
                {
                    $inc: { quantity: -item.quantity }
                },
                { returnDocument: "after" }
            );

            if (!updatedProduct) {
                return res.status(400).json({
                    message: `Sale failed. Insufficient stock or product not found for item: ${item.productName || 'Unknown'}`
                });
            }

            const itemPrice = updatedProduct.sellingPrice || 0;
            const itemCost = updatedProduct.unitPrice || 0;
            const itemSubtotal = itemPrice * item.quantity;

            calculatedGrandTotal += itemSubtotal;

            processedItems.push({
                product: updatedProduct._id,
                productName: updatedProduct.productName,
                quantity: item.quantity,
                unitPrice: itemCost,
                sellingPrice: itemPrice
            });
        }

        const newTransaction = await TransactionModel.create({
            cashier: staffId,
            items: processedItems,
            totalAmount: calculatedGrandTotal,
            paymentMethod
        });

        return res.status(201).json({
            message: "Sale processed successfully",
            transactionId: newTransaction._id,
            receipt: newTransaction
        });

    } catch (error) {
        console.error("Process Sale Error:", error);
        next(error);
    }
};


const getTransactions = async (req, res, next) => {
    try {
        const Transactions = await TransactionModel.find().populate("cashier", "firstName lastName email")
        if (!Transactions) {
            return res.status(400).json({
                message: "Unable to fetch Transactions",
                status: "error"
            })
        }

        return res.status(200).json({
            message: "All Transactions fetched",
            status: "success",
            No_Of_Transactions: Transactions.length,
            data: Transactions
        })
    } catch (error) {
        console.log(error);
        next(error)

    }
}

module.exports = { processSale, getTransactions };





