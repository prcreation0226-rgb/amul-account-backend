const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const XLSX = require('xlsx');

function parseCSV(csvText) {
  const lines = [];
  let currentVal = '';
  let inQuotes = false;
  let currentLine = [];

  // Handle potential byte order mark (BOM)
  if (csvText.charCodeAt(0) === 0xFEFF) {
    csvText = csvText.slice(1);
  }

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentLine.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n' || char === '\r') {
        currentLine.push(currentVal.trim());
        lines.push(currentLine);
        currentLine = [];
        currentVal = '';
        if (char === '\r' && nextChar === '\n') {
          i++; // Skip the \n in \r\n
        }
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal !== '' || currentLine.length > 0) {
    currentLine.push(currentVal.trim());
    lines.push(currentLine);
  }

  if (lines.length === 0) return [];

  const headers = lines[0].map(h => h.trim());
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const isEmptyLine = line.length === 0 || (line.length === 1 && line[0] === '');
    if (isEmptyLine) continue;

    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = line[j] !== undefined ? line[j] : '';
    }
    results.push(row);
  }

  return results;
}

const parsePrice = (value) => {
  if (value === undefined || value === null) return 0;
  const cleanVal = String(value).replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleanVal);
  return isNaN(parsed) ? 0 : parsed;
};

exports.handleGeneralImport = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded or file exceeds 5MB limit.' });
    }

    let { selectedTypes } = req.body;
    if (typeof selectedTypes === 'string') {
      try {
        selectedTypes = JSON.parse(selectedTypes);
      } catch(e) {
        selectedTypes = selectedTypes.split(',');
      }
    }
    
    if (!selectedTypes || selectedTypes.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one import type.' });
    }

    let results = [];
    const fileExtension = req.file.originalname ? req.file.originalname.split('.').pop().toLowerCase() : '';

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      results = XLSX.utils.sheet_to_json(sheet);
    } else {
      const csvText = req.file.buffer.toString('utf-8');
      results = parseCSV(csvText);
    }
    let importedCount = 0;

    try {
      if (selectedTypes.includes('Master')) {
         const customersToInsert = results.filter(r => r.name || r.Name).map(r => ({
           name: r.name || r.Name,
           phone: r.phone || r.Phone || null,
           companyId
         }));
         
         if (customersToInsert.length > 0) {
           const res = await prisma.customer.createMany({
             data: customersToInsert,
             skipDuplicates: true
           });
           importedCount += res.count;
         }
      }

      if (selectedTypes.includes('Product Master')) {
         const productsToInsert = results.filter(r => (r["Item Name"] || r.name || r.Name) && (r.SKU || r.sku || r.SKU)).map(r => {
           const variantsVal = String(r["Variants/IMEI"] || "").trim();
           const enableImei = variantsVal !== "" && variantsVal !== "-";
 
           const isBomVal = String(r["Is BOM"] || "").trim().toLowerCase();
           const hasBom = isBomVal === "yes" || isBomVal === "true";
 
           return {
             name: r["Item Name"] || r.name || r.Name,
             sku: String(r.SKU || r.sku || ""),
             barcode: r.Barcode || r.barcode ? String(r.Barcode || r.barcode) : null,
             category: r.Category || r.category || null,
             brand: r.Brand || r.brand || null,
             mrp: parsePrice(r.MRP || r.mrp),
             price: parsePrice(r["Sale Price"] || r.price),
             purchasePrice: parsePrice(r["Purchase Price"] || r.purchasePrice),
             stock: parseInt(String(r.Stock || r.stock || 0).replace(/[^0-9]/g, '')) || 0,
             enableImei: enableImei,
             hasBom: hasBom,
             companyId
           };
         });
 
         if (productsToInsert.length > 0) {
           const res = await prisma.product.createMany({
             data: productsToInsert,
             skipDuplicates: true
           });
           importedCount += res.count;
         }
      }

      res.json({
        success: true,
        message: `Successfully processed file.`,
        importedCount
      });

    } catch (dbError) {
      console.error("DB Error in import:", dbError);
      res.status(500).json({ success: false, message: 'Database error during import.', error: dbError.message });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during import.' });
  }
};
