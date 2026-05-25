Sinc Alarmas - versión corregida anulación remota

Cambios principales:
1. Cuando el emisor anula una alarma, se actualiza la misma alarma compartida en Firebase con estado "cancelled".
2. El receptor escucha el cambio en tiempo real y pasa automáticamente la alarma a ANULADA.
3. La anulación muestra el mensaje escrito por el emisor, por ejemplo "Llegué bien".
4. La alarma anulada no puede volver a sonar aunque llegue la fecha y hora programada.
5. Si la alarma estaba sonando y llega una anulación desde Firebase, se corta el sonido inmediatamente y desaparece el botón RECIBIDO.
6. Se ha añadido protección para que una copia antigua "pendiente" no pueda sobrescribir una alarma ya anulada o confirmada.

Requisitos:
- Los dos móviles deben usar la misma contraseña compartida.
- Los dos móviles deben estar emparejados con el DNI del otro móvil.
- Firebase Realtime Database debe estar activo y con reglas de prueba o reglas compatibles.
- La app debe abrirse desde un servidor web/HTTPS para sincronización real, por ejemplo GitHub Pages.

Archivo Firebase:
assets/js/firebase-config.js

