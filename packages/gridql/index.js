const {init, start} = require("@gridql/server")
const fs = require("fs")

let configPath = "./config/config.conf";
if(fs.existsSync(configPath)){
    init(configPath)
        .then(config => {
            console.log("Configuration found: ", config.url, config.port)
            console.log("Graphlettes: ", config.graphlettes.length)
            console.log("Restlettes: ", config.restlettes.length)
            start(config.url, config.port, config.graphlettes, config.restlettes)
        }).catch(err => console.log("Error parsing config: ", err))
}else{
    console.log("Config missing");
}

