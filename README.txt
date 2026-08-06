ALARMAS LUCÍA
Versión: ALARMAS-LUCIA-v3.2-COMPROBACION-INMOVILIDAD-DIRECTA-20260806

DESCRIPCIÓN
Alarmas Lucía permite emparejar dos móviles, enviar alarmas programadas de un
dispositivo a otro y compartir, con autorización expresa del emisor, su
ubicación GPS durante el periodo en el que la alarma permanece activa.

La aplicación está pensada para situaciones familiares, de cuidado,
acompañamiento o seguridad en las que una persona necesita avisar a otra y
permitirle conocer su ubicación mientras se desarrolla el aviso.

CAMBIOS DE ESTA VERSIÓN

COMPROBACIÓN DE SEGURIDAD POR FALTA DE MOVIMIENTO
- La detección de inmovilidad se realiza exclusivamente en el móvil RECEPTOR,
  utilizando el tiempo y la distancia que ese receptor haya configurado.
- En el mismo instante en que el RECEPTOR confirma la falta de movimiento,
  crea en Firebase una comprobación dirigida específicamente al identificador
  del móvil EMISOR.
- La pregunta ya no depende de mezclar varios estados dentro del registro
  general de la alarma. Dispone de un canal Firebase independiente llamado
  wellbeingChecks, con identificador único, destinatario, confirmación de
  entrega, respuesta y confirmación de tratamiento.
- Con Firebase SDK la recepción es en tiempo real. Si el SDK no está disponible,
  existe un sondeo REST de respaldo cada segundo.
- Al recibir la comprobación, el EMISOR retira automáticamente la pantalla negra
  de AHORRO DE ENERGÍA, mantiene la pantalla activa y muestra por encima de
  cualquier ventana:
      ¿VA TODO BIEN?
      Se ha detectado falta de movimiento.
  con los botones SÍ en verde y NO en rojo.
- La app intenta además utilizar el puente nativo Android para encender la
  pantalla cuando dicho puente dispone de una función compatible. En modo web
  mantiene el bloqueo de pantalla y enfoca la pregunta inmediatamente.
- Si el EMISOR responde SÍ:
    1. Firebase registra la respuesta en el canal independiente.
    2. El RECEPTOR muestra «TRANQUILO, VA TODO BIEN.».
    3. El EMISOR recupera AHORRO DE ENERGÍA si estaba activo antes del aviso.
    4. Comienza un nuevo periodo completo de vigilancia.
- Si el EMISOR responde NO:
    1. El RECEPTOR muestra «¡ATENCIÓN! POSIBLE INCIDENCIA.».
    2. Se activa el sonido de alarma.
    3. Se activa la vibración.
    4. La pantalla alterna entre blanco y rojo.
    5. El botón SILENCIAR detiene sonido, vibración y parpadeo.
- Las respuestas pendientes se recuperan al volver a abrir o recargar la app.
- Cada comprobación queda bloqueada mientras está pendiente, evitando preguntas,
  respuestas o alarmas críticas duplicadas.
- Se conserva un espejo mínimo en el registro de la alarma para que el monitor
  de inmovilidad, la recuperación y las versiones anteriores sigan siendo
  compatibles, pero la entrega y la respuesta usan el canal independiente.

LIMITACIÓN DEL PAQUETE WEB/PWA
- El ZIP recibido y actualizado contiene la versión web/PWA de Alarmas Lucía.
- Mientras el EMISOR conserva la app visible y el ahorro de energía mantiene la
  pantalla encendida, la pantalla negra se retira inmediatamente al llegar la
  pregunta.
- Un navegador web no puede encender físicamente un teléfono que el usuario haya
  bloqueado manualmente ni reactivar una página suspendida por iOS. Para ese caso
  es necesario que el proyecto Android/iOS nativo incluya recepción push y una
  pantalla de aviso del sistema operativo.

RECEPCIÓN NATIVA CON LA APP CERRADA
- Este apartado solo es aplicable cuando estos archivos web se integran dentro
  del proyecto Android nativo. Ese proyecto Android no estaba incluido en el
  ZIP recibido.
- La aplicación Android nativa debe incorporar Firebase Cloud Messaging.
- El receptor puede recibir una alarma nueva o su anulación aunque MainActivity,
  la WebView y la interfaz no estén abiertas ni figuren en aplicaciones recientes.
