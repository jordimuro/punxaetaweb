# Design Document: Web Push Notifications (Prova)

## Overview

Afegir suport de Web Push Notifications a la web del club ciclista, implementant una card de prova a `/settings`. L'objectiu és validar la tecnologia en local: registrar un service worker, subscriure's a notificacions push i enviar-ne una de prova des del panell d'admin.

L'autenticació existent és client-side (localStorage), per tant les APIs de push no requeriran token — estaran protegides per la mateixa convenció que la resta d'APIs del projecte (sense middleware de servidor).

## Architecture

```mermaid
graph TD
    A[Settings Page] --> B[PushNotificationCard component]
    B --> C[Service Worker registration]
    B --> D[/api/push/subscribe POST]
    B --> E[/api/push/unsubscribe DELETE]
    B --> F[/api/push/send POST]
    D --> G[(SQLite - push_subscriptions)]
    E --> G
    F --> H[web-push library]
    H --> I[Browser Push Service]
    I --> C
    C --> J[Notification shown to user]
```

## Components and Interfaces

### 1. Service Worker (`public/sw.js`)

Script estàtic a `public/` perquè Next.js el serveixi a l'arrel (`/sw.js`).

```js
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: 'Notificació', body: '' };
  event.waitUntil(
    self.registration.showNotification(data.title, { body: data.body })
  );
});
```

### 2. PushNotificationCard (`src/components/push-notification-card.tsx`)

Component client que gestiona tot el cicle de vida:
- Detecta suport del navegador
- Registra el service worker
- Gestiona l'estat de subscripció
- Mostra el formulari d'enviament

**Props**: cap (standalone)

**Estats interns**:
```ts
type PushState =
  | { status: 'loading' }
  | { status: 'unsupported' }
  | { status: 'unsubscribed' }
  | { status: 'subscribed'; subscription: PushSubscription }
  | { status: 'error'; message: string };
```

### 3. API Routes

#### `POST /api/push/subscribe`
Desa una subscripció nova a la BD.

Request body:
```ts
{ subscription: PushSubscriptionJSON }
```

Response: `{ ok: true }` | `{ ok: false, error: string }`

#### `DELETE /api/push/unsubscribe`
Elimina una subscripció de la BD per endpoint.

Request body:
```ts
{ endpoint: string }
```

Response: `{ ok: true }` | `{ ok: false, error: string }`

#### `POST /api/push/send`
Envia una notificació de prova a una subscripció específica.

Request body:
```ts
{ endpoint: string; title: string; body: string }
```

Response: `{ ok: true }` | `{ ok: false, error: string }`

### 4. Llibreria de Push (`src/lib/push.ts`)

Funcions de servidor per interactuar amb la BD i enviar notificacions:

```ts
function savePushSubscription(sub: PushSubscriptionJSON): void
function deletePushSubscription(endpoint: string): void
function sendPushNotification(endpoint: string, title: string, body: string): Promise<void>
function getVapidPublicKey(): string
```

## Data Models

### Taula SQLite: `push_subscriptions`

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### VAPID Keys

Les claus VAPID es generen una vegada i es desen com a variables d'entorn:

```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
```

Per generar-les s'usa `web-push generate-vapid-keys`.

## Correctness Properties

*Una propietat és una característica o comportament que ha de ser cert per a totes les execucions vàlides del sistema — essencialment, una declaració formal del que el sistema ha de fer. Les propietats serveixen de pont entre les especificacions llegibles per humans i les garanties de correcció verificables per màquines.*

### Property 1: Subscripció round-trip

*Per a qualsevol* subscripció push vàlida, desar-la i després consultar-la per endpoint ha de retornar les mateixes dades (endpoint, p256dh, auth).

**Validates: Requirements 2.3, 4.1, 4.5**

### Property 2: Cancel·lació elimina la subscripció

*Per a qualsevol* subscripció desada, cancel·lar-la ha de resultar en que ja no existeixi a la BD.

**Validates: Requirements 2.6, 4.2**

### Property 3: Botó d'enviament deshabilitat per text buit

*Per a qualsevol* string compost únicament d'espais en blanc (o buit), el botó d'enviament ha d'estar deshabilitat.

**Validates: Requirements 3.5**

### Property 4: Enviament crida l'API amb els paràmetres correctes

*Per a qualsevol* missatge vàlid (no buit), enviar una notificació ha de cridar l'endpoint `/api/push/send` amb el títol i cos correctes.

**Validates: Requirements 3.2**

## Error Handling

| Situació | Comportament |
|---|---|
| Navegador sense suport SW | Mostrar missatge "No disponible en aquest navegador" |
| Permís denegat | Mostrar missatge explicatiu |
| Error de xarxa en subscriure | Mostrar error i tornar a estat "no subscrit" |
| Error d'enviament | Mostrar missatge d'error inline |
| VAPID keys no configurades | Error 500 amb missatge descriptiu |

## Testing Strategy

### Dual Testing Approach

**Unit tests** (Jest/Vitest): casos específics, edge cases, condicions d'error.
**Property-based tests** (fast-check): propietats universals sobre les operacions de BD i el comportament del component.

### Property Test Configuration

- Mínim 100 iteracions per test de propietat
- Cada test referenciarà la propietat del disseny
- Format: `// Feature: web-push-notifications, Property N: <text>`

### Dependencies

- `web-push`: llibreria Node.js per enviar notificacions push via VAPID
- `fast-check`: llibreria de property-based testing per TypeScript
