# Backend Dockerfile for Estimate Buddy
FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

# To build and push to Google Artifact Registry:
# 1. gcloud auth configure-docker REGION-docker.pkg.dev
# 2. docker build -t REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/estimate-buddy-backend:latest .
# 3. docker push REGION-docker.pkg.dev/PROJECT_ID/REPO_NAME/estimate-buddy-backend:latest

CMD ["node", "src/index.js"]
