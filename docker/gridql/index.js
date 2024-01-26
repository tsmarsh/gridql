const {parse, build_app} = require("@gridql/server")
const fs = require("fs")

let configPath = "./builder/builder.conf";
if(fs.existsSync(configPath)){
    parse(configPath)
        .then(config => {
            console.log("Graphlettes: ", config.graphlettes.length)
            console.log("Restlettes: ", config.restlettes.length)
            build_app(config).then(app => app.listen(config.port))
        }).catch(err => console.log("Error parsing builder: ", err))
}else{
    console.log("Config missing");
}

