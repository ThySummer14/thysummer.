import Busboy from 'busboy';
import { ApiError } from './errors.js';

export const parseUploadForm = (req, { maxFileSize, allowedMimeTypes }) =>
  new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: maxFileSize,
        fields: 8,
      },
    });

    const fields = {};
    let pendingError = null;
    let uploadedFile = null;

    const rejectOnce = (error) => {
      if (!pendingError) {
        pendingError = error;
      }
    };

    busboy.on('field', (name, value) => {
      fields[name] = String(value ?? '');
    });

    busboy.on('file', (fieldName, file, info) => {
      if (fieldName !== 'file') {
        file.resume();
        return;
      }

      const { filename, mimeType } = info;
      if (!allowedMimeTypes.has(mimeType)) {
        rejectOnce(new ApiError(400, 'INVALID_FILE_TYPE'));
        file.resume();
        return;
      }

      const chunks = [];
      let hitSizeLimit = false;

      file.on('limit', () => {
        hitSizeLimit = true;
      });

      file.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      file.on('end', () => {
        if (hitSizeLimit) {
          rejectOnce(new ApiError(413, 'FILE_TOO_LARGE'));
          return;
        }

        uploadedFile = {
          filename,
          mimetype: mimeType,
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on('error', reject);

    busboy.on('finish', () => {
      if (pendingError) {
        reject(pendingError);
        return;
      }

      resolve({
        fields,
        file: uploadedFile,
      });
    });

    req.pipe(busboy);
  });
