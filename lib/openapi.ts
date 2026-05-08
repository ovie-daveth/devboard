export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Devboard API",
    version: "1.0.0",
    description: "API documentation for the Devboard log ingestion platform.",
  },
  servers: [
    {
      url: "/",
      description: "Current deployment",
    },
  ],
  tags: [
    {
      name: "Logs",
      description: "Ingest and query application logs.",
    },
  ],
  paths: {
    "/api/logs": {
      get: {
        tags: ["Logs"],
        summary: "List logs",
        description:
          "Returns up to 50 logs. Results can be filtered by service, level, and environment.",
        parameters: [
          {
            name: "service",
            in: "query",
            required: false,
            schema: {
              type: "string",
              example: "api-gateway",
            },
            description: "Only return logs from this service.",
          },
          {
            name: "level",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["debug", "info", "warn", "error"],
              example: "error",
            },
            description: "Only return logs with this level.",
          },
          {
            name: "environment",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["production", "staging", "development"],
              example: "production",
            },
            description: "Only return logs from this environment.",
          },
          {
            name: "from",
            in: "query",
            required: false,
            schema: {
              type: "string",
              format: "date-time",
              example: "2026-04-27T00:00:00.000Z",
            },
            description: "Only return logs at or after this timestamp.",
          },
          {
            name: "to",
            in: "query",
            required: false,
            schema: {
              type: "string",
              format: "date-time",
              example: "2026-04-27T23:59:59.999Z",
            },
            description: "Only return logs at or before this timestamp.",
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              default: 50,
            },
            description: "Maximum number of logs to return.",
          },
          {
            name: "offset",
            in: "query",
            required: false,
            schema: {
              type: "integer",
              minimum: 0,
              default: 0,
            },
            description: "Number of logs to skip before returning results.",
          },
          {
            name: "traceId",
            in: "query",
            required: false,
            schema: {
              type: "string",
              example: "",
            },
            description: "Only return logs with this trace ID.",
          },
          {
            name: "requestId",
            in: "query",
            required: false,
            schema: {
              type: "string",
              example: "",
            },
            description: "Only return logs with this request ID.",
          },
        ],
        responses: {
          "200": {
            description: "Logs fetched successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["data"],
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Log",
                      },
                    },
                    meta: {
                      $ref: "#/components/schemas/PaginationMeta",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Invalid query parameters.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                examples: {
                  invalidLevel: {
                    value: {
                      error: "Invalid level",
                    },
                  },
                  invalidEnvironment: {
                    value: {
                      error: "Invalid environment",
                    },
                  },
                  invalidPagination: {
                    value: {
                      error: "Invalid pagination parameters",
                    },
                  },
                  invalidDate: {
                    value: {
                      error: "Invalid date parameters",
                    },
                  },
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
      post: {
        tags: ["Logs"],
        summary: "Ingest a log",
        description: "Stores a new application log entry.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/CreateLogRequest",
              },
              examples: {
                basic: {
                  summary: "Basic log",
                  value: {
                    level: "info",
                    service: "api-gateway",
                    message: "Request completed",
                    metadata: {
                      durationMs: 42,
                      requestId: "req_123",
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Log ingested successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success"],
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Required fields are missing.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  error: "Missing required fields",
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      }
    },
    "/api/services": {
      post: {
        tags: ["Services"],
        summary: "Register a service",
        description: "Registers a new service in the system.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["service"],
                properties: {
                  service: {
                    type: "string",
                    description: "Name of the service to register.",
                    example: "worker",
                  },
                },
              },
              examples: {
                registerWorker: {
                  summary: "Register worker service",
                  value: {
                    service: "worker",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Service registered successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data"],
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      $ref: "#/components/schemas/InsertResult",
                    },
                  },
                },
                example: {
                  success: true,
                  data: {
                    command: "INSERT",
                    rowCount: 1,
                    oid: 0,
                    rows: [],
                    fields: [],
                    _types: {},
                    RowCtor: null,
                    rowAsArray: false,
                    _prebuiltEmptyResultObject: null,
                  },
                },
              },
            },
          },
          "400": {
            description: "Required field is missing.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
                example: {
                  error: "Missing required field",
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      },
      get: {
        tags: ["Services"],
        summary: "List registered services",
        description: "Returns a list of all registered services.",
        responses: {
          "200": {
            description: "Services fetched successfully.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["success", "data"],
                  properties: {
                    success: {
                      type: "boolean",
                      example: true,
                    },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["id", "name"],
                        properties: {
                          id: {
                            type: "string",
                            format: "uuid",
                            example: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                          },
                          name: {
                            type: "string",
                            example: "worker",
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  success: true,
                  data: [
                    {
                      id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                      name: "worker",
                    },
                    {
                      id: "4b825dc6-8ee0-4c9f-9a1e-2c963f66afa6",
                      name: "api-gateway",
                    },
                  ],
                },
              },
            },
          },
          "500": {
            $ref: "#/components/responses/InternalServerError",
          },
        },
      }
    },
  },
  components: {
    schemas: {
      CreateLogRequest: {
        type: "object",
        required: ["level", "service", "message"],
        properties: {
          level: {
            type: "string",
            enum: ["debug", "info", "warn", "error"],
            description: "Severity level for the log entry.",
            example: "error",
          },
          service: {
            type: "string",
            description: "Service or application component that emitted the log.",
            example: "worker",
          },
          message: {
            type: "string",
            description: "Human-readable log message.",
            example: "Job failed",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            description: "Timestamp when the log was emitted. Defaults to current time if not provided.",
            example: "2026-04-27T10:30:00.000Z",
          },
          environment: {
            type: "string",
            enum: ["production", "staging", "development"],
            description: "Environment where the log was emitted.",
            example: "production",
            default: "development",
          },
          traceId: {
            type: "string",
            description: "Distributed tracing trace ID.",
            example: "abc123",
          },
          spanId: {
            type: "string",
            description: "Distributed tracing span ID.",
            example: "def456",
          },
          requestId: {
            type: "string",
            description: "Request ID for correlating logs.",
            example: "req_789",
          },
          metadata: {
            type: "object",
            nullable: true,
            additionalProperties: true,
            description: "Optional structured context stored as JSON.",
            example: {
              jobId: "job_456",
              retryable: true,
            },
          },
        },
      },
      Log: {
        allOf: [
          {
            $ref: "#/components/schemas/CreateLogRequest",
          },
          {
            type: "object",
            required: ["id", "timestamp"],
            properties: {
              id: {
                type: "string",
                format: "uuid",
                example: "9f1b8b12-2e26-4f3a-94da-2a3ef81430b7",
              },
              timestamp: {
                type: "string",
                format: "date-time",
                example: "2026-04-27T10:30:00.000Z",
              },
            },
          },
        ],
      },
      ErrorResponse: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "string",
          },
        },
      },
      PaginationMeta: {
        type: "object",
        required: ["limit", "offset", "count"],
        properties: {
          limit: {
            type: "integer",
            example: 50,
          },
          offset: {
            type: "integer",
            example: 0,
          },
          count: {
            type: "integer",
            example: 12,
          },
        },
      },
      InsertResult: {
        type: "object",
        required: [
          "command",
          "rowCount",
          "oid",
          "rows",
          "fields",
          "_types",
          "RowCtor",
          "rowAsArray",
          "_prebuiltEmptyResultObject",
        ],
        properties: {
          command: {
            type: "string",
            example: "INSERT",
          },
          rowCount: {
            type: "integer",
            example: 1,
          },
          oid: {
            type: "integer",
            example: 0,
          },
          rows: {
            type: "array",
            items: {},
            example: [],
          },
          fields: {
            type: "array",
            items: {},
            example: [],
          },
          _types: {
            type: "object",
            additionalProperties: true,
            example: {},
          },
          RowCtor: {
            nullable: true,
            example: null,
          },
          rowAsArray: {
            type: "boolean",
            example: false,
          },
          _prebuiltEmptyResultObject: {
            nullable: true,
            example: null,
          },
        },
      },
    },
    responses: {
      InternalServerError: {
        description: "Unexpected server error.",
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/ErrorResponse",
            },
            example: {
              error: "Failed to fetch logs",
            },
          },
        },
      },
    },
  },
} as const;
