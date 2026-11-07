import Foundation
import DeviceActivity
import ManagedSettings

/// Constantes compartidas entre la app y la extensión de monitorización.
/// IMPORTANTE: cambia `appGroup` por el identificador de tu propio App Group
/// y usa exactamente el mismo en los dos targets (app y extensión).
enum Compartido {
    static let appGroup = "group.com.TUNOMBRE.tiempodeuso"

    // Claves de UserDefaults (grupo compartido)
    static let claveSeleccion = "seleccionApps"
    static let claveMinutos = "minutosDiarios"
    static let claveBloqueoNocturno = "bloqueoNocturnoActivo"

    // Nombres de las actividades que vigila DeviceActivity
    static let actividadLimiteDiario = DeviceActivityName("limiteDiario")
    static let actividadBloqueoNocturno = DeviceActivityName("bloqueoNocturno")
    static let eventoUmbral = DeviceActivityEvent.Name("umbralAlcanzado")

    // Almacén de restricciones (los "escudos" que tapan las apps)
    static let almacen = ManagedSettingsStore(named: ManagedSettingsStore.Name("tiempoDeUso"))

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroup)
    }
}
