const express = require('express');
const multer = require('multer');
const { MarkItDown } = require('markitdown-ts');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const markitdown = new MarkItDown();

app.post('/process-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  try {
    const result = await markitdown.convert(req.file.path);
    const markdownText = result.markdown;

    // In a real scenario, this text would be parsed into a complete FHIR MedicalResource (e.g. Immunization, AllergyIntolerance) using LLM or structured extraction.
    // For MVP, we wrap the extracted text in a FHIR DocumentReference.
    const fhirResource = {
        "resourceType": "DocumentReference",
        "id": "doc-" + Date.now(),
        "status": "current",
        "docStatus": "final",
        "type": {
            "coding": [{
                "system": "http://loinc.org",
                "code": "11488-4",
                "display": "Consultation note"
            }]
        },
        "subject": {
            "reference": "Patient/1"
        },
        "content": [{
            "attachment": {
                "contentType": "text/plain",
                "data": Buffer.from(markdownText).toString('base64'),
                "title": "Extracted Medical Record"
            }
        }]
    };

    // Clean up
    fs.unlinkSync(req.file.path);

    // Return the FHIR JSON string as required by the native UpsertMedicalResourceRequest
    res.json({ fhirData: JSON.stringify(fhirResource) });
  } catch (error) {
    console.error("Error processing PDF:", error);
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`PDF processing server running on port ${PORT}`);
});
