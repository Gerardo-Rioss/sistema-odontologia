# Proposal: Integración WhatsApp — Bot Conversacional

## Intent

Permitir que pacientes agenden, consulten y cancelen citas odontológicas por WhatsApp mediante un bot conversacional 24/7. Elimina la fricción humana de la gestión telefónica y reduce no-shows con recordatorios automáticos.

## Scope

### In Scope
- Webhook GET/POST con Meta WhatsApp Cloud API (v21.0+): verificación `hub.challenge` + recepción de mensajes
- Detección de intenciones por keywords+regex (agendar, cancelar, consultar, saludar) — sin ML/NLP externo
- Máquina de estados de conversación persistida en BD: `idle` → `service_selection` → `date_selection` → `time_selection` → `confirmation` → `completed`
- Envío de mensajes outbound (texto + templates) vía `/v21.0/{phone-number-id}/messages`
- Recordatorios automáticos: 24h y 2h antes de cada cita confirmada (cron endpoint en route handler)
- Integración con `AppointmentService` para agendar/cancelar citas reales y consultar slots disponibles
- Modelos Prisma: `WhatsAppMessage` (extiende funcionalidad, no reemplaza `Message` existente), `ConversationState`
- Plantillas pre-aprobadas para confirmación, cancelación y recordatorio

### Out of Scope
- Twilio o Waha (usamos Meta Cloud API directa)
- NLP con IA/LLM
- Procesamiento de multimedia (audio, imágenes, documentos)
- Encuestas de satisfacción post-consulta (fase futura)
- BullMQ/Redis para colas de mensajes (se posterga, usamos async fire-and-forget)
- Multi-idioma en el bot (solo español)

## Capabilities

### New Capabilities
- `whatsapp-webhook`: Recepción y verificación de webhooks Meta, parseo de mensajes entrantes, firma HMAC-SHA256
- `whatsapp-conversation`: Máquina de estados conversacionales, detección de intenciones por keywords, flujo de agendamiento guiado
- `whatsapp-messaging`: Envío de mensajes de texto y templates vía Cloud API, formateo de slots disponibles, confirmaciones
- `whatsapp-reminders`: Recordatorios automáticos 24h/2h antes vía cron endpoint, consulta de citas próximas

### Modified Capabilities
- `appointment-crud`: Nuevo endpoint `GET /api/appointments/available-slots` (slots libres por fecha) requerido por el bot para mostrar disponibilidad
- `database-schema`: Nuevos modelos `WhatsAppMessage` y `ConversationState`; `Appointment` gana flag `whatsappReminderSent`

## Approach

1. **WhatsAppService** implementa Cloud API calls (`POST /messages`), parseo de webhooks, verificación de firma. Reemplaza el stub actual.
2. **ConversationStateMachine** en `src/services/conversation.service.ts`: orquesta intents → transiciones de estado → acciones (consultar slots, crear/cancelar cita, responder).
3. **Recordatorio**: endpoint `GET /api/whatsapp/cron/reminders` ejecutado por cron externo (o `node-cron` integrado). Consulta citas CONFIRMED para las próximas 24h/2h y envía template.
4. **Persistencia**: `WhatsAppMessage` guarda mensajes entrantes/salientes con `waMessageId`, `ConversationState` persiste el estado actual del paciente por `phoneNumber`.
5. Las llamadas a `AppointmentService` son síncronas dentro del flujo de conversación — el bot agenda usando el mismo servicio que el dashboard.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `prisma/schema.prisma` | Modified | +WhatsAppMessage, +ConversationState, +Appointment.whatsappReminderSent |
| `src/services/whatsapp.service.ts` | Replaced | Implementación real Cloud API |
| `src/services/conversation.service.ts` | New | State machine + intent detection |
| `src/services/reminder.service.ts` | New | Lógica de recordatorios |
| `src/app/api/whatsapp/webhook/route.ts` | Replaced | GET verify + POST process |
| `src/app/api/whatsapp/send/route.ts` | New | Send endpoint (admin dashboard use) |
| `src/app/api/whatsapp/cron/reminders/route.ts` | New | Cron endpoint |
| `src/app/api/appointments/available-slots/route.ts` | New | Slots query for bot |
| `src/types/index.ts` | Modified | +WhatsAppMessage, +ConversationState types |
| `.env.example` | Modified | +WHATSAPP_BUSINESS_ACCOUNT_ID |
| `package.json` | Modified | +node-cron (dev deps: @types/node-cron) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Meta API rate limits en free tier (250 msgs/día) | Med | Implementar rate-limit aware retry, documentar límites |
| Cambio de mensajes template requiere re-aprobación en Meta | Low | Versionar templates, mantener texto genérico |
| ConversationState perdido si BD cae | Low | Persistir en PostgreSQL, no en memoria |
| Webhook no recibe mensajes por mala configuración de URL pública | Med | Documentar ngrok para dev, verificar en Meta dashboard |
| Colisión de slots: paciente elige slot que otro toma mientras conversa | Med | Verificar disponibilidad real al confirmar (no solo al mostrar) |

## Rollback Plan

1. Eliminar webhook registration en Meta Developer Dashboard
2. Eliminar modelos `WhatsAppMessage` + `ConversationState` vía nueva migración reversa
3. Eliminar flag `whatsappReminderSent` de Appointment
4. Eliminar `node-cron` de package.json
5. Restaurar stubs originales en `whatsapp.service.ts`, `webhook/route.ts`

## Dependencies

- Meta Business App aprobada con `whatsapp_business_messaging` permission
- Número de teléfono verificado en WhatsApp Business Platform
- Token de acceso permanente (o rotación automática)
- URL pública con HTTPS para webhook (ngrok en dev)

## Success Criteria

- [ ] Webhook verifica correctamente (GET 200 con challenge)
- [ ] Bot responde a "hola" con saludo y opciones
- [ ] Flujo completo de agendamiento: selección de servicio → fecha → hora → confirmación → cita creada en BD
- [ ] Cancelación de cita existente vía WhatsApp
- [ ] Recordatorio enviado 24h antes de cita confirmada
- [ ] Recordatorio enviado 2h antes de cita confirmada
- [ ] Todos los mensajes WhatsApp persistidos en BD con waMessageId
