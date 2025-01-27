interface MongoConfig {
  uri: string;
  collection: string;
  db: string;
  options: {
    directConnection: boolean;
  };
}

function mongo(name: string): MongoConfig {
  return {
    uri: "${?MONGO_URI}",
    collection: '${?PREFIX}"-"${?ENV}"-' + name + '"',
    db: '${?PREFIX}"_"${?ENV}',
    options: {
      directConnection: true
    }
  };
}

function gen(nodes: Record<string, any>): any {
  const graphlettes = Object.entries(nodes).map(([name, dto]) => {
    return {
      path: `/${name}/graph`,
      mongo: mongo(name),
      schema: `config/graph/${name}.graphql`,
      dtoConfig: dto
    };
  });

  const restlettes = Object.keys(nodes).map((name) => {
    return {
      path: `/${name}/api`,
      mongo: mongo(name),
      schema: `config/json/${name}.schema.json`
    };
  });

  return {
    graphlettes: graphlettes,
    port: 3033,
    restlettes: restlettes,
    url: "${?PLATFORM_URL}"
  };
}

export function processConfig(nodes: Record<string, any>): string {
  const config = gen(nodes);
  const data = JSON.stringify(config, null, 2);

  // transform those environment placeholders
  const unquoted = data.replace(/(".*":)\s"(.*\$\{\?.*}.*)"/gm, "$1 $2");

  return unquoted
    .split("\n")
    .map((line) => {
      if (line.includes("${?")) {
        return line.replace(/\\"/g, '"');
      }
      return line;
    })
    .join("\n");
} 