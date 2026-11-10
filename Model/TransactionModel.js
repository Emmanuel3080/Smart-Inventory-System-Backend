const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null,
        index: true
    },
    cashier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'staff',
        required: true
    },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Products' },
        productName: String,
        quantity: Number,
        unitPrice: Number, // Cost price (for profit calculations later)
        sellingPrice: Number, // What they actually paid
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'Transfer'],
        required: true
    }
}, { timestamps: true });

const TransactionModel = mongoose.model('Transaction', transactionSchema);
module.exports = TransactionModel















