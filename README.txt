SINC ALARMAS - VERSION HTML INICIAL

FUNCIONAMIENTO
1. Abre index.html en los dos móviles.
2. En cada móvil entra en Menú > Emparejar.
3. Escribe la misma contraseña compartida y pulsa Conectar.
4. Empareja los móviles escaneando el QR del otro móvil o introduciendo su DNI manualmente.
5. En Menú > Ajustes puedes elegir color, modo 2D/3D y uno de los 5 sonidos.
6. En Menú > Enviar alarma eliges fecha/hora y nota.
7. El móvil receptor permanece en silencio hasta que llegue la hora.
8. Cuando llega la hora, el receptor suena y muestra el botón grande RECIBIDO.
9. Al pulsar RECIBIDO, se apaga la alarma y el móvil emisor recibe una ventana grande de confirmación.

IMPORTANTE SOBRE SINCRONIZACION REAL
Para sincronizar dos móviles usando datos móviles hace falta Firebase Realtime Database.
Rellena el archivo:
assets/js/firebase-config.js
con los datos de tu proyecto Firebase.

Mientras firebase-config.js esté vacío, la app funciona en modo local de prueba en el mismo dispositivo.

QR Y CAMARA
- La generación del QR usa internet.
- El escaneo por cámara puede no funcionar abriendo el archivo como file:// en algunos móviles.
- Si falla, usa el botón "Añadir DNI manual".
- Para escaneo real estable, conviene abrir la app desde HTTPS o empaquetarla después como APK/WebView.

NOTA SOBRE HTML
Esta versión está pensada para tener la app abierta en primer plano, con la pantalla encendida.
Para funcionamiento fiable con pantalla bloqueada haría falta versión Android nativa o WebView con permisos/notificaciones.
