import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/callgraph");

export const callSubgraph = async (url, query, queryName, authHeader) => {
  const body = JSON.stringify({ query: query });

  logger.trace("Subgraph Call: ", url, body);
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
    if (Object.hasOwnProperty.call(json, "errors")) {
      //console.log("Received: \n", text);
      logger.error(json);
      throw new Error(json["errors"][0]["message"]);
    }
    return json["data"][queryName];
  } catch (err) {
    logger.error("Error parsing json from response: ", err);
    throw err;
  }
};
