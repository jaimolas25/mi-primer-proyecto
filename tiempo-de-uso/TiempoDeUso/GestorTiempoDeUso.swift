import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings

/// Lógica principal: pide permiso, guarda la configuración y programa
/// las actividades que la extensión vigilará en segundo plano.
@MainActor
final class GestorTiempoDeUso: ObservableObject {
    @Published var seleccion = FamilyActivitySelection()
    @Published var minutosDiarios: Int = 60
    @Published var bloqueoNocturno = false
    @Published var horaInicioBloqueo = DateComponents(hour: 23, minute: 0)
    @Published var horaFinBloqueo = DateComponents(hour: 7, minute: 0)
    @Published var autorizado = false
    @Published var activo = false
    @Published var mensajeError: String?

    private let centro = DeviceActivityCenter()

    init() {
        autorizado = AuthorizationCenter.shared.authorizationStatus == .approved
        cargarConfiguracion()
        activo = !centro.activities.isEmpty
    }

    // MARK: - Permiso de Tiempo de uso

    func solicitarAutorizacion() async {
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            autorizado = true
            mensajeError = nil
        } catch {
            mensajeError = "No se concedió el permiso: \(error.localizedDescription)"
        }
    }

    // MARK: - Activar / desactivar límites

    func activarLimites() {
        guardarConfiguracion()
        centro.stopMonitoring()
        Compartido.almacen.clearAllSettings()

        var errores: [String] = []

        // 1) Límite diario en minutos para las apps seleccionadas.
        if !seleccion.applicationTokens.isEmpty || !seleccion.categoryTokens.isEmpty || !seleccion.webDomainTokens.isEmpty {
            let horarioDia = DeviceActivitySchedule(
                intervalStart: DateComponents(hour: 0, minute: 0),
                intervalEnd: DateComponents(hour: 23, minute: 59),
                repeats: true
            )
            let evento = DeviceActivityEvent(
                applications: seleccion.applicationTokens,
                categories: seleccion.categoryTokens,
                webDomains: seleccion.webDomainTokens,
                threshold: DateComponents(minute: minutosDiarios)
            )
            do {
                try centro.startMonitoring(
                    Compartido.actividadLimiteDiario,
                    during: horarioDia,
                    events: [Compartido.eventoUmbral: evento]
                )
            } catch {
                errores.append("Límite diario: \(error.localizedDescription)")
            }
        }

        // 2) Bloqueo nocturno: las apps quedan tapadas durante la franja horaria.
        if bloqueoNocturno {
            let horarioNoche = DeviceActivitySchedule(
                intervalStart: horaInicioBloqueo,
                intervalEnd: horaFinBloqueo,
                repeats: true
            )
            do {
                try centro.startMonitoring(Compartido.actividadBloqueoNocturno, during: horarioNoche)
            } catch {
                errores.append("Bloqueo nocturno: \(error.localizedDescription)")
            }
        }

        mensajeError = errores.isEmpty ? nil : errores.joined(separator: "\n")
        activo = !centro.activities.isEmpty
    }

    func desactivarLimites() {
        centro.stopMonitoring()
        Compartido.almacen.clearAllSettings()
        activo = false
    }

    // MARK: - Persistencia en el App Group (la extensión la lee)

    private func guardarConfiguracion() {
        guard let defaults = Compartido.defaults else {
            mensajeError = "No se pudo abrir el App Group. Revisa el identificador en Compartido.swift."
            return
        }
        if let datos = try? JSONEncoder().encode(seleccion) {
            defaults.set(datos, forKey: Compartido.claveSeleccion)
        }
        defaults.set(minutosDiarios, forKey: Compartido.claveMinutos)
        defaults.set(bloqueoNocturno, forKey: Compartido.claveBloqueoNocturno)
    }

    private func cargarConfiguracion() {
        guard let defaults = Compartido.defaults else { return }
        if let datos = defaults.data(forKey: Compartido.claveSeleccion),
           let guardada = try? JSONDecoder().decode(FamilyActivitySelection.self, from: datos) {
            seleccion = guardada
        }
        let minutos = defaults.integer(forKey: Compartido.claveMinutos)
        if minutos > 0 { minutosDiarios = minutos }
        bloqueoNocturno = defaults.bool(forKey: Compartido.claveBloqueoNocturno)
    }
}
