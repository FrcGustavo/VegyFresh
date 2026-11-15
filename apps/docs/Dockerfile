FROM node:24-bookworm-slim AS development
WORKDIR /repo
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@10.11.0 --activate
COPY packages/ui/package.json packages/ui/pnpm-lock.yaml packages/ui/
COPY apps/docs/package.json apps/docs/pnpm-lock.yaml apps/docs/
RUN (cd packages/ui && pnpm install --frozen-lockfile) \
  && (cd apps/docs && pnpm install --frozen-lockfile)
EXPOSE 5175
CMD ["sh", "-c", "cd /repo/apps/docs && pnpm run dev --host 0.0.0.0"]

FROM development AS build
COPY packages/ui packages/ui
COPY apps/docs apps/docs
RUN (cd packages/ui && pnpm run build) \
  && (cd apps/docs && pnpm run build)

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5175 HOST=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/docs/dist ./dist
USER node
EXPOSE 5175
CMD ["node", "-e", "const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),root=path.resolve('dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon'};http.createServer((req,res)=>{const rel=decodeURIComponent((req.url||'/').split('?')[0]);const candidate=path.resolve(root,'.'+rel);const target=candidate.startsWith(root)&&fs.existsSync(candidate)&&fs.statSync(candidate).isFile()?candidate:path.join(root,'index.html');fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream'});res.end(data);});}).listen(Number(process.env.PORT)||5175,process.env.HOST||'0.0.0.0');"]
