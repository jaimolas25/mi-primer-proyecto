import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

/// Extensión que iOS ejecuta en segundo plano aunque la app esté cerrada.
/// Aquí es donde realmente se "modifica el tiempo de uso": al llegar al
/// umbral de minutos, o al entrar en la franja nocturna, tapamos las apps.
final class MonitorExtension: DeviceActivityMonitor {

    private let almacen = Compartido.almacen

    // Empieza un nuevo intervalo (nuevo día, o comienza la franja nocturna).
    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        switch activity {
        case Compartido.actividadLimiteDiario:
            // Nuevo día: se levantan los escudos para volver a contar desde cero.
            almacen.clearAllSettings()
        case Compartido.actividadBloqueoNocturno:
            aplicarEscudos()
        default:
            break
        }
    }

    // Termina el intervalo (acaba el día, o acaba la franja nocturna).
    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        almacen.clearAllSettings()
    }

    // Se ha consumido el tiempo diario permitido.
    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        if event == Compartido.eventoUmbral {
            aplicarEscudos()
        }
    }

    private func aplicarEscudos() {
        guard let datos = Compartido.defaults?.data(forKey: Compartido.claveSeleccion),
              let seleccion = try? JSONDecoder().decode(FamilyActivitySelection.self, from: datos) else {
            return
        }
        almacen.shield.applications = seleccion.applicationTokens.isEmpty ? nil : seleccion.applicationTokens
        almacen.shield.applicationCategories = seleccion.categoryTokens.isEmpty
            ? nil
            : .specific(seleccion.categoryTokens)
        almacen.shield.webDomains = seleccion.webDomainTokens.isEmpty ? nil : seleccion.webDomainTokens
    }
}
