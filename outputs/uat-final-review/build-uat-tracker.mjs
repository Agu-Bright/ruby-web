import fs from 'node:fs/promises';
import { Workbook, SpreadsheetFile } from '@oai/artifact-tool';

const outputDir = 'C:/Users/DELL/Desktop/ruby-plus-web/outputs/uat-final-review';
const outputPath = `${outputDir}/RubyPlus_UAT_Tracker.xlsx`;

const rows = [
  [1, 'Meal portion sizes auto-selected', 'Customer app', 'Verified in code', 'Medium', 'Ready for device UAT', 'Size is single-select; it replaces the base price. Add-ons are added separately and retained in the order payload.'],
  [2, 'Wallet booking escrow payment fails', 'Customer app / Backend', 'UAT required', 'Critical', 'Test end-to-end', 'Code paths reviewed, but wallet booking payment must be tested through payment, escrow and booking confirmation.'],
  [3, 'Wallet balance stale after booking', 'Customer app', 'Verified in code', 'High', 'Ready for device UAT', 'Home and Pay share wallet cache with refresh and invalidation handling.'],
  [4, 'Quotations not downloadable', 'Customer app / Business app', 'UAT required', 'High', 'Test on physical device', 'Download action exists; confirm it downloads and opens a quotation on iOS and Android.'],
  [5, 'Saved cards missing for services', 'Customer app', 'Release blocker', 'High', 'Implement before release', 'Saved cards work for quotation payment but not direct service or room reservation checkout.'],
  [6, 'No opt-in to save cards', 'Customer app', 'Verified in code', 'Medium', 'Ready for device UAT', 'Save-card option is explicit and off by default where saved-card payment is implemented.'],
  [7, 'Bookings tab segments oversized', 'Business app', 'UAT required', 'Medium', 'Test on target devices', 'Confirm Upcoming, Active, Past and Cancelled segments fit and scroll correctly on small screens.'],
  [8, 'Platform and service fee errors', 'Customer app / Backend', 'UAT required', 'Critical', 'Test end-to-end', 'Only the category platform fee should apply to orders. Verify displayed and charged totals against admin fee settings.'],
  [9, 'Card payments missing from history', 'Customer app / Backend', 'UAT required', 'Critical', 'Test end-to-end', 'Confirm a successful card payment appears once in transaction history with the correct amount and status.'],
  [10, 'Merchant cannot cancel orders', 'Business app / Web / Backend', 'Verified in code', 'Critical', 'Ready for device UAT', 'Merchant cancellation refunds first. A terminal cancellation is not persisted if refund processing fails.'],
  [11, 'Home and Pay wallet balance mismatch', 'Customer app', 'Verified in code', 'High', 'Ready for device UAT', 'Both views read the shared wallet query and receive refresh/invalidation updates.'],
  [12, 'Applying points at checkout fails', 'Customer app / Backend', 'UAT required', 'High', 'Test end-to-end', 'Test a fresh unpaid order with a valid points balance and verify the discount and payment total.'],
  [13, 'OTP codes land in junk', 'Email delivery', 'External dependency', 'High', 'Verify domain email setup', 'Requires production checks for SPF, DKIM, DMARC and sending-provider reputation; cannot be confirmed by application code alone.'],
  [14, 'Play Store developer verification', 'Google Play Console', 'External dependency', 'High', 'Complete externally', 'Google account verification is outside the codebase and must be completed in Play Console.'],
  [15, 'Subcategories shown as categories', 'Customer app / Taxonomy', 'UAT required', 'Medium', 'Test taxonomy screens', 'Verify category and subcategory labels with current production taxonomy data.'],
  [16, 'Hotels and Shortlets 24/7 hours', 'Business app / Customer app / Backend', 'Verified in code', 'Medium', 'Ready for device UAT', '24/7 availability is supported during onboarding and settings, and displays correctly to customers.'],
  [17, 'Slow back-to-home navigation', 'Customer app', 'Verified in code', 'High', 'Ready for device UAT', 'Back navigation uses history first and avoids forced routing to Home.'],
  [18, 'Manual What’s Hot selection', 'Admin web / Backend', 'Verified in code', 'Medium', 'Deploy and UAT', 'Admin can add or remove a live business from What’s Hot. City-scoped featured businesses and advertisers remain included.'],
  [19, 'Long app loading time', 'Customer app / Backend', 'UAT required', 'High', 'Benchmark on real devices', 'Caching and deferred home loading are in place. Capture cold-start and home-ready timing on production-like networks.'],
  [20, 'Ruby+ Select posts link to profile', 'Customer app / Backend', 'UAT required', 'Medium', 'Test interaction', 'Open image and video posts and verify linked business posts route to the correct profile.'],
  [21, 'Optimize Ruby+ Select media', 'Backend / Customer app', 'UAT required', 'High', 'Benchmark media playback', 'Transcoding code exists. Verify upload processing, playback startup, buffering, image fallback and mobile data usage.'],
  [22, 'Sub-branches need no approval', 'Business app / Backend', 'UAT required', 'High', 'Test branch creation', 'Create a branch and confirm its approval path matches the agreed business rules without unintended admin gating.'],
  [23, 'DeoluAI response speed', 'Backend / Customer app', 'UAT required', 'Medium', 'Benchmark response time', 'Prompt caching, location reuse, short response limits and latency logging exist. Measure real response latency before sign-off.'],
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add('UAT Tracker');
sheet.showGridlines = false;

sheet.getRange('A1:G1').merge();
sheet.getRange('A1').values = [['Ruby+ UAT Final Review Tracker']];
sheet.getRange('A1:G1').format = {
  fill: '#111827',
  font: { name: 'Arial', size: 16, bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'left',
  verticalAlignment: 'center',
};
sheet.getRange('A1:G1').format.rowHeight = 28;
sheet.getRange('A2:G2').merge();
sheet.getRange('A2').values = [['Final code-review status. Update the UAT result and owner after testing each item.']];
sheet.getRange('A2:G2').format = {
  font: { name: 'Arial', size: 10, italic: true, color: '#4B5563' },
};

sheet.getRange('A4:C4').merge();
sheet.getRange('A4').values = [['Release decision: Not ready for full release']];
sheet.getRange('D4:E4').values = [['Total UAT items', '=COUNTA(A10:A32)']];
sheet.getRange('A5:C5').merge();
sheet.getRange('A5').values = [['Primary blocker: Saved cards missing from direct reservation checkout']];
sheet.getRange('D5:E5').values = [['Verified in code', '=COUNTIF(D10:D32,"Verified in code")']];
sheet.getRange('D6:E6').values = [['UAT required', '=COUNTIF(D10:D32,"UAT required")']];
sheet.getRange('D7:E7').values = [['Release blockers', '=COUNTIF(D10:D32,"Release blocker")']];
sheet.getRange('D8:E8').values = [['External dependencies', '=COUNTIF(D10:D32,"External dependency")']];

sheet.getRange('A4:C5').format = { fill: '#FFF7ED', font: { name: 'Arial', bold: true, color: '#9A3412' } };
sheet.getRange('D4:D8').format = { fill: '#E5E7EB', font: { name: 'Arial', bold: true, color: '#1F2937' } };
sheet.getRange('E4:E8').format = { fill: '#F9FAFB', font: { name: 'Arial', bold: true, color: '#111827' }, horizontalAlignment: 'center' };

const headers = [['ID', 'UAT point', 'Area', 'Final review status', 'Priority', 'Next action', 'Review notes']];
sheet.getRange('A9:G9').values = headers;
sheet.getRange('A9:G9').format = {
  fill: '#C9242B',
  font: { name: 'Arial', size: 10, bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
};
sheet.getRange(`A10:G${9 + rows.length}`).values = rows;
sheet.getRange(`A10:G${9 + rows.length}`).format = {
  font: { name: 'Arial', size: 10, color: '#111827' },
  verticalAlignment: 'top',
  wrapText: true,
};
sheet.getRange(`A10:A${9 + rows.length}`).format.horizontalAlignment = 'center';
sheet.getRange(`D10:F${9 + rows.length}`).format.horizontalAlignment = 'center';

const table = sheet.tables.add(`A9:G${9 + rows.length}`, true, 'UATTrackerTable');
table.style = 'TableStyleMedium2';

sheet.getRange(`D10:D${9 + rows.length}`).conditionalFormats.addCustom('=D10="Verified in code"', { fill: '#DCFCE7', font: { color: '#166534', bold: true } });
sheet.getRange(`D10:D${9 + rows.length}`).conditionalFormats.addCustom('=D10="UAT required"', { fill: '#FEF3C7', font: { color: '#92400E', bold: true } });
sheet.getRange(`D10:D${9 + rows.length}`).conditionalFormats.addCustom('=D10="Release blocker"', { fill: '#FEE2E2', font: { color: '#991B1B', bold: true } });
sheet.getRange(`D10:D${9 + rows.length}`).conditionalFormats.addCustom('=D10="External dependency"', { fill: '#E0E7FF', font: { color: '#3730A3', bold: true } });
sheet.getRange(`E10:E${9 + rows.length}`).conditionalFormats.addCustom('=E10="Critical"', { fill: '#FEE2E2', font: { color: '#991B1B', bold: true } });
sheet.getRange(`E10:E${9 + rows.length}`).conditionalFormats.addCustom('=E10="High"', { fill: '#FFEDD5', font: { color: '#9A3412', bold: true } });

sheet.getRange('A:A').format.columnWidth = 7;
sheet.getRange('B:B').format.columnWidth = 34;
sheet.getRange('C:C').format.columnWidth = 30;
sheet.getRange('D:D').format.columnWidth = 20;
sheet.getRange('E:E').format.columnWidth = 12;
sheet.getRange('F:F').format.columnWidth = 25;
sheet.getRange('G:G').format.columnWidth = 72;
sheet.getRange(`A10:G${9 + rows.length}`).format.rowHeight = 42;
sheet.getRange('A9:G9').format.rowHeight = 22;
sheet.freezePanes.freezeRows(9);

workbook.recalculate();
const inspected = await workbook.inspect({ kind: 'table', range: 'UAT Tracker!A4:G32', include: 'values,formulas', tableMaxRows: 30, tableMaxCols: 7 });
console.log(inspected.ndjson);
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 50 }, summary: 'final formula error scan' });
console.log(errors.ndjson);
const preview = await workbook.render({ sheetName: 'UAT Tracker', range: 'A1:G32', scale: 1.5, format: 'png' });
await fs.writeFile(`${outputDir}/uat-preview.png`, new Uint8Array(await preview.arrayBuffer()));
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);
console.log(outputPath);
