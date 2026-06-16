// Export public functions
module.exports = {
  sendSaleEmail,
  sendResetEmail,
  sendSecurityAlert,
  sendAdminAlert,
  sendDailyReportEmail: sendDailyReportEmailLegacy,
  // expose PDF generators if needed
  generateInvoicePDF,
  generateDailyReportPDF,
};
