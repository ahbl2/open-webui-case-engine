# Note attachment processing (Case Engine integration)

Case **Notes** attachments support a **Process attachment** flow: images can use **OCR**; other files call Case Engine **deterministic extraction** for **`.txt`**, **`.md`**, **`.docx`**, and **PDF** (text layer). Remaining types are stored as **`unsupported`**.

**UX:** The Notes page keeps **Process attachment** enabled for all non-image types so the API can record `unsupported` with a toast when needed.

**Backend:** `.docx` uses mammoth (`docx_mammoth_raw_text`). Parser advisories are returned as **`extraction_warnings`**; **`error_message`** is only for failed extraction. See P30-03 / migration 049 in the Case Engine repo.

**History / UX rationale:** `../DetectiveCaseEngine/docs/phases/phase_30/P30_NOTES_DOCX_PROCESS_ATTACHMENT_UX_AND_ROADMAP.md`
