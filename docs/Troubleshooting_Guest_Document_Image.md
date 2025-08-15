Guest document image not showing in Guest Details

Problem
- On the Guest Details modal, the "Guest document" image showed only the alt placeholder instead of the uploaded IC/passport photo.

Root cause
- In local/dev environments without cloud object storage configured, GET requests to `/objects/uploads/:id` were routed to the cloud object storage service, which throws due to missing `PRIVATE_OBJECT_DIR`. That resulted in 404/500 responses and the image failed to load.

Fix
- Added a local fallback in `server/routes.ts` for `/objects/uploads/:id` that serves files from the local `uploads/` directory when cloud storage access fails.
- Enhanced the Guest Details modal so the document image is clickable and opens a large preview.

Files changed
- `server/routes.ts`: In the `/objects/:objectPath(*)` handler, catch errors and, for paths under `/objects/uploads/`, attempt to stream `uploads/<id>` with `Content-Type` from `uploads/<id>.meta.json` if available.
- `client/src/components/guest-details-modal.tsx`: Wrap thumbnail in a button and add a secondary dialog to display the full-size image.

Verification
1) Perform a self check-in and upload an IC/passport image.
2) Open Guest Details; the thumbnail should display.
3) Click the thumbnail; a large preview dialog should open.

Notes
- In production with object storage configured, the original path continues to be served by the object storage service.

