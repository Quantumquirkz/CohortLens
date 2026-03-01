# CohortLens v2 — Reestructuración: Panel de Reputación Web3

> **Estado:** Planificado — pendiente de implementación  
> **Versión actual:** v1.0.0-Genesis (CRM Analytics)  
> **Versión objetivo:** v2.0.0-Reputation

---

## Resumen ejecutivo

CohortLens v1 es una plataforma CRM de analítica de clientes que combina segmentación K-Means, predicción de gasto y recomendaciones IA con infraestructura Web3. Sin embargo, la mezcla de ambos mundos genera una experiencia confusa: la navegación usa nombres crípticos, los datos principales son hardcodeados, y la parte Web3 —que es la más sólida técnicamente— queda enterrada bajo capas de CRM que no se conectan con ella.

**La decisión:** eliminar el CRM por completo y convertir CohortLens en lo que su infraestructura ya casi es: un **Panel de Reputación Web3**.

---

## El nuevo producto

### Concepto

> "Tu LinkedIn, pero on-chain y verificable."

Conectas tu wallet de Ethereum y obtienes una **tarjeta de identidad pública** que cualquier persona puede consultar en una URL. La reputación no la declaras tú: la construyen tus acciones on-chain y en la plataforma.

### La tarjeta de reputación

Cada wallet tiene un perfil público en `/profile/0x...` que muestra:

| Campo | Descripción | Fuente |
|---|---|---|
| **Tier** | BASIC / PRO / ENTERPRISE | NFT License en base de datos |
| **Risk Score** | Qué tan expuesto está tu portafolio DeFi | Cálculo sobre volatilidad + balance |
| **Credenciales ZK** | Atributos verificados sin revelar datos privados | ZkCredential verificadas |
| **Win Rate** | Porcentaje de aciertos en mercados de predicción | MarketBet resueltos |
| **Apuestas realizadas** | Historial de participación en mercados | MarketBet count |
| **NFTs recibidos** | Airdrops de lealtad acumulados | LoyaltyAirdrop count |
| **Miembro desde** | Fecha de primer registro de la wallet | User.createdAt |

---

## Por qué funciona con lo que ya existe

La infraestructura necesaria **ya está implementada** en el backend NestJS:

```
apps/api-ts/src/
├── auth/        ✓ SIWE completo (Sign-In With Ethereum, nonce, verify)
├── zk/          ✓ Verificación y almacenamiento de ZK-Proofs
├── nft/         ✓ Licencias por tier + airdrops de lealtad
├── predict/     ✓ AMM real con pools YES/NO y transacciones atómicas
├── defi/        ✓ Risk score por wallet + precios reales (CoinGecko)
└── prisma/      ✓ Schema con User, ZkCredential, NftLicense, DeFiPortfolio, MarketBet
```

El 80% del backend ya está escrito. Lo que falta es conectarlo correctamente.

---

## Problemas actuales que se corrigen

### 1. userId hardcodeado a `1` en todos los controladores

```typescript
// Estado actual — todos los usuarios ven los mismos datos
return this.zkService.verifyProof(1, ...);
return this.nftService.checkLicense(1);
return this.predictService.placeBet(1, ...);
```

**Corrección:** usar el `walletAddress` del JWT (`req.user.sub`) para hacer lookup del usuario real.

### 2. No existe endpoint de perfil público

No hay ningún endpoint que agregue todos los datos de reputación de una wallet en una sola respuesta. Se crea:

```
GET /api/v2/profile/:walletAddress   — público, sin JWT
GET /api/v2/profile/me               — privado, requiere JWT
```

### 3. El login SIWE no está conectado al backend

`login.tsx` simula el login con un `setTimeout` en vez de llamar al flujo real:

```typescript
// Estado actual — simulación falsa
setTimeout(() => setLocation('/dashboard'), 1500);
```

**Corrección:** implementar el flujo completo: `GET /nonce` → `signMessage` → `POST /verify` → guardar JWT.

### 4. ZK-Proof acepta cualquier string como válido

```typescript
// Cualquier string que empiece con "0x" pasa la validación
if (!proofHash.startsWith('0x') || proofHash.length < 10) {
    throw new BadRequestException('...');
}
```

**Corrección en v2:** usar SIWE como prueba de propiedad de wallet (ya implementado en `auth.service.ts`). Es suficiente para una primera versión creíble sin necesitar circom/snarkjs.

---

## Qué se elimina

### Backend — módulo completo

