SINC ALARMAS - versión con anulación remota y registro

Cambios incluidos:
1. La alarma es un único registro compartido por Firebase.
2. Si el emisor pulsa ANULAR, el receptor recibe automáticamente el cambio de estado.
3. En el receptor se muestra:
   - mensaje original,
   - estado PENDIENTE -> ANULADA,
   - mensaje escrito al anular.
4. Una alarma anulada no suena nunca.
5. Si estaba sonando y llega una anulación remota, se corta el sonido y desaparece RECIBIDO.
6. La pantalla principal muestra alarmas y actuaciones recientes, no solo pendientes.
7. El registro completo conserva alarmas pendientes, anuladas y recibidas/confirmadas.
8. Cada registro finalizado incluye botón ELIMINAR REGISTRO. El borrado es local: solo desaparece en ese móvil.
9. No se permite eliminar una alarma pendiente para evitar que se pierda una alarma activa.
10. Se ha revisado el sistema de temas de color para que el cambio visual sea apreciable.
11. Imagen principal sustituida por una caricatura 3D con fondo transparente.
12. La opacidad de ventanas se controla desde Ajustes.

IMPORTANTE:
Para que dos móviles sin la misma WiFi sincronicen, Firebase debe estar configurado y activo.
El archivo de configuración está en:
assets/js/firebase-config.js

ACTUALIZACIÓN - CHECK VERDE DE RECEPCIÓN
----------------------------------------
Cuando un móvil recibe una alarma pendiente destinada a él, la guarda en local y envía automáticamente a Firebase la confirmación "recibida y programada".
El emisor verá un check verde ✅ en esa alarma cuando el receptor ya la tenga descargada y preparada.
Esto significa que, si después el receptor se queda sin cobertura, la alarma ya está en su móvil mientras la app siga abierta en primer plano.

CORRECCIÓN EXTRA - CHECK VERDE ROBUSTO
--------------------------------------
Se ha reforzado la confirmación automática del receptor:
1. Cuando el receptor detecta una alarma dirigida a su DNI, crea inmediatamente la confirmación local.
2. Después sube a Firebase una actualización parcial del mismo registro remoto: receiverProgrammedAt y receiverProgrammedBy.
3. La confirmación se reintenta cada 3 segundos mientras exista una alarma recibida pendiente sin confirmar.
4. El emisor muestra ✅ Recibida y programada en el otro móvil cuando Firebase devuelve esa confirmación.

ACTUALIZACIÓN - GPS DEL EMISOR MINUTO A MINUTO
-----------------------------------------------
Se añade el canal GPS asociado a cada alarma:
1. Cuando un móvil envía una alarma, ese móvil queda como EMISOR de la ubicación.
2. El emisor solicita permiso GPS y sube una posición a Firebase inmediatamente y después cada 60 segundos.
3. La ubicación se guarda en:
   pairs/{pairKey}/gpsLogs/{alarmId}/{timestamp}
4. El receptor NO usa su propio GPS para el pop. Solo lee de Firebase la ubicación subida por el emisor.
5. Al recibir una alarma pendiente, el receptor muestra un pop inicial sin sonido con:
   - mensaje enviado,
   - día programado,
   - hora programada,
   - estado de la alarma,
   - registros GPS del emisor.
6. Cada nuevo registro GPS aparece en el receptor con fecha, hora, coordenadas y precisión aproximada.
7. Cuando llega la hora programada, si la alarma sigue activa, se abre el pop de alarma y suena como antes, mostrando también el GPS recibido.
8. Si el emisor anula la alarma o el receptor la confirma como recibida, se detiene el envío/escucha GPS de esa alarma.

NOTA TÉCNICA:
El GPS del navegador/PWA necesita permisos de ubicación y normalmente requiere HTTPS. En móviles, el envío cada minuto es más fiable si la app permanece abierta en primer plano. Si Android/iOS suspende el navegador en segundo plano, puede retrasar o pausar las lecturas GPS.

ACTUALIZACIÓN - GPS POP V2 / CONFIRMACIÓN MÁS ROBUSTA
------------------------------------------------------
Esta revisión corrige el caso observado en pruebas donde el emisor quedaba en "Esperando confirmación de recepción del otro móvil..." y el receptor no mostraba el pop inicial.

Cambios técnicos:
1. Se añade versión visible en la línea superior: GPS-POP-v5-RECEPTOR-AUTO-20260708.
2. La línea superior muestra también el inicio del canal Firebase usado por la contraseña compartida.
   En los dos móviles debe aparecer el mismo canal.
3. El receptor reintenta subir a Firebase la confirmación "recibida y programada" si la primera actualización falla.
4. El pop inicial del receptor se comprueba también desde las alarmas locales cada 2 segundos, no solo en el instante exacto de llegada desde Firebase.
5. Se fuerza recarga de app.js y styles.css con parámetro de versión para evitar que GitHub Pages o el navegador sigan usando código antiguo en caché.
6. El cálculo del canal de Firebase usa un fallback SHA-256 real si el navegador no dispone de crypto.subtle, evitando rutas distintas entre móviles por la misma contraseña.

IMPORTANTE PARA PROBAR EN GITHUB PAGES:
Si se abre https://domingales.github.io/Alarma-Enviada/, esa página solo usará estos cambios después de subir al repositorio los archivos nuevos de este ZIP.
Hay que reemplazar, como mínimo:
- index.html
- assets/js/app.js
- assets/css/styles.css
- README.txt

Después de subirlos, abre la app en ambos móviles y comprueba arriba que aparece:
GPS-POP-v5-RECEPTOR-AUTO-20260708

Si en un móvil sigue apareciendo una versión anterior, hay que cerrar la pestaña, abrir de nuevo y borrar caché del sitio si fuese necesario.


CORRECCIÓN GPS-POP-v5-RECEPTOR-AUTO-20260708
- Añadido modo REST automático para Firebase Realtime Database.
- Si el móvil no carga el SDK externo de Firebase desde gstatic, la app ya no queda en modo local: sincroniza alarmas y GPS mediante fetch REST.
- La línea superior debe mostrar: Sincronización online activa (Firebase) o Sincronización online activa (REST). Si muestra Modo local, no hay conexión Firebase activa.


## Versión GPS-POP-v5-RECEPTOR-AUTO-20260708

Cambios añadidos:

- Se añade un botón explícito en la ventana "Enviar alarma" llamado "Autorizar GPS de este móvil".
- Este botón debe pulsarse en el móvil emisor, no en el receptor. El receptor no toma su ubicación; solo lee las coordenadas del emisor desde Firebase.
- Si el GPS está denegado, la alarma puede enviarse igualmente, pero el receptor no verá coordenadas hasta que el emisor permita la ubicación.
- La app muestra mensajes más claros si Firebase no permite escribir la alarma online.
- En iPhone, si el usuario ya denegó el permiso, puede ser necesario activarlo manualmente en Ajustes > Privacidad y seguridad > Localización > Safari/Sitios web.


V5 - Corrección receptor automático:
- El receptor acepta alarmas del móvil emparejado aunque el campo destino conserve un DNI antiguo.
- Si ocurre, corrige el destino localmente y sube confirmación a Firebase para que el emisor vea el check verde.
