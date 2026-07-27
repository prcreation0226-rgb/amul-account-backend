const axios = require('axios');

async function testSave() {
  const payload = {
    invoiceNo: "INV-123456789",
    customerId: 9, // Using customer 9 from earlier
    date: new Date().toISOString(),
    paymentMode: "Cash",
    remark: "",
    subTotal: 3457,
    totalDiscount: 0,
    freightCharges: 0,
    totalAmount: 3457,
    items: [
      {
        productId: 1, // dummy
        quantity: 1,
        freeQty: 0,
        price: 3457,
        discount1: 0,
        discount2: 0,
        imei: "",
        amount: 3457
      }
    ]
  };

  try {
    const res = await axios.post('http://localhost:5000/api/v1/inventory/sales', payload);
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Failed:", err.response ? err.response.data : err.message);
  }
}
testSave();
