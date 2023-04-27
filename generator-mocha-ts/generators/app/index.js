"use strict";
const Generator = require("yeoman-generator");

module.exports = class extends Generator {
  async prompting() {
    const prompts = [
      {
        type: "input",
        name: "name",
        message: "Your project name",
        default: this.appname
      }
    ];

    this.answers = await this.prompt(prompts);
  }

  writing() {
    // Package.json
    this.fs.copyTpl(
      this.templatePath("package.json"),
      this.destinationPath("package.json"),
      { title: this.answers.name }
    );

    // Tsconfig.json
    this.fs.copy(
      this.templatePath("tsconfig.json"),
      this.destinationPath("tsconfig.json")
    );

    // .mocharc.json
    this.fs.copy(
      this.templatePath(".mocharc.json"),
      this.destinationPath(".mocharc.json")
    );

    // Src/index.ts
    this.fs.copy(
      this.templatePath("src/index.ts"),
      this.destinationPath("src/index.ts")
    );

    // Test/index.test.ts
    this.fs.copy(
      this.templatePath("test/index.spec.ts"),
      this.destinationPath("test/index.spec.ts")
    );
  }

  install() {
    this.npmInstall();
  }
};
