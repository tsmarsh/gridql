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
  }).catch((err) => logger.error(err));

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    logger.error(`This isn't json: ${text}`);
    logger.error(`Error parsing json from response: ${err}`);
    json = {"errors" : [{"message": text}]};
  }

  if (Object.hasOwnProperty.call(json, "errors")) {
    logger.error(json);
    throw new Error(json["errors"][0]["message"]);
  }
  return json["data"][queryName];
};
