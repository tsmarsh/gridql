const callSubgraph = async (url, query, queryName) => {
  const body = JSON.stringify({ query: query });

  console.log("Subgraph Call: ", url, body);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body,
  }).catch((err) => console.log(err));

  const text = await response.text();

  try {
    let json = JSON.parse(text);
    if (json.hasOwnProperty("errors")) {
      console.error(json);
      throw new Error(json["errors"][0]["message"]);
    }
    return json["data"][queryName];
  } catch (err) {
    console.log("Error parsing json from response: ", err);
    throw err;
  }
};

module.exports = {
  callSubgraph,
};
