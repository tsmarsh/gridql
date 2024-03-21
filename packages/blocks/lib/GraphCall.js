import Log4js from "log4js";

let logger = Log4js.getLogger("gridql/GraphCall");

export class GraphCall {
  constructor(url, query_name, queryTemplate, modules) {
    this.url = url;
    this.query_name = query_name
    this.queryTemplate = queryTemplate;
    this.modules = modules;
  }

  fillTemplate(templateVars) {
    return this.queryTemplate.replace(
      /\$\{([^}]+)}/g,
      (match, name) => templateVars[name] || "",
    );
  }

  async callServer(body) {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    return fetch(this.url, {
      method: "POST",
      headers,
      body,
    })
      .then((response) => {
        return response.text();
      })
      .catch((err) => {
        logger.error("Fetch Error: ", err);
        if (Object.hasOwnProperty.call(this.modules, "servererror")) {
          this.modules.servererror.execute(body);
        }
        return null;
      });
  }

  async execute(data) {
    const body = this.fillTemplate(data);

    const text = await this.callServer(body);

    try {
      let json = JSON.parse(text);
      if (Object.hasOwnProperty.call(this.modules, "success")) {
        this.modules.success.execute(json["data"][this.query_name]);
      }
    } catch (err) {
      logger.error("Error parsing json from response: ", err);
      if (Object.hasOwnProperty.call(this.modules, "error")) {
        this.modules.error.execute(data);
      }
    }
  }
}
