# Tiempo de uso: límites de apps en tu iPhone

App mínima para iPhone que te permite **regular tú mismo** el tiempo de uso:

- **Límite diario**: eliges apps, categorías o webs y un número de minutos al día. Al agotarlos, iOS las tapa con un "escudo" hasta el día siguiente.
- **Bloqueo nocturno**: franja horaria (por ejemplo de 23:00 a 07:00) durante la que esas apps quedan tapadas.

## Lo primero que debes saber

No existe ningún script que pueda cambiar "Tiempo de uso" desde un ordenador, ni por USB ni por red. Apple solo permite hacerlo con su **Screen Time API** (frameworks `FamilyControls`, `DeviceActivity` y `ManagedSettings`), y esa API solo funciona desde una app instalada en el propio iPhone. Por eso lo que hay aquí es una app de iOS, no un script de terminal.

Además:

- Solo actúa sobre el iPhone en el que la instalas. No sirve para controlar a distancia el móvil de otra persona.
- Para el móvil de un hijo lo correcto es "En familia" de Apple, que ya hace esto sin programar nada.
- Si borras la app, los límites desaparecen. El "Tiempo de uso" nativo de iOS puede impedir borrar apps; el de esta app no.

## Requisitos

- Un Mac con **Xcode 15 o posterior**.
- Un **Apple ID**. Con una cuenta gratuita puedes instalar la app en tu propio iPhone, pero caduca a los 7 días y hay que reinstalarla desde Xcode. Con el programa de desarrolladores (99 USD al año) dura un año.
- iPhone con **iOS 16 o posterior**.

## Instalación paso a paso

1. **Crea el proyecto en Xcode**
   File → New → Project → iOS → App. Nombre: `TiempoDeUso`. Interface: SwiftUI. Language: Swift.

2. **Sustituye los archivos de la app**
   Borra `ContentView.swift` y `TiempoDeUsoApp.swift` que genera Xcode y arrastra dentro del target los cuatro archivos de la carpeta `TiempoDeUso/` de este repositorio:
   `TiempoDeUsoApp.swift`, `ContentView.swift`, `GestorTiempoDeUso.swift`, `Compartido.swift`.

3. **Añade la extensión de monitorización**
   File → New → Target → busca **Device Activity Monitor Extension**. Nombre: `MonitorExtension`.
   Sustituye el archivo Swift que genera por `MonitorExtension/MonitorExtension.swift` y reemplaza su `Info.plist` por el de la carpeta `MonitorExtension/`.
   Marca también `Compartido.swift` como miembro de este target (panel derecho → Target Membership).

4. **Activa las capacidades en los dos targets** (app y extensión)
   Pestaña *Signing & Capabilities* → botón `+ Capability`:
   - **Family Controls**
   - **App Groups**: crea uno nuevo, por ejemplo `group.com.tunombre.tiempodeuso`.

   Puedes usar los archivos `.entitlements` de este repositorio como referencia.

5. **Pon tu identificador de App Group**
   En `Compartido.swift` cambia `group.com.TUNOMBRE.tiempodeuso` por el que acabas de crear. Debe ser el mismo en los dos targets.

6. **Instala en el iPhone**
   Conecta el iPhone, elígelo como destino y pulsa ▶. La primera vez el iPhone te pedirá confiar en el desarrollador en Ajustes → General → Gestión de dispositivos.

7. **Configura los límites desde la app**
   Pulsa "Permitir acceso a Tiempo de uso", elige las apps, ajusta los minutos y pulsa "Activar límites".

## Cómo funciona

| Archivo | Qué hace |
|---|---|
| `GestorTiempoDeUso.swift` | Pide el permiso, guarda tu configuración en el App Group y programa las actividades con `DeviceActivityCenter`. |
| `MonitorExtension.swift` | iOS la ejecuta en segundo plano aunque la app esté cerrada. Cuando se alcanzan los minutos, o empieza la franja nocturna, tapa las apps con `ManagedSettingsStore`. Al empezar un nuevo día las destapa. |
| `ContentView.swift` | La pantalla: selector de apps de Apple, minutos, horario y botón de activar. |
| `Compartido.swift` | Constantes comunes a la app y la extensión. |

## Alternativas sin programar

Si no quieres instalar Xcode, estas opciones ya vienen en el iPhone:

- **Ajustes → Tiempo de uso → Límites de uso de apps**. Es lo mismo que hace esta app. Para que no puedas saltarte el límite, pide a alguien de confianza que ponga el código de Tiempo de uso y no te lo diga.
- **App Atajos → Automatización → "Al abrir la app"**. Puedes hacer que al abrir Instagram, por ejemplo, se active un modo de concentración, se muestre un aviso o se abra otra app. No bloquea, pero añade fricción.
- **Modos de concentración programados** (Ajustes → Concentración). Silencian notificaciones y ocultan apps de la pantalla de inicio en franjas horarias.
