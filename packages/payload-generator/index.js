import jsf from "json-schema-faker";

import {faker} from "@faker-js/faker";


export function builderFactory(schema) {
  jsf.extend("faker", () => faker);
  jsf.format("date", () => faker.date.past().toISOString().split("T")[0]);
  jsf.format("id", () => faker.datatype.uuid());

  return (n) => {
    if (n !== undefined) {
      const results = [];
      for (let i = 0; i < n; i++) {
        results.push(jsf.generate(schema));
      }
      return results;
    } else {
      return jsf.generate(schema);
    }
  };
}
