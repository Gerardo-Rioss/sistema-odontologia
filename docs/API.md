# Documentación de API

Catálogo completo de endpoints REST del Sistema de Gestión Odontológica.

## Convenciones

- **Base URL**: `https://tu-dominio.com` (producción) o `http://localhost:3000` (desarrollo)
- **Autenticación**: cookie de sesión JWT (NextAuth.js). Endpoints marcados con 🔒 requieren sesión activa.
- **Formato**: JSON en request y response
- **Errores**: `{ error: "mensaje" }` con código HTTP apropiado
- **Rate Limiting**: endpoints de auth limitados a 5 req / 15 min por IP

---

## Autenticación

### `POST /api/auth/register`

Registra un nuevo usuario odontólogo.

🔓 Público | Rate limit: 5 req / 15 min

**Request:**
```json
{
  "email": "dr@consultorio.com",
  "password": "contraseña-segura",
  "firstName": "Juan",
  "lastName": "Pérez"
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx...",
      "email": "dr@consultorio.com",
      "firstName": "Juan",
      "lastName": "Pérez",
      "role": "DENTIST"
    }
  }
}
```

**Errores:** `400` (datos inválidos), `409` (email ya registrado), `429` (rate limit)

---

### `POST /api/auth/forgot-password`

Solicita un token de recuperación de contraseña.

🔓 Público | Rate limit: 5 req / 15 min

**Request:**
```json
{
  "email": "dr@consultorio.com"
}
```

**Response** `200`:
```json
{
  "message": "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",
  "resetToken": "tok-abc123..."
}
```

> En desarrollo, el token se retorna en la respuesta. En producción se enviaría por email.

---

### `POST /api/auth/reset-password`

Restablece la contraseña usando un token de recuperación.

🔓 Público | Rate limit: 5 req / 15 min

**Request:**
```json
{
  "token": "tok-abc123...",
  "password": "nueva-contraseña-segura"
}
```

**Response** `200`:
```json
{
  "message": "Contraseña actualizada correctamente"
}
```

**Errores:** `400` (token inválido o expirado)

---

### `GET/POST /api/auth/[...nextauth]`

Handler de NextAuth.js. Maneja sign-in, sign-out, sesión, CSRF.

🔓 Público

**Sign-in** `POST`:
```json
{
  "email": "dr@consultorio.com",
  "password": "contraseña-segura"
}
```

**Session** `GET`: retorna la sesión actual o `null`.

---

## Pacientes

### `GET /api/patients`

Lista los pacientes del dentista autenticado.

🔒 Requiere autenticación

**Query params:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `search` | string | Búsqueda por nombre o teléfono |

