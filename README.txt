APP Sinc Alarmas - versión con Firebase configurado

Firebase configurado:
- Proyecto: sincalarmas
- Realtime Database: https://sincalarmas-default-rtdb.europe-west1.firebasedatabase.app

IMPORTANTE:
Para que dos móviles sincronicen por internet, en Firebase debe estar creada y activa Realtime Database.
Si la app sigue indicando modo local o no sincroniza, revisa en Firebase:
1. Realtime Database > Reglas
2. Para pruebas iniciales, las reglas deben permitir lectura/escritura.

Reglas de prueba:
{
  "rules": {
    ".read": true,
    ".write": true
  }
}

Estas reglas abiertas son solo para probar. Más adelante deben protegerse.

Uso:
1. Sube esta carpeta completa a GitHub Pages sustituyendo la versión anterior.
2. Abre la app en los dos móviles.
3. En los dos móviles escribe la misma contraseña compartida en Emparejar.
4. Empareja el DNI del otro móvil por QR o manualmente.
5. Envía una alarma desde un móvil.
6. El otro móvil la mostrará como pendiente y sonará solo cuando llegue la hora.
7. Al pulsar RECIBIDO, el móvil que envió la alarma recibirá aviso de confirmación.
