const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Updates a bank/account balance by finding it by name.
 * Handles creating a bank entry if it doesn't exist.
 *
 * @param {number} companyId - The ID of the company
 * @param {string} paymentMode - The name of the bank/account (e.g., 'Cash', 'HDFC Bank')
 * @param {number} amount - The amount to update (must be positive)
 * @param {string} type - 'IN' (increases balance) or 'OUT' (decreases balance)
 * @param {object} tx - Optional Prisma transaction client
 * @param {string} remark - Optional remark for the bank transaction
 * @returns {Promise<object|null>} The updated bank record or null if paymentMode is 'Credit'
 */
const updateBankBalance = async (companyId, paymentMode, amount, type, tx = prisma, remark = 'Auto Bank Update') => {
    if (!paymentMode || paymentMode.toLowerCase() === 'credit' || paymentMode === '-') {
        return null;
    }
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount === 0) return null;

    let bank = await tx.bank.findFirst({
        where: {
            companyId: companyId,
            name: { equals: paymentMode }
        }
    });

    if (!bank) {
        bank = await tx.bank.create({
            data: {
                name: paymentMode,
                type: paymentMode.toLowerCase() === 'cash' ? 'Cash' : 'Bank',
                balance: 0,
                companyId: companyId
            }
        });
    }

    let balanceChange = 0;
    if (type === 'IN') {
        balanceChange = parsedAmount;
    } else if (type === 'OUT') {
        balanceChange = -parsedAmount;
    }

    if (balanceChange !== 0) {
        await tx.bankTransaction.create({
            data: {
               date: new Date(),
               toBankId: type === 'IN' ? bank.id : null,
               fromBankId: type === 'OUT' ? bank.id : null,
               amount: parsedAmount,
               remark: remark,
               companyId: companyId
            }
        });

        return await tx.bank.update({
            where: { id: bank.id },
            data: { balance: { increment: balanceChange } }
        });
    }
    return bank;
};

module.exports = { updateBankBalance };
