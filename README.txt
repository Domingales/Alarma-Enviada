SINC ALARMAS - V11
===================

DESCRIPCIÓN
-----------
Sinc Alarmas permite emparejar dos móviles mediante Firebase y enviar alarmas de un dispositivo a otro.

Cada móvil tiene un DNI/ID propio. Al emparejar dos móviles, uno puede crear una alarma dirigida al otro.

FUNCIONAMIENTO PRINCIPAL
------------------------
1. El emisor crea y envía una alarma al receptor.
2. El receptor recibe la alarma y se abre un aviso informativo.
3. En ese aviso aparece la hora programada por el emisor.
4. El móvil emisor registra su propia posición GPS cada minuto.
5. Cada registro GPS se guarda en Firebase asociado a esa alarma concreta.
6. El receptor lee de Firebase únicamente la posición GPS del emisor.
7. En el aviso del receptor se muestran los registros GPS acumulados, con el más reciente arriba.
8. Cuando llega la hora programada, se abre el aviso de alarma y suena.

REGISTRO GPS ASOCIADO A ALARMAS
--------------------------------
La aplicación tiene un solo sistema GPS: el GPS asociado a alarmas.

El receptor no registra ni muestra su propia ubicación dentro del aviso recibido.

Si una hija envía una alarma al padre:
- El móvil de la hija sube su GPS a Firebase cada minuto.
- El móvil del padre lee esos registros desde Firebase.
- El padre ve la fecha, la hora y las coordenadas GPS de la hija.

Si el padre envía una alarma a la hija:
- El móvil del padre sube su GPS a Firebase cada minuto.
- El móvil de la hija lee esos registros desde Firebase.
- La hija ve la fecha, la hora y las coordenadas GPS del padre.

DESACTIVACIÓN DE ALARMAS
------------------------
Si el emisor desactiva/anula la alarma:
- El emisor deja de enviar nuevos registros GPS.
- Los registros GPS ya recibidos permanecen visibles y guardados en el móvil receptor.
- No se borra el historial GPS asociado a esa alarma.

DATOS DE CADA REGISTRO GPS
--------------------------
Cada registro contiene:
- Fecha.
- Hora.
- Latitud.
- Longitud.
- Precisión aproximada.
- ID del emisor.
- ID de la alarma.

REQUISITOS
----------
- Firebase configurado en assets/js/firebase-config.js.
- Permiso de ubicación concedido en el móvil emisor.
- Conexión a Internet para sincronizar alarmas y GPS.
- Para GPS fiable, usar HTTPS o APK instalada.

NOTA IMPORTANTE
---------------
La precisión y disponibilidad del GPS dependen del dispositivo, los permisos, la cobertura y la configuración de ubicación del móvil emisor.
