// Google Apps Script: sirve la web de ajedrez como aplicación web.
// Implementar → Nueva implementación → Aplicación web → Acceso: "Cualquier usuario".
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('ChessEmu · Juega al ajedrez')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