| Módulo | Razón |
|---|---|
| `apps/api-ts/src/analytics/` | CRM puro: predict-spending, segment K-Means, recomendaciones LLM |

### Frontend — páginas

| Página | Ruta | Razón |
|---|---|---|
| `sentinel.tsx` | `/dashboard/sentinel` | Datos hardcodeados, sin función real |
| `catalyst.tsx` | `/dashboard/catalyst` | Datos hardcodeados, sin función real |
| `axiom.tsx` | `/dashboard/axiom` | Datos hardcodeados, sin función real |
| `segment.tsx` | — | Segmentación K-Means CRM |
| `recommendations.tsx` | — | Recomendaciones de marketing |
| `audit.tsx` | — | Log de auditoría CRM |
| `reports.tsx` | — | Generación de reportes PDF/CSV |

### Frontend — rutas Express (`apps/web/server/routes.ts`)

`/api/predict`, `/api/segment`, `/api/recommendations`, `/api/drift`, `/api/reports`, `/api/audit`, `/api/consent`

---

## Qué se construye

### Backend

#### `ProfileModule` — nuevo

```
apps/api-ts/src/profile/
├── profile.module.ts
├── profile.controller.ts   — GET /api/v2/profile/:address y /me
└── profile.service.ts      — agrega ZkCredential + NftLicense + DeFiPortfolio + MarketBet
```

Respuesta del endpoint:

```json
{
  "wallet": "0x1234...abcd",
  "memberSince": "2025-01-15T00:00:00Z",
  "tier": "PRO",
  "tokenId": "0xabc123...PRO",
  "riskScore": 0.65,
  "portfolioValueUsd": 12400,
  "credentials": [
    { "credentialType": "EXECUTIVE_LEVEL", "verifiedAt": "2025-02-01T00:00:00Z" }
  ],
  "betsPlaced": 12,
  "winRate": "58%",
  "airdropsReceived": 3
}
```

### Frontend

#### `dashboard.tsx` — reemplazado

La pantalla principal pasa de ser el "Trinity Command Center" con datos falsos a ser la **tarjeta de reputación propia** del usuario autenticado.

#### `profile.tsx` — nuevo

Ruta `/profile/:address`. Perfil público sin autenticación. URL compartible. Misma tarjeta en modo lectura.

#### `login.tsx` — completado

Flujo SIWE real conectado al backend existente.

#### `layout.tsx` — navegación rediseñada

```
Mi Identidad
  → Mi Reputación          /dashboard
  → Credenciales ZK        /dashboard/credentials
  → Mis NFTs               /dashboard/web3

Mercados
  → Predicción             /dashboard/predict
  → Live Market            /dashboard/drift

Explorar
  → Buscar Wallet          /profile
```

---

## Flujo de usuario objetivo

```
1. Usuario entra a cohortlens.app
2. Hace clic en "Connect Wallet" → RainbowKit abre el selector
3. Firma el mensaje SIWE → recibe JWT
4. Ve su tarjeta de reputación en /dashboard
5. Comparte su URL pública /profile/0x... con quien quiera
6. Otros usuarios pueden ver su tier, win rate y credenciales sin registrarse
```

---

## Orden de implementación

| # | Tarea | Archivos afectados |
|---|---|---|
| 1 | Fixear userId hardcodeado | `zk.controller.ts`, `nft.controller.ts`, `predict.controller.ts` |
| 2 | Crear `ProfileModule` | `profile/` (nuevo) + `app.module.ts` |
| 3 | Completar login SIWE | `login.tsx` |
| 4 | Reemplazar dashboard | `dashboard.tsx` |
| 5 | Crear perfil público | `profile.tsx` (nuevo) + `App.tsx` |
| 6 | Limpiar navegación | `layout.tsx`, `App.tsx` |
| 7 | Eliminar módulos CRM | `analytics/`, páginas CRM |

---

## Stack — sin cambios

No se agrega ninguna dependencia nueva. Todo lo necesario ya está instalado:

- **wagmi** + **RainbowKit** — conexión de wallet y firma SIWE
- **viem** — interacciones Ethereum
- **Prisma** + **Neon PostgreSQL** — base de datos con todos los modelos necesarios
- **NestJS** — backend con todos los módulos Web3 ya creados
- **TanStack Query** — data fetching en el frontend
- **shadcn/ui** + **Tailwind** — componentes UI

---

*Documento creado: Febrero 2026*  
*Equipo: CohortLens Development Team*
