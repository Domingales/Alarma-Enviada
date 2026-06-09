SINC ALARMAS V8
================

DESCRIPCIÓN GENERAL
-------------------
Sinc Alarmas es una aplicación diseñada para sincronizar alarmas entre dos móviles emparejados. Permite enviar una alarma de un dispositivo a otro, recibir confirmación automática de programación y mostrar avisos sonoros cuando llega la hora configurada.

Esta versión añade una función importante de seguridad: cuando un móvil envía una alarma, ese móvil publica su posición GPS cada minuto mientras la alarma siga pendiente. El receptor puede ver esos registros dentro de la ventana de alarma, con fecha, hora y localización.

OBJETIVO DE LA APP
------------------
La finalidad principal es ayudar a dos personas a mantenerse coordinadas mediante alarmas compartidas y, en caso de necesidad, permitir conocer la última posición conocida del móvil que envió la alarma.

Ejemplo de uso:
- Si la hija envía una alarma al padre, en el teléfono del padre se abre la alarma y aparece el seguimiento GPS minuto a minuto del móvil de la hija.
- Si el padre envía una alarma a la hija, en el teléfono de la hija aparece el seguimiento GPS minuto a minuto del móvil del padre.

FUNCIONES PRINCIPALES
---------------------
1. Emparejamiento de dos dispositivos mediante identificador propio.
2. Envío de alarmas al móvil emparejado.
3. Confirmación automática de que la alarma ha sido recibida y programada en el receptor.
4. Aviso sonoro cuando llega la hora de la alarma.
5. Botón RECIBIDO para confirmar manualmente que la alarma ha sido atendida.
6. Posibilidad de anular una alarma enviada antes de que suene.
7. Historial/listado de alarmas y actuaciones recientes.
8. Registro GPS local minuto a minuto desde la pantalla principal.
9. Seguimiento GPS remoto asociado a cada alarma pendiente.

SEGUIMIENTO GPS REMOTO EN ALARMAS
---------------------------------
Mientras una alarma enviada siga pendiente, el móvil emisor intentará registrar y enviar su posición GPS una vez por minuto.

Cada registro GPS incluye:
- Fecha.
- Hora.
- Latitud.
- Longitud.
- Precisión aproximada en metros.

En el móvil receptor, dentro de la ventana de alarma, se muestra:
- Último registro GPS recibido.
- Lista de registros ordenados del más reciente al más antiguo.

IMPORTANTE
----------
Para que el seguimiento GPS remoto funcione correctamente deben cumplirse estas condiciones:

1. El móvil emisor debe tener permiso de ubicación activado.
2. El móvil emisor debe tener conexión a internet.
3. Firebase debe estar correctamente configurado.
4. La app debe permanecer abierta o activa en el móvil emisor para poder seguir enviando posiciones.
5. La precisión GPS puede variar según cobertura, interiores, ahorro de batería y permisos del sistema.

REGISTRO GPS LOCAL
------------------
Además del GPS asociado a las alarmas, la pantalla principal mantiene un registro GPS local minuto a minuto.

Botones disponibles:
- ACTIVAR: inicia el registro GPS local.
- DESACTIVAR: detiene el registro GPS local.
- LIMPIAR: borra los registros GPS locales.
- ACTUALIZAR: guarda una posición GPS puntual en ese momento.

VERSIÓN
-------
V8

DESARROLLADOR
-------------
Aplicación desarrollada dentro del proyecto Sinc Alarmas.
