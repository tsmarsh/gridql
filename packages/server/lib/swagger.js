const { URL } = require("url");

const swagger = (context, schema, url) => {
  return {
    openapi: "3.0.0",
    info: {
      title: `${context}`,
      version: "1.0.0",
    },
    servers: [{ url: new URL(url).origin }],
    paths: {
      [context]: {
        post: {
          operationId: "create",
          summary: "Creates a document",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/State",
                },
              },
            },
          },
          responses: {
            303: {
              description:
                "The document was successfully retrieved, you'll be redirected to its url",
            },
            404: {
              description: "A document with the specified ID was not found.",
            },
          },
        },
      },
      [context + "/{id}"]: {
        get: {
          summary: "Retrieves a document",
          operationId: "read",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: {
                type: "string",
              },
              description: "The ID of the document to retrieve.",
            },
          ],
          responses: {
            200: {
              description: "The document was successfully retrieved.",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/State",
                  },
                },
              },
            },
            404: {
              description: "A document with the specified ID was not found.",
            },
          },
        },
        put: {
          summary: "Creates or updates a document",
          operationId: "update",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: {
                type: "string",
              },
              description: "The ID of the document to create or update.",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/State",
                },
              },
            },
          },
          responses: {
            200: {
              description: "The document was successfully updated.",
            },
            201: {
              description: "The document was successfully created.",
              headers: {
                Location: {
                  schema: {
                    type: "string",
                  },
                  description: "URI of the created document.",
                },
              },
            },
          },
        },
        delete: {
          summary: "Deletes a document",
          operationId: "delete",
          parameters: [
            {
              in: "path",
              name: "id",
              required: true,
              schema: {
                type: "string",
              },
              description: "The ID of the document to delete.",
            },
          ],
          responses: {
            200: {
              description: "The document was successfully deleted.",
            },
            404: {
              description: "A document with the specified ID was not found.",
            },
          },
        },
      },
      [context + "/bulk"]: {
        get: {
          summary: "Retrieves a list of all documents",
          operationId: "bulk_read",
          responses: {
            200: {
              description: "The documents were successfully retrieved.",
              content: {
                "application/json": {
                  schema: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/State",
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          summary: "Creates multiple documents",
          operationId: "bulk_create",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/State",
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "The documents were successfully created.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      successful: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/OperationStatus",
                        },
                      },
                      failed: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/OperationStatus",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        delete: {
          summary: "Deletes multiple documents",
          operationId: "bulk_delete",
          responses: {
            200: {
              description: "The documents were successfully deleted.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      successful: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/OperationStatus",
                        },
                      },
                      failed: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/OperationStatus",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        State: schema,
        OperationStatus: {
          type: "object",
          properties: {
            id: {
              type: "string",
            },
            status: {
              type: "string",
            },
            error: {
              type: "string",
            },
          },
        },
      },
    },
  };
};

module.exports = {
  swagger,
};