- Cada móvil Android registra su token FCM bajo su identificador de dispositivo
  emparejado, de modo que la función de Firebase entrega el aviso al destinatario.
- El proyecto nativo puede incluir una Cloud Function que convierta los cambios de las alarmas en
  mensajes push de alta prioridad: nueva alarma, anulación, confirmación de
  recepción y finalización de la alarma.
- Al recibir una alarma con la app cerrada, Android programa inmediatamente la
  hora exacta, confirma la recepción en Firebase y activa la vigilancia de
  inmovilidad cuando corresponde.
- Al recibir una anulación, Android cancela la alarma programada, detiene el
  sonido activo y la vigilancia asociada, y muestra el aviso de anulación.
- Los sonidos de nueva alarma, cancelación y notificaciones generales respetan
  los controles independientes de AJUSTES. La vibración respeta su control
  general. Las notificaciones visuales permanecen visibles aunque el sonido se
  encuentre desactivado.
- Se crean canales nativos separados con sonido y silenciosos para que el aviso
  sonoro sea fiable incluso cuando Android inició el proceso únicamente para
  entregar el mensaje push.
- La sincronización REST en primer plano se conserva como sistema de respaldo.
- Se añade un vigilante nativo que comprueba el latido del servicio y solicita
  su recuperación si el fabricante del teléfono lo ha eliminado.
- Se evita que FCM y la sincronización REST muestren dos veces el mismo evento.
- Tras reinicios y actualizaciones se recuperan el registro push, la
  sincronización y el vigilante automático.

FORMATO DE LA NOTIFICACIÓN DE ANULACIÓN
- El texto incorrecto «El emisor ha anulado: [mensaje]» se elimina.
- Debajo de «Alarma anulada» se muestra únicamente la fecha y la hora reales de
  la anulación con el formato DD/MM/AAAA HH:MM.
- Se utiliza cancelledAt; para alarmas antiguas sin ese dato se usa updatedAt y,
  como último respaldo, la hora en la que el receptor recibió el aviso.

ACTIVACIÓN FIREBASE NATIVA
- Estas instrucciones se refieren al proyecto Android externo, no incluido en
  este ZIP web/PWA.
- El propietario del proyecto debe registrar en Firebase la aplicación Android
  com.domingales.alarmaslucia y copiar su mobilesdk_app_id en
  res/values/firebase_push_config.xml.
- Si el proyecto Android dispone de Cloud Functions, debe desplegar la función correspondiente.
- Las instrucciones y ficheros de configuración deben encontrarse en el proyecto Android completo.
- La app debe abrirse una vez tras instalarse para conceder notificaciones,
  emparejar el dispositivo y completar el registro del token.
- «Forzar detención» desde Ajustes de Android bloquea por diseño todos los
  receptores hasta volver a abrir la app. Quitarla de recientes no equivale a
  forzar su detención.

CORRECCIONES MODO 3D
- Se corrige el modo AHORRO DE ENERGÍA para que la capa negra cubra siempre
  el 100 % del área visible, incluso cuando está seleccionado el aspecto 3D.
- La pantalla negra se ha separado del contenedor tridimensional principal para
  evitar recortes y conflictos de apilado en Safari, iPhone y otros navegadores.
- Se añade una segunda capa negra de seguridad y se oculta completamente la
  interfaz mientras el ahorro de energía permanece activo.
- Se corrige la posición de las X de cierre de paneles, ventanas emergentes y
  menú lateral: vuelven a aparecer en la esquina superior derecha.
- Se elimina del contenedor raíz la perspectiva que alteraba el comportamiento
  de elementos fijos como paneles, modales, menú, fondo oscurecido y avisos.
- Se mejora el contraste de los datos de las alarmas en el tema oscuro y se
  revisan alturas dinámicas, apilado y foco visual de los controles 3D.

MODO 3D INTENSO
- Se refuerza considerablemente la diferencia visual entre los modos 2D y 3D.
- Al seleccionar el modo 3D, toda la interfaz adquiere una apariencia más
  tridimensional.
- Se añaden sombras exteriores más pronunciadas y varios niveles de profundidad.
- Las ventanas, tarjetas, paneles y cuadros emergentes incorporan relieve y
  bordes biselados.
- Los botones presentan aspecto elevado y un efecto visual de hundimiento al
  pulsarlos.
- Los campos de texto y otros controles muestran una apariencia empotrada.
- El menú lateral, las alarmas y los bloques de AJUSTES reciben un tratamiento
  tridimensional específico.
