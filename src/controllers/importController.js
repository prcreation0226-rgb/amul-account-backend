const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

    const csvText = req.file.buffer.toString('utf-8');
    const results = parseCSV(csvText);
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
         const productsToInsert = results.filter(r => (r.name || r.Name) && (r.sku || r.SKU)).map(r => ({
           name: r.name || r.Name,
           sku: r.sku || r.SKU,
           price: parseFloat(r.price || r.Price || 0),
           stock: parseInt(r.stock || r.Stock || 0),
           companyId
         }));

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
