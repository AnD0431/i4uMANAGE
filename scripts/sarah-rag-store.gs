// Deploy as a SEPARATE Apps Script project. Do not replace the existing document API.
// Script Properties: SARAH_RAG_TOKEN (random secret, >=32 characters), SARAH_RAG_FILE_ID.
// Keep the JSON file private in Drive. The script owner must have read access.
function ragJson_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return ragJson_({error: 'METHOD'}); }
function doPost(e) {
  try {
    var props = PropertiesService.getScriptProperties();
    var secret = props.getProperty('SARAH_RAG_TOKEN');
    var body = JSON.parse(e.postData.contents);
    if (!secret || secret.length < 32 || body.token !== secret || body.action !== 'read') {
      return ragJson_({error: 'UNAUTHORIZED'});
    }
    var file = DriveApp.getFileById(props.getProperty('SARAH_RAG_FILE_ID'));
    if (file.getSize() > 8 * 1024 * 1024) return ragJson_({error: 'TOO_LARGE'});
    var snapshot = JSON.parse(file.getBlob().getDataAsString('UTF-8'));
    if (snapshot.version !== 1 || !Array.isArray(snapshot.documents)) return ragJson_({error: 'INVALID_INDEX'});
    return ragJson_(snapshot);
  } catch (_) { return ragJson_({error: 'UNAVAILABLE'}); }
}
