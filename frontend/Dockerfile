FROM node:20-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
EXPOSE 5173

# Commande par défaut
CMD ["npm", "run", "dev", "--", "--host"]
