# Implementation Plan: Web Push Notifications (Prova)

## Overview

Implementació incremental: primer la infraestructura (VAPID, BD, service worker), després els endpoints API, i finalment el component UI a `/settings`.

## Tasks

- [x] 1. Instal·lar dependències i generar claus VAPID
  - Instal·lar `web-push` i els seus tipus `@types/web-push`
  - Generar les claus VAPID amb `npx web-push generate-vapid-keys` i afegir-les a `.env.local`
  - _Requirements: 4.1, 4.3_

- [x] 2. Crear la taula de subscripcions i la llibreria de push
  - [x] 2.1 Crear la taula `push_subscriptions` a SQLite
    - Afegir la creació de la taula a `src/lib/database.ts` (o un fitxer de migracions inline)
    - Camps: `id`, `endpoint` (UNIQUE), `p256dh`, `auth`, `created_at`
    - _Requirements: 4.5_

  - [x] 2.2 Crear `src/lib/push.ts` amb les funcions de servidor
    - `savePushSubscription(sub: PushSubscriptionJSON): void`
    - `deletePushSubscription(endpoint: string): void`
    - `sendPushNotification(endpoint: string, title: string, body: string): Promise<void>`
    - `getVapidPublicKey(): string`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 2.3 Escriure property test per a les operacions de BD
    - **Property 1: Subscripció round-trip** — desar i consultar per endpoint retorna les mateixes dades
    - **Property 2: Cancel·lació elimina la subscripció** — després de deletePushSubscription, la subscripció no existeix
    - **Validates: Requirements 2.3, 2.6, 4.1, 4.2, 4.5**

- [x] 3. Crear el service worker
  - Crear `public/sw.js` que escolti l'event `push` i mostri la notificació amb `showNotification`
  - _Requirements: 1.1, 1.3_

- [x] 4. Crear els endpoints API
  - [x] 4.1 Crear `src/app/api/push/subscribe/route.ts` (POST)
    - Rep `{ subscription: PushSubscriptionJSON }`, crida `savePushSubscription`
    - _Requirements: 4.1, 4.4_

  - [x] 4.2 Crear `src/app/api/push/unsubscribe/route.ts` (DELETE)
    - Rep `{ endpoint: string }`, crida `deletePushSubscription`
    - _Requirements: 4.2, 4.4_

  - [x] 4.3 Crear `src/app/api/push/send/route.ts` (POST)
    - Rep `{ endpoint: string; title: string; body: string }`, crida `sendPushNotification`
    - _Requirements: 4.3, 4.4_

- [x] 5. Checkpoint — Verificar que els endpoints responen correctament
  - Assegurar que tots els tests passen, preguntar a l'usuari si sorgeixen dubtes.

- [x] 6. Crear el component PushNotificationCard
  - [x] 6.1 Crear `src/components/push-notification-card.tsx`
    - Gestionar els estats: `loading`, `unsupported`, `unsubscribed`, `subscribed`, `error`
    - Registrar el service worker en muntar el component
    - Mostrar botó de subscripció quan `unsubscribed`
    - Mostrar botó de cancel·lació i formulari d'enviament quan `subscribed`
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.4, 2.5, 2.6, 3.1, 3.3, 3.4, 3.5_

  - [x] 6.2 Escriure property test per al component
    - **Property 3: Botó d'enviament deshabilitat per text buit** — per a qualsevol string de sols espais, el botó ha d'estar deshabilitat
    - **Validates: Requirements 3.5**

- [x] 7. Integrar PushNotificationCard a la pàgina /settings
  - Afegir la card `<PushNotificationCard />` a `src/app/settings/page.tsx` dins la zona autenticada
  - _Requirements: 2.1, 3.1_

- [x] 8. Checkpoint final — Verificar el flux complet
  - Assegurar que tots els tests passen, preguntar a l'usuari si sorgeixen dubtes.

## Notes

- Les tasques marcades amb `*` són opcionals i es poden saltar per a un MVP ràpid
- Les claus VAPID s'han de generar una sola vegada i no s'han de cometre al repositori
- El service worker a `public/sw.js` és servit per Next.js automàticament a l'arrel
- L'auth és client-side, per tant les APIs no validen token de servidor
