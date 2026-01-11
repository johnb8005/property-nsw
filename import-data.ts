import { initDB, insertSales, calculateSuburbStats, getSalesCount } from "./db";

// Parse DAT file format
function parseDATContent(content: string, sourceFile: string) {
  const lines = content.trim().split("\n");
  const sales: any[] = [];

  for (const line of lines) {
    const parts = line.split(";");
    const recordType = parts[0];

    if (recordType === "B") {
      const streetNum = parts[7];
      const streetName = parts[8];
      const suburb = parts[9];
      const postcode = parts[10];
      const landArea = parseFloat(parts[11]) || 0;
      const contractDate = parts[13];
      const settlementDate = parts[14];
      const purchasePrice = parseInt(parts[15]) || 0;
      const zoneCode = parts[16];
      const propertyType = parts[17];
      const propertyDesc = parts[18];

      // Only include 2025 sales
      if (purchasePrice > 0 && settlementDate && settlementDate.startsWith("2025")) {
        sales.push({
          id: `${parts[2]}-${parts[3]}-${settlementDate}-${sourceFile}`,
          propertyId: parts[2],
          address: `${streetNum} ${streetName}`.trim(),
          suburb,
          postcode,
          landArea,
          contractDate,
          settlementDate,
          price: purchasePrice,
          zoneCode,
          propertyType,
          propertyDesc,
          pricePerSqm: landArea > 0 ? Math.round(purchasePrice / landArea) : null,
          sourceFile,
        });
      }
    }
  }

  return sales;
}

// Extract and import all data from ZIP
async function importFromZip(zipPath: string) {
  console.log("Initializing database...");
  initDB();

  const file = Bun.file(zipPath);
  if (!(await file.exists())) {
    console.error(`ZIP file not found: ${zipPath}`);
    return;
  }

  console.log("Loading ZIP file...");
  const JSZip = (await import("jszip")).default;
  const outerZip = await JSZip.loadAsync(await file.arrayBuffer());

  let totalSales = 0;
  let fileCount = 0;

  // Iterate through each weekly ZIP file
  for (const [filename, zipEntry] of Object.entries(outerZip.files)) {
    if (filename.endsWith(".zip") && !zipEntry.dir) {
      try {
        const innerZipData = await zipEntry.async("arraybuffer");
        const innerZip = await JSZip.loadAsync(innerZipData);

        // Iterate through DAT files in the weekly ZIP
        for (const [datFilename, datEntry] of Object.entries(innerZip.files)) {
          if (datFilename.endsWith(".DAT") && !datEntry.dir) {
            try {
              const content = await datEntry.async("string");
              const sales = parseDATContent(content, datFilename);

              if (sales.length > 0) {
                insertSales(sales);
                totalSales += sales.length;
                fileCount++;
                console.log(`  Imported ${sales.length} sales from ${datFilename}`);
              }
            } catch (e) {
              console.error(`Error parsing ${datFilename}:`, e);
            }
          }
        }
      } catch (e) {
        console.error(`Error processing ${filename}:`, e);
      }
    }
  }

  console.log(`\nImported ${totalSales} sales from ${fileCount} files`);

  console.log("\nCalculating suburb statistics...");
  calculateSuburbStats();

  const count = getSalesCount();
  console.log(`\nDatabase ready with ${count} sales records`);
}

// Run import
const zipPath = process.argv[2] || "./2025.zip";
console.log(`Importing data from: ${zipPath}\n`);
importFromZip(zipPath);
