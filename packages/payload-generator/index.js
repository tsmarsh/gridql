import { JSONSchemaFaker } from "json-schema-faker";

import { faker } from "@faker-js/faker";

export function builderFactory(schema) {
  JSONSchemaFaker.extend("faker", () => faker);
  JSONSchemaFaker.format(
    "date",
    () => faker.date.past().toISOString().split("T")[0],
  );
  JSONSchemaFaker.format("id", () => faker.string.uuid());

  return (n) => {
    if (n !== undefined) {
      const results = [];
      for (let i = 0; i < n; i++) {
        results.push(JSONSchemaFaker.generate(schema));
      }
      return results;
    } else {
      return JSONSchemaFaker.generate(schema);
    }
  };
}
