# 🎷 Syncophonie — Quartet Scheduler

A scheduling app for a saxophone quartet. Each of the four players logs in, marks their morning/afternoon availability on a calendar, and can view everyone's availability in a single group view.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JWT (username + password) |
| Hosting | Azure Container Apps |
| Registry | Azure Container Registry |
| CI/CD | GitHub Actions |

---

## Running Locally

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Start everything

```bash
docker compose up --build
```

Open **http://localhost** in your browser.

### Default accounts

On first run, four player accounts are seeded automatically.  
**Initial password = username** — players should change this in Settings immediately.

| Username | Initial password |
|---|---|
| player1 | player1 |
| player2 | player2 |
| player3 | player3 |
| player4 | player4 |

---

## Local Development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env      # edit values as needed
npm install
npm run dev               # starts on http://localhost:3001
```

Requires a running PostgreSQL instance (see `backend/.env.example` for connection vars).

### Frontend

```bash
cd frontend
npm install
npm run dev               # starts on http://localhost:5173
```

The Vite dev server proxies `/api` calls to `http://localhost:3001`.

---

## Azure Setup (one-time)

### 1. Install the Azure CLI

```bash
brew install azure-cli   # macOS
az login
```

### 2. Create a Resource Group

```bash
RESOURCE_GROUP=syncophonie-rg
LOCATION=uksouth

az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 3. Create Azure Container Registry (ACR)

```bash
ACR_NAME=syncophonie   # must be globally unique; adjust if taken

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

### 4. Create a PostgreSQL Flexible Server

```bash
DB_SERVER=syncophonie-db
DB_ADMIN=syncoadmin
DB_PASSWORD=<choose-a-strong-password>

az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $DB_SERVER \
  --location $LOCATION \
  --admin-user $DB_ADMIN \
  --admin-password $DB_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $DB_SERVER \
  --database-name syncophonie
```

> 💡 The `--public-access 0.0.0.0` flag allows Azure services to connect. For production you should restrict this to the Container Apps environment's outbound IPs.

### 5. Create the Container Apps Environment

```bash
az containerapp env create \
  --name syncophonie-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### 6. Create the Backend Container App

```bash
ACR_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)
ACR_USER=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASS=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
DB_HOST=$(az postgres flexible-server show --resource-group $RESOURCE_GROUP --name $DB_SERVER --query fullyQualifiedDomainName -o tsv)

az containerapp create \
  --name syncophonie-backend \
  --resource-group $RESOURCE_GROUP \
  --environment syncophonie-env \
  --image $ACR_SERVER/syncophonie-backend:latest \
  --registry-server $ACR_SERVER \
  --registry-username $ACR_USER \
  --registry-password $ACR_PASS \
  --target-port 3001 \
  --ingress internal \
  --min-replicas 1 \
  --env-vars \
    DB_HOST=$DB_HOST \
    DB_PORT=5432 \
    DB_NAME=syncophonie \
    DB_USER=$DB_ADMIN \
    DB_PASSWORD=$DB_PASSWORD \
    DB_SSL=true \
    JWT_SECRET=<replace-with-a-strong-random-string> \
    PORT=3001
```

> ⚠️ Replace `<replace-with-a-strong-random-string>` with a securely generated value (e.g. `openssl rand -hex 32`).

### 7. Create the Frontend Container App

```bash
BACKEND_FQDN=$(az containerapp show \
  --name syncophonie-backend \
  --resource-group $RESOURCE_GROUP \
  --query properties.configuration.ingress.fqdn -o tsv)

az containerapp create \
  --name syncophonie-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment syncophonie-env \
  --image $ACR_SERVER/syncophonie-frontend:latest \
  --registry-server $ACR_SERVER \
  --registry-username $ACR_USER \
  --registry-password $ACR_PASS \
  --target-port 80 \
  --ingress external \
  --min-replicas 1
```

> 📝 After the frontend is created, update the nginx `proxy_pass` to point at the backend's internal FQDN, **or** set the backend's ingress to `external` during initial testing.

### 8. Point nginx at the real backend

Edit `frontend/nginx.conf`, replace `http://backend:3001` with the backend's internal Container Apps URL, then redeploy:

```
proxy_pass https://<backend-internal-fqdn>;
```

---

## GitHub Actions CI/CD

Add the following **repository secrets** in GitHub → Settings → Secrets → Actions:

| Secret | Value |
|---|---|
| `AZURE_CREDENTIALS` | JSON output from `az ad sp create-for-rbac --sdk-auth` |
| `AZURE_REGISTRY` | e.g. `syncophonie.azurecr.io` |
| `AZURE_REGISTRY_NAME` | e.g. `syncophonie` |
| `AZURE_RESOURCE_GROUP` | e.g. `syncophonie-rg` |

Generate the service principal:

```bash
az ad sp create-for-rbac \
  --name syncophonie-deploy \
  --role contributor \
  --scopes /subscriptions/<your-subscription-id>/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

Paste the entire JSON output as the `AZURE_CREDENTIALS` secret.

Every push to `main` will now build, push, and deploy both containers automatically.

---

## Changing Player Names

After first login, each player should:
1. Go to **Settings**
2. Update their **Display Name** (e.g. "Ruth – Alto Sax")
3. Change their password from the default

---

## Project Structure

```
.
├── backend/                  # Node.js/Express API
│   ├── src/
│   │   ├── db/               # Database init & seeding
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── routes/           # auth, users, availability
│   │   └── index.js
│   ├── Dockerfile
│   └── package.json
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── api/              # Axios client + AuthContext
│   │   ├── components/       # Layout, AvailabilityCalendar
│   │   └── pages/            # Login, Calendar, Group, Settings
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions CI/CD
└── docker-compose.yml        # Local development
```
