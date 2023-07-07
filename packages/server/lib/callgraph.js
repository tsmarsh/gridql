const callSubgraph = async (url, query, queryName) => {
    const body = JSON.stringify({"query": query});

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: body
    });

    const json = await response.json();

    if (json.hasOwnProperty('errors')) {
        console.error(json);
        throw new Error(json['errors'][0]['message']);
    }

    return json["data"][queryName];
};

module.exports = {
    callSubgraph
}