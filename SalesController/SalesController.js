const mongoose = require("mongoose");
const productModel = require("../Model/ProductsModel");
const TransactionModel = require("../Model/TransactionModel");
const { getInventoryOwnerId } = require("../Middleware/InventoryAccess");

const processSale = async (req, res, next) => {
    let session = null;
    let inTransaction = false;

    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                message: "Access denied. You are an unassigned staff member and cannot process sales.",
                status: "error"
            });
        }

        const { items, paymentMethod } = req.body;
        const staffId = req.staff?._id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Cart items are required and cannot be empty",
                status: "error"
            });
        }

        const validPaymentMethods = ['Cash', 'Card', 'Transfer'];
        if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({
                message: `Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`,
                status: "error"
            });
        }

        // Validate item quantities and IDs up front
        for (const item of items) {
            const productId = item.productId || item._id;
            const quantity = Number(item.quantity);

            if (!productId) {
                return res.status(400).json({
                    message: "Each item must have a valid productId or _id",
                    status: "error"
                });
            }

            if (!Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({
                    message: `Invalid quantity for item ${item.productName || productId}. Quantity must be a positive integer.`,
                    status: "error"
                });
            }
        }

        // Step 1: Pre-verify product existence, ownership, and stock availability
        const verifiedItems = [];
        for (const item of items) {
            const productId = item.productId || item._id;
            const quantity = Number(item.quantity);

            const product = await productModel.findOne({ _id: productId, adminId: ownerId });
            if (!product) {
                return res.status(404).json({
                    message: `Product ${item.productName || productId} not found or does not belong to your assigned admin's inventory`,
                    status: "error"
                });
            }

            if (product.quantity < quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for '${product.productName}'. Available: ${product.quantity}, requested: ${quantity}`,
                    status: "error"
                });
            }

            verifiedItems.push({
                product,
                requestedQuantity: quantity
            });
        }

        // Attempt transaction support if replica set is available
        try {
            session = await mongoose.startSession();
            session.startTransaction();
            inTransaction = true;
        } catch (e) {
            session = null;
            inTransaction = false;
        }

        let calculatedGrandTotal = 0;
        const processedItems = [];
        const deductedRecords = []; // Tracks deductions for manual rollback if non-transactional

        try {
            for (const { product, requestedQuantity } of verifiedItems) {
                const updatedProduct = await productModel.findOneAndUpdate(
                    {
                        _id: product._id,
                        adminId: ownerId,
                        quantity: { $gte: requestedQuantity }
                    },
                    {
                        $inc: { quantity: -requestedQuantity }
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        ...(session ? { session } : {})
                    }
                );

                if (!updatedProduct) {
                    throw new Error(`Insufficient stock for '${product.productName}' during processing.`);
                }

                deductedRecords.push({
                    productId: product._id,
                    quantity: requestedQuantity
                });

                // Update product status (Out_of_Stock / Low_Stock / In_Stock)
                const minStock = updatedProduct.minimumStockLevel || 5;
                let newStatus = "In_Stock";
                if (updatedProduct.quantity <= 0) {
                    newStatus = "Out_of_Stock";
                } else if (updatedProduct.quantity <= minStock) {
                    newStatus = "Low_Stock";
                }

                if (updatedProduct.status !== newStatus) {
                    updatedProduct.status = newStatus;
                    await updatedProduct.save(session ? { session } : undefined);
                }

                const itemPrice = updatedProduct.sellingPrice || 0;
                const itemCost = updatedProduct.unitPrice || 0;
                const itemSubtotal = itemPrice * requestedQuantity;

                calculatedGrandTotal += itemSubtotal;

                processedItems.push({
                    product: updatedProduct._id,
                    productName: updatedProduct.productName,
                    quantity: requestedQuantity,
                    unitPrice: itemCost,
                    sellingPrice: itemPrice
                });
            }

            const [newTransaction] = await TransactionModel.create(
                [
                    {
                        adminId: ownerId,
                        cashier: staffId,
                        items: processedItems,
                        totalAmount: calculatedGrandTotal,
                        paymentMethod
                    }
                ],
                session ? { session } : undefined
            );

            if (inTransaction) {
                await session.commitTransaction();
            }

            return res.status(201).json({
                message: "Sale processed successfully",
                status: "success",
                transactionId: newTransaction._id,
                receipt: newTransaction
            });

        } catch (innerErr) {
            // Roll back transaction if available
            if (inTransaction && session) {
                await session.abortTransaction();
            } else {
                // Compensating rollback for standalone MongoDB
                for (const record of deductedRecords) {
                    await productModel.updateOne(
                        { _id: record.productId },
                        { $inc: { quantity: record.quantity } }
                    );
                }
            }
            return res.status(400).json({
                message: innerErr.message || "Sale failed during execution",
                status: "error"
            });
        }

    } catch (error) {
        console.error("Process Sale Error:", error);
        next(error);
    } finally {
        if (session) {
            session.endSession();
        }
    }
};

const getTransactions = async (req, res, next) => {
    try {
        const ownerId = getInventoryOwnerId(req);
        if (!ownerId) {
            return res.status(403).json({
                message: "Access denied. Admin inventory context required.",
                status: "error"
            });
        }

        const transactions = await TransactionModel.find({ adminId: ownerId })
            .populate("cashier", "firstName lastName email")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: "All Transactions fetched",
            status: "success",
            No_Of_Transactions: transactions.length,
            data: transactions
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

module.exports = { processSale, getTransactions };
