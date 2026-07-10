Sinc Alarmas - versión actualizada

Cambios incluidos:
- Nueva imagen central en SVG con fondo transparente, estilo caricatura 3D/colorido.
- Corrección de los temas de color: ahora Azul, Verde, Morado, Naranja y Oscuro cambian la apariencia correctamente.
- Nuevo ajuste de opacidad de ventanas, configurable desde Ajustes.
- Cada alarma pendiente incluye botón "Anular alarma".
- Al anular una alarma se puede escribir un mensaje para el otro móvil, por ejemplo: "Llegué bien".
- La alarma anulada deja de estar pendiente y no sonará en el otro móvil.
- La anulación se sincroniza por Firebase si la sincronización online está activa.

Uso básico:
1. Abrir la app en los dos móviles.
2. Emparejar con la misma contraseña y el DNI del otro móvil.
3. Enviar una alarma.
4. En el móvil que la envía aparecerá en pendientes enviadas.
5. Desde el recuadro de la alarma se puede anular y escribir un mensaje.

IMPORTANTE:
Para que funcione entre móviles por internet, Firebase debe seguir configurado y Realtime Database debe permitir lectura/escritura durante las pruebas.

ACTUALIZACIÓN - ANULACIÓN DE ALARMAS
- El móvil que envía una alarma puede anularla antes de que llegue la hora.
- Al anular, se puede escribir un mensaje para el otro móvil, por ejemplo: "Llegué bien".
- El receptor verá la alarma como ANULADA y no sonará cuando llegue la hora.
- Si la anulación llega mientras la alarma estuviera sonando, el sonido se corta automáticamente.
- El receptor no puede anular una alarma enviada por el otro; solo puede verla y confirmarla cuando suene.
