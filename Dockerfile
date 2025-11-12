FROM node:lts-alpine
WORKDIR /app
# Copy package.json and package-lock.json (or yarn.lock) first to leverage Docker caching
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm run build
CMD ["npm", "run", "comp_start"]