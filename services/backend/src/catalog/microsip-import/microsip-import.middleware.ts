import { json, type RequestHandler } from 'express';

const parseImport = json({ limit: '2mb' });

export const parseMicrosipImport: RequestHandler = (req, res, next) => {
  if (
    req.method !== 'POST' ||
    !/^\/api\/v1\/catalog\/microsip-import\/(preview|apply)\/?$/i.test(req.path)
  ) {
    return next();
  }

  parseImport(req, res, (error?: { status?: number }) => {
    if (!error) return next();

    const status = error.status === 413 ? 413 : 400;
    res.status(status).json({
      statusCode: status,
      message:
        status === 413
          ? 'Microsip catalog payload exceeds 2 MiB'
          : 'Invalid Microsip catalog payload',
    });
  });
};
