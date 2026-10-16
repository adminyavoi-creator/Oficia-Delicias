export type OficiaNotificationTemplate = { role: 'cliente' | 'anfitrion'; name: string; title: string; body: string; trigger: string };

export const notificationTemplates: OficiaNotificationTemplate[] = [
  { role: 'cliente', name: 'Solicitud recibida', title: 'Solicitud enviada', body: 'Tu solicitud para {espacio} quedó registrada.', trigger: 'Al crear una solicitud real' },
  { role: 'cliente', name: 'Respuesta del espacio', title: 'Actualización de solicitud', body: '{espacio} actualizó tu solicitud. Consulta su estado en Reservas.', trigger: 'Al aceptar o rechazar una solicitud' },
  { role: 'cliente', name: 'Renta próxima', title: 'Tu renta es mañana', body: 'Mañana tienes una renta en {espacio}. Consulta los datos de tu ticket.', trigger: '24 horas antes de una renta autorizada' },
  { role: 'cliente', name: 'Opinión verificada', title: '¿Cómo estuvo tu espacio?', body: 'Deja una opinión sobre {espacio} para ayudar a otros clientes.', trigger: 'Al finalizar una renta real' },
  { role: 'cliente', name: 'Ofertas y novedades', title: 'Encuentra tu próximo espacio', body: 'Explora los espacios de Oficia para organizar tu siguiente jornada.', trigger: 'Campaña de Operaciones; requiere aceptación expresa' },
  { role: 'anfitrion', name: 'Nueva solicitud', title: 'Nueva solicitud', body: 'Tienes una solicitud para {espacio}. Revisa fecha y duración en Oficia.', trigger: 'Al recibir una solicitud real' },
  { role: 'anfitrion', name: 'Renta próxima', title: 'Tu espacio recibe una renta mañana', body: 'Mañana comienza una renta en {espacio}. Revisa los detalles.', trigger: '24 horas antes de una renta autorizada' },
  { role: 'anfitrion', name: 'Revisión de ficha', title: 'Actualización de tu espacio', body: '{espacio} fue revisado. Consulta el resultado y los siguientes pasos.', trigger: 'Al aprobar o devolver una ficha' },
  { role: 'anfitrion', name: 'Renta finalizada', title: 'Renta finalizada', body: 'La renta de {espacio} quedó marcada como realizada.', trigger: 'Al finalizar una renta real o recibir una opinión' },
  { role: 'anfitrion', name: 'Ofertas y novedades', title: 'Mejora tu ficha en Oficia', body: 'Mantén al día horarios, fotos y servicios para que tu espacio esté listo para recibir solicitudes.', trigger: 'Campaña de Operaciones; requiere aceptación expresa' },
];
