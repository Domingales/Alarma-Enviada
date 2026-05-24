SINC ALARMAS - VERSION HTML
===========================

CAMBIOS DE ESTA VERSION
-----------------------
1. Revisados los botones del menu, paneles, emparejamiento, ajustes, envio y listado.
2. Corregido posible fallo de la contraseña en modo file:// cuando crypto.subtle no esta disponible.
3. Añadida lista visible de alarmas pendientes en la pantalla principal.
4. Añadido panel "Alarmas" con filtro de pendientes o todas.
5. Separado contador de pendientes para este movil y pendientes enviadas.
6. Añadida migracion desde la version anterior para no perder datos locales.
7. Añadido boton para copiar el DNI del movil.
8. Añadida validacion de fecha/hora futura.

IMPORTANTE
----------
La app puede probarse en local, pero para que dos moviles se sincronicen por internet hace falta configurar Firebase en:

assets/js/firebase-config.js

Hasta que Firebase no este configurado, la app guardara las alarmas solo en el dispositivo donde se crean.

PRUEBA BASICA
-------------
1. Abrir index.html.
2. Menu > Emparejar.
3. Escribir una contraseña compartida y pulsar Conectar.
4. Introducir el DNI del otro movil manualmente o por QR.
5. Menu > Enviar alarma.
6. Crear alarma con fecha/hora futura y nota.
7. Verla en "Alarmas pendientes" y en Menu > Alarmas.

Para sincronizacion real entre moviles, configurar Firebase Realtime Database.
