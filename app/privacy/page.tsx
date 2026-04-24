export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#030308] text-white">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-2xl font-black mb-2">Política de Privacidad</h1>
        <p className="text-gray-400 text-sm mb-8">Última actualización: abril 2026</p>
        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">
          <p>TripCopilot recopila y procesa datos de vuelos y viajes que vos cargás voluntariamente para brindarte el servicio de monitoreo y alertas.</p>
          <h2 className="text-lg font-bold text-white">Datos que recopilamos</h2>
          <p>Email de registro, información de vuelos y viajes cargados, preferencias de notificación, y ubicación aproximada (solo cuando usás la función de Destination Spotlight con tu consentimiento explícito).</p>
          <h2 className="text-lg font-bold text-white">Cómo usamos tus datos</h2>
          <p>Solo para brindarte el servicio de TripCopilot: alertas de vuelo, monitoreo de estado, y funciones de IA. No vendemos ni compartimos tus datos con terceros.</p>
          <h2 className="text-lg font-bold text-white">Contacto</h2>
          <p>Para consultas sobre privacidad: <a href="mailto:hola@tripcopilot.app" className="text-[#FFB800] hover:underline">hola@tripcopilot.app</a></p>
        </div>
        <a href="/" className="inline-block mt-8 text-sm text-gray-500 hover:text-white transition-colors">← Volver</a>
      </div>
    </div>
  );
}
