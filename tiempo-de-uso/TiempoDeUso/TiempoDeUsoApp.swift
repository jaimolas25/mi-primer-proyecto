import SwiftUI

@main
struct TiempoDeUsoApp: App {
    @StateObject private var gestor = GestorTiempoDeUso()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(gestor)
        }
    }
}
