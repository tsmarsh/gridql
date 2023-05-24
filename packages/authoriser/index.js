const express = require("express");
const jwt = require("jsonwebtoken");
const { MongoClient } = require("mongodb");

const getSub = (authHeader) => {
    if(authHeader === null || authHeader === undefined){
        return null;
    }

    if (authHeader.startsWith("Bearer ")){
        const token = authHeader.substring(7, authHeader.length);

        const dToken = jwt.decode(token);

        return dToken["sub"];
    } else {
        console.log("Missing Bearer Token");
        return null;
    }
}

const authorizer = ({collection, authorisers}) => {


    return async (req, res, next) => {
        const allowedMethods = ["POST", "PUT", "PATCH", "DELETE"];

        if (!allowedMethods.includes(req.method)) {
            return next();
        }

        try {
            const authHeader = req.headers.authorization;
            const sub = getSub(authHeader);

            const doc = await collection.findOne({_id: req.params.id}).catch(err => console.log(err));

            if (!doc || !doc[authorisers].includes(sub)) {
                return res.status(403).send("Forbidden");
            }
            next();

        } catch (error) {
            console.log(error);
            return res.status(500).send("Internal Server Error");
        }
    }
}

module.exports = {
    authorizer, getSub
}