- El modo 3D se adapta tanto al tema claro como al tema oscuro.
- El modo 2D mantiene su apariencia plana y su funcionamiento anterior.
- No se modifica la lógica de funcionamiento de las alarmas, Firebase, GPS ni
  los servicios nativos.

SONIDOS Y VIBRACIÓN CONFIGURABLES
- Se añaden en AJUSTES controles independientes para activar o desactivar:
  1. Todas las vibraciones producidas por la aplicación.
  2. Los sonidos de las notificaciones generales.
  3. El sonido al recibir una nueva alarma enviada por el emisor.
  4. El sonido al recibir la cancelación de una alarma.
  5. El sonido principal cuando llega la fecha y la hora programadas en el
     teléfono receptor.
- Todos estos controles aparecen activados por defecto.
- La configuración queda guardada en el dispositivo y se conserva al cerrar o
  reiniciar la aplicación.
- Cada opción actúa únicamente sobre el tipo de aviso correspondiente.
- Desactivar un sonido no impide que siga apareciendo la notificación visual.
- El control general de vibración afecta a todas las vibraciones generadas por
  la aplicación.

AHORRO DE ENERGÍA
- Se mantiene el botón AHORRO DE ENERGÍA junto a ANULAR ALARMA en las alarmas
  enviadas activas.
- Al pulsarlo, toda la pantalla queda completamente negra sin detener la alarma,
  el GPS, Firebase ni el bloqueo de pantalla.
- Para volver a la interfaz normal hay que mantener pulsada la pantalla negra
  durante un segundo.
- El modo se cierra automáticamente si ya no queda ninguna alarma enviada activa.

FUNCIONAMIENTO EN IPHONE
- Cuando un iPhone es el emisor y mantiene una alarma activa con GPS autorizado,
  la aplicación web solicita a Safari que mantenga la pantalla encendida.
- El bloqueo de pantalla se solicita desde la pulsación de ENVIAR ALARMA para
  mejorar la compatibilidad con las restricciones de interacción de iOS.
- Si Safari libera el bloqueo al cambiar de aplicación o al ocultar la página,
  la web intenta recuperarlo cuando vuelve a estar visible.
- Al regresar a la página se reanuda el temporizador GPS y se intenta enviar una
  ubicación inmediatamente, además de continuar con el intervalo configurado.
- Al anular o completar la última alarma activa del emisor se libera el bloqueo
  de pantalla para evitar consumo innecesario de batería.
- Se mantiene el mensaje de anulación incorporado en versiones anteriores.

IMPORTANTE EN IPHONE
Para que el iPhone continúe enviando coordenadas, Safari debe permanecer abierto
y la página debe seguir visible. La aplicación evita el bloqueo automático de la
pantalla mientras exista una alarma enviada activa con GPS autorizado.

Si el usuario bloquea manualmente el iPhone o abre otra aplicación, iOS puede
suspender la página web. Al volver a Alarmas Lucía, la aplicación intentará
reanudar automáticamente el bloqueo de pantalla y el envío de ubicaciones.

SEGUNDO PLANO EN ANDROID
La versión Android nativa utiliza servicios en primer plano para mantener las
funciones necesarias mientras la aplicación no está visible.

La notificación permanente del servicio permite que Android mantenga activo el
proceso correspondiente. Esta notificación debe conservarse para evitar que el
sistema detenga el servicio.

NOTIFICACIONES
La aplicación puede mostrar diferentes clases de aviso:
- Notificación de nueva alarma recibida.
- Notificación de alarma anulada por el emisor.
- Alarma principal al llegar la fecha y hora programadas.
- Notificaciones generales y avisos de funcionamiento.
- Notificación permanente de los servicios activos en Android.

Los sonidos y las vibraciones de estos avisos dependen de la configuración
seleccionada en AJUSTES y de los permisos y ajustes de notificaciones del propio
teléfono.

PRIVACIDAD
La ubicación solo se comparte después de que el emisor conceda permiso de forma
expresa.

La aplicación no debe utilizarse para realizar seguimiento oculto, vigilar a una
persona sin su conocimiento ni compartir su ubicación sin consentimiento.

La disponibilidad del GPS, las notificaciones, los sonidos, la vibración y el
funcionamiento en segundo plano también dependen de los permisos concedidos por
el usuario y de las restricciones del sistema operativo.