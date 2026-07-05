SINC ALARMAS - V10
===================

Aplicación para sincronizar alarmas entre dos móviles emparejados.

FUNCIONAMIENTO PRINCIPAL
------------------------

1. Un móvil envía o activa una alarma para el otro móvil.
2. El móvil receptor recibe la alarma y la muestra en pantalla como aviso emergente.
3. Mientras la alarma está activa, el móvil emisor registra su posición GPS cada minuto.
4. Cada posición GPS se guarda en Firebase asociada a esa alarma concreta.
5. El móvil receptor lee esos registros desde Firebase y los muestra dentro del aviso de alarma.
6. El último registro GPS aparece arriba de la lista.
7. Los registros ya recibidos permanecen guardados y visibles en el móvil receptor aunque el emisor desactive o anule la alarma.

OBJETIVO
--------

El objetivo es que, si una persona activa una alarma dirigida a otra, el receptor pueda ver en su teléfono la ubicación GPS del emisor minuto a minuto.

Ejemplo:

- Si la hija activa una alarma para el padre, en el teléfono del padre aparece la alarma y la lista de posiciones GPS de la hija.
- Si el padre activa una alarma para la hija, en el teléfono de la hija aparece la alarma y la lista de posiciones GPS del padre.

DATOS REGISTRADOS
-----------------

Cada registro GPS incluye:

- Fecha.
- Hora.
- Latitud.
- Longitud.
- Precisión aproximada.

IMPORTANTE
----------

La posición GPS que se muestra en el receptor corresponde al móvil que envió o activó la alarma, no al móvil que la recibe.

Si el emisor anula o desactiva la alarma:

- Se detiene el envío de nuevas posiciones.
- El aviso puede indicar que la alarma ha sido anulada.
- Los registros GPS que ya llegaron al receptor no se borran automáticamente.
- El receptor conserva el historial recibido en su teléfono.

REQUISITOS
----------

Para que el seguimiento GPS funcione correctamente:

- Ambos móviles deben estar emparejados.
- Firebase debe estar configurado.
- El móvil emisor debe tener permiso de ubicación.
- El móvil emisor debe tener conexión a internet para subir los registros.
- El móvil receptor debe tener conexión a internet para leer los registros.

VERSIÓN
-------

Versión: V10
