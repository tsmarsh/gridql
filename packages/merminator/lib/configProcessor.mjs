const mongo = (name) => {
    return {
        uri: "${?MONGO_URI}",
        collection: '$\{?PREFIX}"-"${\?ENV}"-' + name + '"',
        db: `$\{?PREFIX}"_"$\{?ENV}`,
        options: {
            directConnection: true
        }
    };
};
const gen = (nodes) => {
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
            "path": `/${name}/api`,
            "mongo": mongo(name),
            "schema": `config/json/${name}.schema.json`
        };
    });
    return {
        graphlettes: graphlettes,
        port: 3033,
        restlettes: restlettes,
        url: "${?PLATFORM_URL}"
    };
};

export const processConfig = (nodes) => {
    const config = gen(nodes);

    const data = JSON.stringify(config, null, 2);

    const unquoted = data.replace(/(".*":)\s"(.*\$\{\?.*}.*)"/gm, '$1 $2')

    const hocon = unquoted.split('\n').map((line) => {
        if (line.includes("${\?")) {
            return line.replace(/\\"/g, '"');
        }
        return line;
    }).join("\n")

    return hocon
}