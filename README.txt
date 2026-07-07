SINC ALARMAS - V12
==================

DESCRIPCIÓN
-----------
Sinc Alarmas permite emparejar dos móviles mediante Firebase para enviarse alarmas entre ellos.

Cada móvil tiene un DNI propio. Una vez emparejados, el emparejamiento queda guardado para futuras sesiones.

FUNCIONAMIENTO PRINCIPAL
------------------------
1. Sincronización inicial
   - Los dos móviles se emparejan usando la misma contraseña compartida y el DNI del otro móvil.
   - El emparejamiento queda guardado localmente.

2. Envío de alarma
   - Cualquier móvil puede ser emisor.
   - El emisor rellena día, hora y mensaje.
   - La alarma se guarda en Firebase y llega al receptor.

3. Pop inicial en el receptor
   - El receptor ve un aviso con el mensaje enviado, el día y la hora programada.
   - En ese mismo aviso aparece el seguimiento GPS del emisor.

4. GPS asociado a la alarma
   - Solo el móvil emisor obtiene su propia ubicación GPS.
   - El emisor sube una nueva posición a Firebase cada minuto mientras la alarma siga pendiente.
   - El receptor no usa su propio GPS para ese aviso.
   - El receptor solo lee de Firebase las posiciones del emisor.

5. Registros GPS
   - Cada registro muestra fecha, hora y coordenadas GPS del emisor.
   - Los registros aparecen en orden, con el más reciente arriba.
   - Los registros ya recibidos quedan guardados en el móvil receptor.

6. Llegada de la hora
   - Si la alarma sigue activa cuando llega la hora programada, el móvil receptor muestra el aviso de alarma y suena.

7. Anulación por el emisor
   - El emisor puede anular una alarma antes de la hora.
   - Al pulsar ANULAR ALARMA se abre una ventana para escribir un mensaje adjunto, por ejemplo: "He llegado bien".
   - Al pulsar ACEPTAR Y ENVIAR, la alarma cambia a ANULADA en Firebase, se envía el mensaje al receptor y la alarma ya no sonará.
   - Los registros GPS ya enviados no se eliminan.

8. Conservación y borrado manual
   - Aunque el emisor anule la alarma, los registros GPS recibidos permanecen visibles en el receptor.
   - El receptor puede borrar registros GPS uno a uno.
   - También puede usar BORRAR TODOS LOS REGISTROS para limpiar todos los registros visibles de esa alarma en su propio móvil.

NOTA SOBRE PERMISOS
-------------------
Para que el seguimiento funcione, el móvil emisor debe conceder permiso de ubicación y tener conexión suficiente para enviar datos a Firebase.
