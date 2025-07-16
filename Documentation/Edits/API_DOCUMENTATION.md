# MaintainPro CMMS - API Documentation

## Overview

MaintainPro CMMS provides a comprehensive RESTful API for managing maintenance operations, equipment, work orders, and preventive maintenance schedules.

## Base URL

```
http://localhost:5000
```

## Authentication

All API endpoints require a valid warehouse ID in the request headers:

```
x-warehouse-id: your-warehouse-id
```

## Headers

| Header | Required | Description |
|--------|----------|-------------|
| `x-warehouse-id` | Yes | Warehouse identifier for multi-tenant support |
| `Content-Type` | Yes* | `application/json` for POST/PUT requests |

## Preventive Maintenance API

### PM Templates

#### Get All PM Templates
```http
GET /api/pm-templates
```

**Response:**
```json
[
  {
    "id": "uuid",
    "model": "Pump Model A",
    "component": "Oil Filter",
    "action": "Replace oil filter and check for leaks",
    "frequency": "monthly",
    "customFields": {
      "oilType": "10W-30",
      "filterSize": "Standard"
    },
    "active": true,
    "warehouseId": "warehouse-uuid",
    "createdAt": "2025-07-16T10:05:54.577Z"
  }
]
```

#### Create PM Template
```http
POST /api/pm-templates
Content-Type: application/json

{
  "model": "Equipment Model",
  "component": "Component Name",
  "action": "Maintenance Action",
  "frequency": "weekly",
  "customFields": {
    "key": "value"
  }
}
```

**Response:**
```json
{
  "id": "new-uuid",
  "model": "Equipment Model",
  "component": "Component Name",
  "action": "Maintenance Action",
  "frequency": "weekly",
  "customFields": {
    "key": "value"
  },
  "warehouseId": "warehouse-uuid",
  "createdAt": "2025-07-16T10:19:56.261Z"
}
```

#### Update PM Template
```http
PUT /api/pm-templates/:id
Content-Type: application/json

{
  "model": "Updated Model",
  "component": "Updated Component",
  "action": "Updated Action",
  "frequency": "monthly"
}
```

#### Delete PM Template
```http
DELETE /api/pm-templates/:id
```

### PM Compliance

#### Get Compliance Data
```http
GET /api/pm-compliance?days=30
```

**Response:**
```json
{
  "overallComplianceRate": 95.5,
  "totalPMsScheduled": 45,
  "totalPMsCompleted": 43,
  "overdueCount": 2,
  "equipmentCompliance": [
    {
      "equipmentId": "equipment-uuid",
      "assetTag": "PUMP-001",
      "model": "Pump Model A",
      "complianceRate": 100,
      "lastPMDate": "2025-07-01T10:00:00Z",
      "nextPMDate": "2025-08-01T10:00:00Z",
      "overdueCount": 0
    }
  ],
  "monthlyTrends": [
    {
      "month": "June 2025",
      "scheduled": 20,
      "completed": 19,
      "complianceRate": 95.0
    }
  ]
}
```

### PM Scheduler

#### Get Scheduler Status
```http
GET /api/pm-scheduler/status
```

**Response:**
```json
{
  "isRunning": true,
  "nextRun": "2025-07-16T11:00:00Z",
  "lastRun": "2025-07-16T10:00:00Z",
  "generatedWorkOrders": 5
}
```

#### Start Scheduler
```http
POST /api/pm-scheduler/start
```

#### Stop Scheduler
```http
POST /api/pm-scheduler/stop
```

#### Manual Scheduler Run
```http
POST /api/pm-scheduler/run
```

**Response:**
```json
{
  "message": "PM scheduler run completed successfully",
  "workOrdersGenerated": 3,
  "processingTime": "245ms"
}
```

## Equipment API

### Get All Equipment
```http
GET /api/equipment
```

**Response:**
```json
[
  {
    "id": "equipment-uuid",
    "assetTag": "PUMP-001",
    "model": "Pump Model A",
    "location": "Production Floor",
    "status": "active",
    "warehouseId": "warehouse-uuid",
    "createdAt": "2025-07-16T10:05:54.577Z"
  }
]
```

## Work Orders API

### Get All Work Orders
```http
GET /api/work-orders
```

### Create Work Order
```http
POST /api/work-orders
Content-Type: application/json

{
  "title": "Work Order Title",
  "description": "Work order description",
  "equipmentId": "equipment-uuid",
  "priority": "medium",
  "type": "preventive"
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200 OK` - Success
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

**Error Response Format:**
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing rate limiting for production deployment.

## Data Validation

All API endpoints validate input data using Zod schemas:

- Required fields are validated
- Data types are enforced
- String lengths are validated
- Enum values are validated

## Frequency Options

PM Template frequency field accepts:
- `daily`
- `weekly`
- `monthly`
- `quarterly`
- `annually`

## Priority Levels

Work order priority levels:
- `low`
- `medium`
- `high`
- `critical`

## Status Values

Work order status values:
- `new`
- `assigned`
- `in_progress`
- `completed`
- `closed`

## Examples

### Complete PM Template Creation Example

```bash
curl -X POST http://localhost:5000/api/pm-templates \
  -H "Content-Type: application/json" \
  -H "x-warehouse-id: default-warehouse-id" \
  -d '{
    "model": "Conveyor Belt System",
    "component": "Drive Motor",
    "action": "Inspect motor bearings and lubricate",
    "frequency": "weekly",
    "customFields": {
      "lubricantType": "High-temp grease",
      "inspectionPoints": "Front bearing, rear bearing, coupling"
    }
  }'
```

### Get Compliance Data Example

```bash
curl -H "x-warehouse-id: default-warehouse-id" \
  "http://localhost:5000/api/pm-compliance?days=30"
```

### Manual Scheduler Run Example

```bash
curl -X POST http://localhost:5000/api/pm-scheduler/run \
  -H "x-warehouse-id: default-warehouse-id"
```

## SDK and Integration

Future versions will include:
- JavaScript/TypeScript SDK
- Python SDK
- Webhook support for real-time notifications
- GraphQL API endpoint
- OpenAPI/Swagger documentation

## Security Considerations

For production deployment, implement:
- API key authentication
- JWT token validation
- Rate limiting
- Input sanitization
- CORS configuration
- HTTPS enforcement
