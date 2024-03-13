export class GraphCall {
  constructor(url, query_name, queryTemplate, modules) {
    this.url = url;
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
        console.error("Fetch Error: ", err);
        if (this.modules.hasOwnProperty("servererror")) {
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
      if (this.modules.hasOwnProperty("success")) {
        this.modules.success.execute(json["data"][this.queryName]);
      }
    } catch (err) {
      console.log("Error parsing json from response: ", err);
      if (this.modules.hasOwnProperty("error")) {
        this.modules.error.execute(data);
      }
    }
  }
}

module.exports = { GraphCall };
