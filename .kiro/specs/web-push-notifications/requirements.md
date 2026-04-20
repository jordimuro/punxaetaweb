# Requirements Document

## Introduction

Afegir suport de Web Push Notifications a la web del club ciclista, amb una card de prova a la pàgina `/settings` que permeti al admin subscriure's i enviar notificacions push de prova. L'objectiu és validar la tecnologia en local abans de cap integració més àmplia.

## Glossary

- **Push_Service**: Servei extern (VAPID) que gestiona l'enviament de missatges push als navegadors
- **Service_Worker**: Script JavaScript que s'executa en segon pla al navegador i rep els missatges push
- **Subscription**: Objecte generat pel navegador quan un usuari accepta rebre notificacions, conté l'endpoint i les claus de xifrat
- **VAPID**: Voluntary Application Server Identification, estàndard per autenticar el servidor que envia notificacions push
- **Settings_Page**: La pàgina `/settings` de l'aplicació web
- **Notification_Card**: El component UI dins de Settings_Page dedicat a les notificacions push
- **Admin**: Usuari autenticat a l'aplicació

## Requirements

### Requirement 1: Configuració del Service Worker

**User Story:** Com a admin, vull que la web registri un service worker, per tal que el navegador pugui rebre notificacions push en segon pla.

#### Acceptance Criteria

1. WHEN l'aplicació es carrega, THE Service_Worker SHALL registrar-se al navegador si el navegador suporta service workers
2. IF el navegador no suporta service workers, THEN THE Settings_Page SHALL mostrar un missatge informatiu indicant que les notificacions no estan disponibles en aquest navegador
3. WHEN el service worker rep una notificació push, THE Service_Worker SHALL mostrar la notificació al sistema operatiu amb títol i cos del missatge

### Requirement 2: Subscripció a notificacions push

**User Story:** Com a admin, vull poder subscriure'm a les notificacions push des de la card de prova a settings, per tal de provar que el sistema funciona.

#### Acceptance Criteria

1. WHEN l'admin visita la Notification_Card i no està subscrit, THE Notification_Card SHALL mostrar un botó per subscriure's a les notificacions
2. WHEN l'admin fa clic al botó de subscripció, THE Push_Service SHALL sol·licitar permís al navegador per enviar notificacions
3. WHEN el navegador concedeix permís, THE Notification_Card SHALL guardar la Subscription al servidor i mostrar l'estat com a "subscrit"
4. IF el navegador denega el permís, THEN THE Notification_Card SHALL mostrar un missatge d'error explicant que cal concedir permís
5. WHEN l'admin ja està subscrit, THE Notification_Card SHALL mostrar un botó per cancel·lar la subscripció
6. WHEN l'admin cancel·la la subscripció, THE Notification_Card SHALL eliminar la Subscription del servidor i actualitzar l'estat a "no subscrit"

### Requirement 3: Enviament de notificació de prova

**User Story:** Com a admin, vull poder enviar una notificació push de prova des de settings, per tal de verificar que el sistema funciona correctament.

#### Acceptance Criteria

1. WHILE l'admin està subscrit, THE Notification_Card SHALL mostrar un camp de text i un botó per enviar una notificació de prova
2. WHEN l'admin introdueix un missatge i fa clic a enviar, THE Push_Service SHALL enviar una notificació push a la subscripció activa de l'admin
3. WHEN la notificació s'envia correctament, THE Notification_Card SHALL mostrar un missatge de confirmació
4. IF l'enviament falla, THEN THE Notification_Card SHALL mostrar el missatge d'error corresponent
5. IF el camp de text és buit, THEN THE Notification_Card SHALL deshabilitar el botó d'enviament

### Requirement 4: API del servidor

**User Story:** Com a sistema, vull tenir endpoints API per gestionar subscripcions i enviar notificacions, per tal que el client pugui comunicar-se amb el servidor de forma segura.

#### Acceptance Criteria

1. THE Push_Service SHALL exposar un endpoint per desar una nova Subscription
2. THE Push_Service SHALL exposar un endpoint per eliminar una Subscription existent
3. THE Push_Service SHALL exposar un endpoint per enviar una notificació de prova a una Subscription específica
4. WHEN es rep una petició als endpoints de Push_Service, THE Push_Service SHALL verificar que l'usuari està autenticat
5. THE Push_Service SHALL emmagatzemar les subscripcions a la base de dades SQLite existent
