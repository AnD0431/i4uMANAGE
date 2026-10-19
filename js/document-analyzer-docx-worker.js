/* Raw text only: do not convert untrusted DOCX into executable HTML. */
importScripts('../vendor/analyzer/mammoth.browser.js');
self.onmessage = async event => {
    try {
        const result = await mammoth.extractRawText({arrayBuffer: event.data}, {externalFileAccess: false});
        if (result.value.length > 60000) throw new Error('Teks melebihi 60,000 aksara. Pecahkan dokumen kepada fail lebih kecil.');
        self.postMessage({text: result.value, warnings: result.messages.length});
    } catch (error) { self.postMessage({error: error.message || 'Fail Word tidak dapat dibaca.'}); }
};