**Request:**
```bash
curl -b cookies.txt "http://localhost:3000/api/patients?search=Ana"
```

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": "clx...",
      "name": "Ana García",
      "email": "ana@email.com",
      "phone": "+5491112345678",
      "birthDate": "1990-05-15T00:00:00.000Z",
      "notes": "Alergia a penicilina",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-03-20T14:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/patients`

Crea un nuevo paciente.

🔒 Requiere autenticación

**Request:**
```json
{
  "name": "Ana García",
  "phone": "+5491112345678",
  "email": "ana@email.com",
  "birthDate": "1990-05-15T00:00:00.000Z",
  "notes": "Alergia a penicilina"
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "name": "Ana García",
    "phone": "+5491112345678",
    "email": "ana@email.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "notes": "Alergia a penicilina",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errores:** `400` (datos inválidos), `401` (no autenticado)

---

### `GET /api/patients/[id]`

Obtiene un paciente con su historial de citas.

🔒 Requiere autenticación

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": "clx...",
    "name": "Ana García",
    "phone": "+5491112345678",
    "email": "ana@email.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "notes": "Alergia a penicilina",
    "appointments": [
      {
        "id": "cly...",
        "date": "2024-06-15",
        "time": "10:00",
        "type": "LIMPIEZA",
        "status": "COMPLETED"
      }
    ]
  }
}
```

**Errores:** `401` (no autenticado), `403` (no autorizado), `404` (no encontrado)

---

### `PUT /api/patients/[id]`

Actualiza los datos de un paciente.

🔒 Requiere autenticación

**Request:**
```json
{
  "name": "Ana García López",
  "phone": "+5491198765432",
  "notes": "Actualizado: nueva obra social"
}
```

**Response** `200`: igual que GET por ID con datos actualizados.

---

### `DELETE /api/patients/[id]`

Elimina un paciente y sus citas asociadas (cascada).

🔒 Requiere autenticación

**Response** `204`: sin contenido.

**Errores:** `401`, `403`, `404`

---

## Citas

### `GET /api/appointments`

Lista las citas del dentista autenticado.

🔒 Requiere autenticación

**Query params:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `status` | string | Filtrar por estado: `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED` |
| `date` | string | Filtrar por fecha: `YYYY-MM-DD` |

**Request:**
```bash
curl -b cookies.txt "http://localhost:3000/api/appointments?status=PENDING&date=2024-06-15"
```

**Response** `200`:
```json
{
  "success": true,
  "data": [
    {
      "id": "clz...",
      "date": "2024-06-15",
      "time": "10:00",
      "status": "PENDING",
      "type": "LIMPIEZA",
      "notes": "Primera consulta",
      "patient": {
        "id": "clx...",
        "name": "Ana García",
        "phone": "+5491112345678"
      },
      "createdAt": "2024-06-10T08:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/appointments`

Crea una nueva cita. Sincroniza con Google Calendar si está conectado.

🔒 Requiere autenticación

**Request:**
```json
{
  "patientId": "clx...",
  "date": "2024-06-15",
  "time": "10:00",
  "type": "LIMPIEZA",
  "notes": "Primera consulta del año"
}
```

**Response** `201`:
```json
{
  "success": true,
  "data": {
    "id": "clz...",
    "date": "2024-06-15",
    "time": "10:00",
    "status": "PENDING",
    "type": "LIMPIEZA",
    "notes": "Primera consulta del año",
    "patientId": "clx...",
    "createdAt": "2024-06-10T08:00:00.000Z"
  }
}
```

**Errores:** `400` (datos inválidos), `401`, `409` (conflicto de horario)

---

### `GET /api/appointments/[id]`

Obtiene una cita por ID.

🔒 Requiere autenticación

**Errores:** `401`, `403`, `404`

---

### `PUT /api/appointments/[id]`

Actualiza (reprograma) una cita.

🔒 Requiere autenticación

**Request:**
```json
{
  "date": "2024-06-16",
  "time": "14:00",
  "notes": "Reprogramada a pedido del paciente"
}
```

**Response** `200`: cita actualizada.

**Errores:** `400`, `401`, `403`, `404`, `409`

---

### `DELETE /api/appointments/[id]`

Elimina una cita del sistema y de Google Calendar.

🔒 Requiere autenticación

**Response** `204`: sin contenido.

---

### `PATCH /api/appointments/[id]/confirm`

Confirma una cita pendiente. Cambia estado `PENDING → CONFIRMED`.

🔒 Requiere autenticación

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "id": "clz...",
    "status": "CONFIRMED",
    "date": "2024-06-15",
    "time": "10:00",
    "type": "LIMPIEZA"
  }
}
```

**Errores:** `401`, `403`, `404`, `409` (ya está confirmada o cancelada)

---

### `PATCH /api/appointments/[id]/cancel`

Cancela una cita. Cambia estado `PENDING|CONFIRMED → CANCELLED`.

🔒 Requiere autenticación

**Response** `200`: igual que confirm, con `status: "CANCELLED"`.

**Errores:** `401`, `403`, `404`, `409` (ya está cancelada)

---

### `GET /api/appointments/available-slots`

Obtiene los horarios disponibles para una fecha.

🔒 Requiere autenticación

**Query params:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `date` | string | Fecha en formato `YYYY-MM-DD` (requerido) |

**Request:**
```bash
curl -b cookies.txt "http://localhost:3000/api/appointments/available-slots?date=2024-06-15"
```

**Response** `200`:
```json
{
  "success": true,
  "data": [
    { "time": "08:00", "available": true },
    { "time": "09:00", "available": false },
    { "time": "10:00", "available": true },
    { "time": "14:00", "available": true },
    { "time": "17:00", "available": true }
  ]
}
```

> Bloques de 1 hora, 08:00–18:00, excluyendo pausa de almuerzo (13:00–14:00).

---

## Google Calendar

### `GET /api/calendar/auth`

Inicia el flujo OAuth2 con Google Calendar. Redirige a la pantalla de consentimiento de Google.

🔒 Requiere autenticación

**Response**: `302` redirect a Google.

---

### `GET /api/calendar/auth/callback`

Callback de OAuth2. Google redirige aquí después del consentimiento. Intercambia el código por tokens y guarda la conexión.

🔒 Requiere autenticación

**Query params:** `code`, `state`, `error` (los envía Google)

**Response**: `302` redirect a `/dashboard/settings?calendar=connected` o `?calendar=error`.

---

### `GET /api/calendar/sync`

Estado de sincronización del calendario.

🔒 Requiere autenticación

**Response** `200`:
```json
{
  "connected": true,
  "lastSync": "2024-06-15T10:00:00.000Z",
  "calendarEmail": "dr@consultorio.com"
}
```

Desconectado:
```json
{
  "connected": false,
  "lastSync": null,
  "calendarEmail": null
}
```

---

### `POST /api/calendar/sync`

Dispara una sincronización bidireccional manual.

🔒 Requiere autenticación

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "synced": 5,
    "created": 2,
    "updated": 3,
    "deleted": 0
  }
}
```

---

### `GET /api/calendar/status`

Retorna el estado de la conexión con Google Calendar.

🔒 Requiere autenticación

**Response** `200` (conectado):
```json
{
  "connected": true,
  "email": "dr@consultorio.com",
  "lastSyncedAt": "2024-06-15T10:00:00.000Z"
}
```

Desconectado:
```json
{
  "connected": false
}
```

---

### `POST /api/calendar/disconnect`

Desconecta la integración con Google Calendar (borra tokens).

🔒 Requiere autenticación

**Response** `200`:
```json
{
  "success": true
}
```

---

### `GET/POST /api/calendar/webhook`

Webhook de notificaciones push de Google Calendar.

🔓 Público (validado por header `x-goog-channel-token`)

**GET**: verificación de canal (responde con `challenge`).

**POST**: recibe notificaciones `sync`, `exists`, `not_exists`. Dispara `catchUpSync` según corresponda.

---

## WhatsApp

### `GET /api/whatsapp/webhook`

Verificación del webhook por Meta (hub challenge).

🔓 Público

**Query params:** `hub.mode`, `hub.verify_token`, `hub.challenge`

**Response**: `200` con el valor de `hub.challenge`, o `403` si el token no coincide.

---

### `POST /api/whatsapp/webhook`

Recibe mensajes entrantes y actualizaciones de estado de WhatsApp.

🔓 Público (con validación HMAC-SHA256 de firma)

**Headers:**
| Header | Descripción |
|--------|-------------|
| `X-Hub-Signature-256` | Firma HMAC-SHA256 del body |

**Response** `200`:
```json
{
  "message": "OK"
}
```

> Procesa mensajes entrantes automáticamente: guarda en BD, inicia flujo de conversación, responde al paciente.

---

### `POST /api/whatsapp/send`

Envía un mensaje manual de WhatsApp (solo admin).

🔒 Requiere autenticación + rol `ADMIN`

**Request:**
```json
{
  "phone": "+5491112345678",
  "text": "Hola Ana, tu cita del lunes está confirmada."
}
```

**Response** `200`:
```json
{
  "success": true,
  "messageId": "wamid.abc123..."
}
```

**Errores:** `400` (campos inválidos), `401` (no autenticado), `403` (no es admin), `502` (error de WhatsApp API)

---

### `GET /api/whatsapp/cron/reminders`

Dispara el barrido de recordatorios de citas vía HTTP (alternativa a cron en instrumentation.ts).

🔒 Protegido por header `x-cron-secret`

**Headers:**
| Header | Valor |
|--------|-------|
| `x-cron-secret` | Valor de `CRON_SECRET` |

**Response** `200`:
```json
{
  "success": true,
  "data": {
    "sent": 3,
    "failed": 0,
    "skipped": 1
  }
}
```

**Errores:** `401` (secreto inválido), `500` (endpoint no configurado)

---

## Estadísticas

### `GET /api/statistics/overview`

Resumen de métricas clave del consultorio.

🔒 Requiere autenticación

**Response** `200`:
```json
{
  "message": "Estadísticas — próximamente",
  "data": {
    "totalAppointments": 0,
    "totalPatients": 0,
    "appointmentsToday": 0,
    "completionRate": 0
  }
}
```

> Este endpoint está en desarrollo activo. Los datos actuales son placeholders.

---

## Códigos de Error

| Código | Significado |
|--------|-------------|
| `200` | Éxito |
| `201` | Recurso creado |
| `204` | Sin contenido (DELETE exitoso) |
| `302` | Redirección |
| `400` | Datos inválidos |
| `401` | No autenticado |
| `403` | No autorizado |
| `404` | No encontrado |
| `409` | Conflicto |
| `429` | Rate limit excedido |
| `500` | Error interno del servidor |
| `502` | Error de servicio externo (WhatsApp API) |
