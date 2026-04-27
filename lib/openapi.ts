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
          "Returns up to 50 logs. Results can be filtered by service and level.",
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
