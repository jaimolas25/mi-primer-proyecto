import SwiftUI
import FamilyControls

struct ContentView: View {
    @EnvironmentObject private var gestor: GestorTiempoDeUso
    @State private var mostrarSelector = false

    var body: some View {
        NavigationStack {
            Form {
                if !gestor.autorizado {
                    Section {
                        Button("Permitir acceso a Tiempo de uso") {
                            Task { await gestor.solicitarAutorizacion() }
                        }
                    } footer: {
                        Text("iOS pedirá confirmación. Sin este permiso la app no puede aplicar límites.")
                    }
                }

                Section("Apps a limitar") {
                    Button {
                        mostrarSelector = true
                    } label: {
                        HStack {
                            Text("Elegir apps, categorías o webs")
                            Spacer()
                            Text("\(totalSeleccionado)")
                                .foregroundStyle(.secondary)
                        }
                    }
                    .disabled(!gestor.autorizado)
                }

                Section("Límite diario") {
                    Stepper(value: $gestor.minutosDiarios, in: 5...600, step: 5) {
                        Text("\(gestor.minutosDiarios) minutos al día")
                    }
                }

                Section {
                    Toggle("Bloqueo nocturno", isOn: $gestor.bloqueoNocturno)
                    if gestor.bloqueoNocturno {
                        DatePicker("Desde", selection: enlaceHora($gestor.horaInicioBloqueo), displayedComponents: .hourAndMinute)
                        DatePicker("Hasta", selection: enlaceHora($gestor.horaFinBloqueo), displayedComponents: .hourAndMinute)
                    }
                } footer: {
                    Text("Durante la franja indicada las apps seleccionadas quedan tapadas por completo.")
                }

                Section {
                    if gestor.activo {
                        Button("Desactivar límites", role: .destructive) {
                            gestor.desactivarLimites()
                        }
                    } else {
                        Button("Activar límites") {
                            gestor.activarLimites()
                        }
                        .disabled(!gestor.autorizado || totalSeleccionado == 0)
                    }
                }

                if let error = gestor.mensajeError {
                    Section {
                        Text(error).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Tiempo de uso")
            .familyActivityPicker(isPresented: $mostrarSelector, selection: $gestor.seleccion)
        }
    }

    private var totalSeleccionado: Int {
        gestor.seleccion.applicationTokens.count
            + gestor.seleccion.categoryTokens.count
            + gestor.seleccion.webDomainTokens.count
    }

    /// Convierte DateComponents (hora y minuto) en un Date para el DatePicker.
    private func enlaceHora(_ componentes: Binding<DateComponents>) -> Binding<Date> {
        Binding(
            get: {
                Calendar.current.date(from: componentes.wrappedValue) ?? Date()
            },
            set: { nueva in
                componentes.wrappedValue = Calendar.current.dateComponents([.hour, .minute], from: nueva)
            }
        )
    }
}
