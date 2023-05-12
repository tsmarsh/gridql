const {builderFactory} = require("payload-generator");

const base64enc = (s) => Buffer.from(s).toString("base64");

const buildJWT = function (userId) {
    const header = headerBuilder();
    const payload = payloadBuilder();
    payload.sub = userId;
    return `${base64enc(JSON.stringify(header)).replaceAll("=", "")}.${base64enc(JSON.stringify(payload)).replaceAll("=", "")}.TESTSIG`
};

const headerBuilder = builderFactory({
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "typ": {
            "const": "JWT"
        },
        "alg": {
            "const": "RS256"
        },
        "kid": {
            "type": "string",
            "pattern": "([A-Za-z0-9]{10})-([A-Za-z0-9]{32})"
        }
    },
    "required": [
        "typ",
        "alg",
        "kid"
    ]
});

const payloadBuilder = builderFactory({
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "exp": {
            "type": "integer"
        },
        "nbf": {
            "type": "integer"
        },
        "aud": {
            "type": "string",
            "format": "uuid"
        },
        "autologExec": {
            "enum": ["true", "false"]
        },
        "signInName": {
            "type": "string",
            "format": "email",
            "faker": "internet.email"
        },
        "firstName": {
            "type": "string",
            "faker": "name.firstName"
        },
        "notificationEmail": {
            "type": "string",
            "format": "email",
            "faker": "internet.email"
        },
        "lastName": {
            "type": "string",
            "faker": "name.firstName"
        },
        "authenticatedSessionId": {
            "type": "string",
            "format": "uuid"
        },
        "completedAction": {
            "const": "SignedIn"
        },
        "technicalProfileName": {
            "const": "Base-completedAction"
        },
        "sub": {
            "type": "string",
            "format": "uuid"
        },
        "tid": {
            "type": "string",
            "format": "uuid"
        },
        "correlationId": {
            "type": "string",
            "format": "uuid"
        },
        "nonce": {
            "type": "string",
            "format": "uuid"

        },
        "azp": {
            "type": "string",
            "format": "uuid"
        },
        "ver": {
            "const": "1.0"
        },
        "iat": {
            "type": "integer"
        }
    },
    "required": [
        "exp",
        "nbf",
        "aud",
        "autologExec",
        "signInName",
        "firstName",
        "notificationEmail",
        "lastName",
        "authenticatedSessionId",
        "completedAction",
        "technicalProfileName",
        "sub",
        "tid",
        "correlationId",
        "nonce",
        "azp",
        "ver",
        "iat"
    ]
});

module.exports = {
    headerBuilder,
    payloadBuilder,
    buildJWT
}