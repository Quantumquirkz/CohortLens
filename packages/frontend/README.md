# CohortLens — Frontend

Aplicación **Next.js 14** (App Router) con **TypeScript**, **Tailwind CSS**, **Wagmi** + **Viem**, **TanStack React Query** y **Axios** para descubrir cohortes vía el backend FastAPI.

## Requisitos

- Node.js 18+
- Backend CohortLens en ejecución (por defecto `http://localhost:8000`) para probar el dashboard

## Instalación

```bash
cd packages/frontend
npm install
```

## Variables de entorno

Crea `.env.local` en este directorio (o define las variables en tu orquestador):

| Variable | Descripción |
| -------- | ----------- |
| `NEXT_PUBLIC_API_URL` | URL base del API. Por defecto: `http://localhost:8000`. El cliente llama a `{NEXT_PUBLIC_API_URL}/api/v1/cohorts/discover`. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | (Opcional, fases posteriores) ID de proyecto en [WalletConnect Cloud](https://cloud.walletconnect.com) si añades el conector WalletConnect. |

Ejemplo:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La home muestra el hero; la barra superior incluye navegación y **Connect Wallet** (Wagmi). El dashboard en `/dashboard` envía el formulario al endpoint de descubrimiento de cohortes.

## Estructura principal

- `app/` — rutas App Router, `layout.tsx`, `providers.tsx` (Wagmi + React Query), límites de error
- `components/ui/` — átomos (p. ej. `WalletButton`)
- `components/cohort/` — UI de dominio (`CohortTable`)
- `components/layout/` — cabecera compartida (`AppHeader`)
- `hooks/` — `useWallet`, `useCohortApi` (mutación React Query + Axios)
- `lib/` — configuración Wagmi y URL del API
- `types/` — DTOs alineados con el backend
- `styles/globals.css` — entrada Tailwind

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — compilación de producción (`output: "standalone"` para Docker)
- `npm run start` — sirve la build (`next start`)
- `npm run lint` — ESLint (requiere configuración local si `next lint` pide inicialización)

## Docker

Desde la raíz del monorepo:

```bash
docker compose up --build frontend
```

La imagen usa la salida `standalone` de Next.js y escucha en el puerto **3000**. Pasa `NEXT_PUBLIC_API_URL` si el backend no es accesible en `http://localhost:8000` desde el navegador (por ejemplo URL pública o nombre de servicio en la red Docker).

## Convenciones del proyecto

Las reglas de Cursor en la raíz del repositorio (`.cursorrules`) describen el stack, diseño atómico de componentes y convenciones de carpetas bajo `packages/frontend`.
