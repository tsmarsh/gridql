export const callSubgraph = async (url, query, queryName, authHeader) => {
  const body = JSON.stringify({ query: query });

  console.log("Subgraph Call: ", url, body);
  let headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (authHeader !== null && authHeader !== undefined) {
    headers.Authorization = authHeader;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  }).catch((err) => console.log(err));

  const text = await response.text();

  try {
    let json = JSON.parse(text);
    if (json.hasOwnProperty("errors")) {
      //console.log("Received: \n", text);
      console.error(json);
      throw new Error(json["errors"][0]["message"]);
    }
    return json["data"][queryName];
  } catch (err) {
    console.log("Error parsing json from response: ", err);
    throw err;
  }
};