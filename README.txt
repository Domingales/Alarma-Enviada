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
